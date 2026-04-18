import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/repositories/log.repository", () => ({
  LogRepository: {
    findAllLogsInRange: vi.fn(),
  },
}))

vi.mock("@/repositories/order.repository", () => ({
  OrderRepository: {
    findOrdersInRangeForCustomers: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}))

import { LoggingService } from "@/services/logging.service"
import { LogRepository } from "@/repositories/log.repository"
import { OrderRepository } from "@/repositories/order.repository"

const mockFindLogsInRange = LogRepository.findAllLogsInRange as ReturnType<typeof vi.fn>
const mockFindOrdersInRange = OrderRepository.findOrdersInRangeForCustomers as ReturnType<
  typeof vi.fn
>

const startDate = new Date("2026-03-01T00:00:00Z")
const endDate = new Date("2026-03-07T23:59:59Z")

describe("LoggingService.getLedgerEntriesInRange", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns merged qty+price logs sorted by time descending", async () => {
    const t1 = new Date("2026-03-05T10:00:00Z")
    const t2 = new Date("2026-03-06T12:00:00Z")
    const t3 = new Date("2026-03-04T08:00:00Z")

    // findAllLogsInRange returns rows already sorted DESC by the DB
    mockFindLogsInRange.mockResolvedValue([
      {
        type: "PRICE",
        id: 10,
        cardname: "Mox Pearl",
        oldPrice: 1000,
        newPrice: 1200,
        user: "Admin Manual Update",
        time: t2,
        finish: "foil",
        amount: null,
      },
      {
        type: "QUANTITY",
        id: 1,
        cardname: "Black Lotus",
        amount: -1,
        user: "Admin Manual Update",
        time: t1,
        finish: "nonfoil",
        oldPrice: null,
        newPrice: null,
      },
      {
        type: "PRICE",
        id: 11,
        cardname: "Sol Ring",
        oldPrice: 500,
        newPrice: 600,
        user: "Admin Manual Update",
        time: t3,
        finish: "nonfoil",
        amount: null,
      },
    ])
    mockFindOrdersInRange.mockResolvedValue([])

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
    })

    expect(entries).toHaveLength(3)
    // Sorted descending by time: t2 > t1 > t3
    expect(entries[0].id).toBe("price-10")
    expect(entries[1].id).toBe("qty-1")
    expect(entries[2].id).toBe("price-11")
  })

  it("calls findAllLogsInRange with correct dates", async () => {
    mockFindLogsInRange.mockResolvedValue([])

    await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
      enrichWithOrders: false,
    })

    expect(mockFindLogsInRange).toHaveBeenCalledWith(startDate, endDate)
  })

  it("when enrichWithOrders is false, does not call OrderRepository", async () => {
    mockFindLogsInRange.mockResolvedValue([
      {
        type: "QUANTITY",
        id: 1,
        cardname: "Lightning Bolt",
        amount: -1,
        user: "POS Sale",
        time: new Date("2026-03-05T10:00:00Z"),
        finish: null,
        oldPrice: null,
        newPrice: null,
      },
    ])

    await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
      enrichWithOrders: false,
    })

    expect(mockFindOrdersInRange).not.toHaveBeenCalled()
  })

  it("when enrichWithOrders is true (default), calls enrichment for sale entries", async () => {
    mockFindLogsInRange.mockResolvedValue([
      {
        type: "QUANTITY",
        id: 1,
        cardname: "Lightning Bolt",
        amount: -1,
        user: "POS Sale",
        time: new Date("2026-03-05T10:00:00Z"),
        finish: null,
        oldPrice: null,
        newPrice: null,
      },
    ])
    mockFindOrdersInRange.mockResolvedValue([])

    await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
    })

    expect(mockFindOrdersInRange).toHaveBeenCalledOnce()
    expect(mockFindOrdersInRange).toHaveBeenCalledWith({
      customerEmails: ["walkin@pos.local"],
      startDate,
      endDate,
    })
  })

  it("handles empty logs gracefully", async () => {
    mockFindLogsInRange.mockResolvedValue([])

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
      enrichWithOrders: false,
    })

    expect(entries).toEqual([])
  })

  it("correctly formats qty log entries", async () => {
    const t = new Date("2026-03-05T10:00:00Z")
    mockFindLogsInRange.mockResolvedValue([
      {
        type: "QUANTITY",
        id: 42,
        cardname: "Counterspell",
        amount: -3,
        user: "POS Sale",
        time: t,
        finish: "foil",
        oldPrice: null,
        newPrice: null,
      },
    ])
    mockFindOrdersInRange.mockResolvedValue([])

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
      enrichWithOrders: false,
    })

    expect(entries[0]).toEqual({
      id: "qty-42",
      type: "QUANTITY",
      cardName: "Counterspell",
      user: "POS Sale",
      time: t,
      finish: "foil",
      amount: -3,
    })
  })

  it("correctly formats price log entries", async () => {
    const t = new Date("2026-03-06T14:00:00Z")
    mockFindLogsInRange.mockResolvedValue([
      {
        type: "PRICE",
        id: 77,
        cardname: "Force of Will",
        oldPrice: 8000,
        newPrice: 9500,
        user: "Admin Manual Update",
        time: t,
        finish: null,
        amount: null,
      },
    ])

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
      enrichWithOrders: false,
    })

    expect(entries[0]).toEqual({
      id: "price-77",
      type: "PRICE",
      cardName: "Force of Will",
      user: "Admin Manual Update",
      time: t,
      finish: null,
      oldPrice: 8000,
      newPrice: 9500,
    })
  })
})
