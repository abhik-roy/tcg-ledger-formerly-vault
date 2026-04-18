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

const t1 = new Date("2026-03-05T10:00:00Z")
const t2 = new Date("2026-03-06T12:00:00Z")
const t3 = new Date("2026-03-04T08:00:00Z")

function setupMixedLogs() {
  mockFindLogsInRange.mockResolvedValue([
    {
      type: "QUANTITY",
      id: 1,
      cardname: "Card A",
      amount: -1,
      user: "POS Sale",
      time: t1,
      finish: null,
      oldPrice: null,
      newPrice: null,
    },
    {
      type: "QUANTITY",
      id: 2,
      cardname: "Card B",
      amount: -2,
      user: "CUSTOMER: joe@test.com",
      time: t2,
      finish: "foil",
      oldPrice: null,
      newPrice: null,
    },
    {
      type: "QUANTITY",
      id: 3,
      cardname: "Card C",
      amount: 5,
      user: "Admin Manual Update",
      time: t3,
      finish: null,
      oldPrice: null,
      newPrice: null,
    },
    {
      type: "QUANTITY",
      id: 4,
      cardname: "Card D",
      amount: -1,
      user: "STRIPE: pay@test.com",
      time: t1,
      finish: null,
      oldPrice: null,
      newPrice: null,
    },
    {
      type: "PRICE",
      id: 10,
      cardname: "Card E",
      amount: null,
      oldPrice: 100,
      newPrice: 200,
      user: "Admin Manual Update",
      time: t2,
      finish: null,
    },
  ])
  mockFindOrdersInRange.mockResolvedValue([
    {
      id: "order-pos",
      customerEmail: "walkin@pos.local",
      status: "COMPLETED",
      totalAmount: 500,
      paymentMethod: "CASH",
      fulfillment: "PICKUP",
      createdAt: new Date(t1.getTime() + 1000),
      items: [
        {
          id: "i1",
          name: "Card A",
          setName: "SET",
          condition: "NM",
          finish: "nonfoil",
          price: 500,
          quantity: 1,
        },
      ],
    },
    {
      id: "order-cust",
      customerEmail: "joe@test.com",
      status: "PAID",
      totalAmount: 1000,
      paymentMethod: "CARD",
      fulfillment: "SHIPPING",
      createdAt: new Date(t2.getTime() + 1000),
      items: [
        {
          id: "i2",
          name: "Card B",
          setName: "SET",
          condition: "NM",
          finish: "foil",
          price: 500,
          quantity: 2,
        },
      ],
    },
    {
      id: "order-stripe",
      customerEmail: "pay@test.com",
      status: "CANCELLED",
      totalAmount: 500,
      paymentMethod: "CARD",
      fulfillment: "SHIPPING",
      createdAt: new Date(t1.getTime() + 1000),
      items: [
        {
          id: "i3",
          name: "Card D",
          setName: "SET",
          condition: "NM",
          finish: "nonfoil",
          price: 500,
          quantity: 1,
        },
      ],
    },
  ])
}

describe("LoggingService.getLedgerEntriesForExport", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns all entries when no type/source/status filter", async () => {
    setupMixedLogs()
    const entries = await LoggingService.getLedgerEntriesForExport({ startDate, endDate })
    expect(entries).toHaveLength(5)
  })

  it("filters by type=QUANTITY — returns only qty entries", async () => {
    setupMixedLogs()
    const entries = await LoggingService.getLedgerEntriesForExport({
      startDate,
      endDate,
      type: "QUANTITY",
    })
    expect(entries.every((e) => e.type === "QUANTITY")).toBe(true)
    expect(entries).toHaveLength(4)
  })

  it("filters by type=PRICE — returns only price entries", async () => {
    setupMixedLogs()
    const entries = await LoggingService.getLedgerEntriesForExport({
      startDate,
      endDate,
      type: "PRICE",
    })
    expect(entries.every((e) => e.type === "PRICE")).toBe(true)
    expect(entries).toHaveLength(1)
  })

  it("filters by source=POS — returns only POS Sale entries", async () => {
    setupMixedLogs()
    const entries = await LoggingService.getLedgerEntriesForExport({
      startDate,
      endDate,
      source: "POS",
    })
    expect(entries.every((e) => e.user === "POS Sale")).toBe(true)
    expect(entries).toHaveLength(1)
  })

  it("filters by source=CUSTOMER — returns CUSTOMER: and STRIPE: entries", async () => {
    setupMixedLogs()
    const entries = await LoggingService.getLedgerEntriesForExport({
      startDate,
      endDate,
      source: "CUSTOMER",
    })
    expect(
      entries.every((e) => e.user.startsWith("CUSTOMER: ") || e.user.startsWith("STRIPE: "))
    ).toBe(true)
    expect(entries).toHaveLength(2)
  })

  it("filters by source=MANUAL — returns Admin Manual Update entries", async () => {
    setupMixedLogs()
    const entries = await LoggingService.getLedgerEntriesForExport({
      startDate,
      endDate,
      source: "MANUAL",
    })
    expect(entries.every((e) => e.user === "Admin Manual Update")).toBe(true)
    expect(entries).toHaveLength(2)
  })

  it("filters by orderStatus=COMPLETED — returns only entries with COMPLETED status", async () => {
    setupMixedLogs()
    const entries = await LoggingService.getLedgerEntriesForExport({
      startDate,
      endDate,
      orderStatus: "COMPLETED",
    })
    expect(entries.every((e) => e.orderStatus === "COMPLETED")).toBe(true)
    expect(entries.length).toBeGreaterThanOrEqual(1)
  })

  it("filters by orderStatus=CANCELLED — returns only CANCELLED entries", async () => {
    setupMixedLogs()
    const entries = await LoggingService.getLedgerEntriesForExport({
      startDate,
      endDate,
      orderStatus: "CANCELLED",
    })
    expect(entries.every((e) => e.orderStatus === "CANCELLED")).toBe(true)
  })

  it("multiple filters combined (type + source)", async () => {
    setupMixedLogs()
    const entries = await LoggingService.getLedgerEntriesForExport({
      startDate,
      endDate,
      type: "QUANTITY",
      source: "POS",
    })
    expect(entries.every((e) => e.type === "QUANTITY" && e.user === "POS Sale")).toBe(true)
    expect(entries).toHaveLength(1)
  })

  it("returns empty array when no entries match filters", async () => {
    mockFindLogsInRange.mockResolvedValue([
      {
        type: "QUANTITY",
        id: 1,
        cardname: "Card A",
        amount: 5,
        user: "Admin Manual Update",
        time: t1,
        finish: null,
        oldPrice: null,
        newPrice: null,
      },
    ])
    mockFindOrdersInRange.mockResolvedValue([])

    const entries = await LoggingService.getLedgerEntriesForExport({
      startDate,
      endDate,
      source: "POS",
    })
    expect(entries).toEqual([])
  })
})
