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

vi.mock("@/repositories/customer.repository", () => ({
  CustomerRepository: {
    findIdsByEmails: vi.fn(),
    findByEmail: vi.fn(),
  },
}))

import { LoggingService } from "@/services/logging.service"
import { LogRepository } from "@/repositories/log.repository"
import { OrderRepository } from "@/repositories/order.repository"
import { CustomerRepository } from "@/repositories/customer.repository"

const mockFindLogsInRange = LogRepository.findAllLogsInRange as ReturnType<typeof vi.fn>
const mockFindOrdersInRange = OrderRepository.findOrdersInRangeForCustomers as ReturnType<
  typeof vi.fn
>
const mockFindIdsByEmails = CustomerRepository.findIdsByEmails as ReturnType<typeof vi.fn>

const startDate = new Date("2026-03-01T00:00:00Z")
const endDate = new Date("2026-03-07T23:59:59Z")

function makeUnifiedLog(overrides: Record<string, unknown>) {
  return {
    type: "QUANTITY",
    id: 1,
    cardname: "Lightning Bolt",
    amount: -1,
    user: "POS Sale",
    time: new Date("2026-03-05T10:00:00Z"),
    finish: "nonfoil",
    oldPrice: null,
    newPrice: null,
    ...overrides,
  }
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-abc",
    customerEmail: "walkin@pos.local",
    status: "COMPLETED",
    totalAmount: 500,
    paymentMethod: "CASH",
    fulfillment: "PICKUP",
    createdAt: new Date("2026-03-05T10:00:30Z"),
    items: [
      {
        id: "item-1",
        name: "Lightning Bolt",
        setName: "A25",
        condition: "NM",
        finish: "nonfoil",
        price: 500,
        quantity: 1,
      },
    ],
    ...overrides,
  }
}

describe("LoggingService.getLedgerEntriesInRange — order enrichment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindIdsByEmails.mockResolvedValue(new Map())
  })

  it("sale entries with matching orders get orderId and orderStatus populated", async () => {
    mockFindLogsInRange.mockResolvedValue([makeUnifiedLog({ id: 1, user: "POS Sale" })])
    mockFindOrdersInRange.mockResolvedValue([makeOrder()])

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
    })

    expect(entries[0].orderId).toBe("order-abc")
    expect(entries[0].orderStatus).toBe("COMPLETED")
  })

  it("non-sale entries (Admin Manual Update, positive qty) do NOT get orderId", async () => {
    mockFindLogsInRange.mockResolvedValue([
      makeUnifiedLog({ id: 2, user: "Admin Manual Update", amount: 5 }),
    ])
    mockFindOrdersInRange.mockResolvedValue([])

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
    })

    expect(entries[0].orderId).toBeUndefined()
  })

  it("POS walk-in sale entries get orderId but customerId=null", async () => {
    mockFindLogsInRange.mockResolvedValue([makeUnifiedLog({ id: 3, user: "POS Sale" })])
    mockFindOrdersInRange.mockResolvedValue([makeOrder({ customerEmail: "walkin@pos.local" })])

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
    })

    expect(entries[0].orderId).toBe("order-abc")
    expect(entries[0].customerId).toBeNull()
  })

  it("customer sale entries get customerId from customer table lookup", async () => {
    const email = "jane@example.com"
    mockFindLogsInRange.mockResolvedValue([makeUnifiedLog({ id: 4, user: `CUSTOMER: ${email}` })])
    mockFindOrdersInRange.mockResolvedValue([makeOrder({ customerEmail: email })])
    mockFindIdsByEmails.mockResolvedValue(new Map([[email, "cust-xyz"]]))

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
    })

    expect(entries[0].orderId).toBe("order-abc")
    expect(entries[0].customerId).toBe("cust-xyz")
  })

  it("entries where no order matches get customerEmail but NOT orderId", async () => {
    const email = "bob@example.com"
    mockFindLogsInRange.mockResolvedValue([
      makeUnifiedLog({
        id: 5,
        user: `CUSTOMER: ${email}`,
        time: new Date("2026-03-05T10:00:00Z"),
      }),
    ])
    // Order is outside the 5-minute matching window
    mockFindOrdersInRange.mockResolvedValue([
      makeOrder({
        id: "order-far",
        customerEmail: email,
        createdAt: new Date("2026-03-05T20:00:00Z"),
      }),
    ])
    mockFindIdsByEmails.mockResolvedValue(new Map())

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
    })

    expect(entries[0].customerEmail).toBe(email)
    expect(entries[0].orderId).toBeUndefined()
  })

  it("multiple sale entries from the same order all get the same orderId", async () => {
    const t = new Date("2026-03-05T10:00:00Z")
    mockFindLogsInRange.mockResolvedValue([
      makeUnifiedLog({ id: 10, cardname: "Lightning Bolt", user: "POS Sale", time: t }),
      makeUnifiedLog({
        id: 11,
        cardname: "Lightning Bolt",
        user: "POS Sale",
        time: new Date(t.getTime() + 1000),
      }),
    ])
    mockFindOrdersInRange.mockResolvedValue([
      makeOrder({
        id: "order-shared",
        items: [
          {
            id: "i1",
            name: "Lightning Bolt",
            setName: "A25",
            condition: "NM",
            finish: "nonfoil",
            price: 500,
            quantity: 2,
          },
        ],
      }),
    ])

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
    })

    const withOrders = entries.filter((e) => e.orderId)
    expect(withOrders).toHaveLength(2)
    expect(withOrders[0].orderId).toBe("order-shared")
    expect(withOrders[1].orderId).toBe("order-shared")
  })

  it("OrderRepository.findOrdersInRangeForCustomers is called once (batch), not N times", async () => {
    mockFindLogsInRange.mockResolvedValue([
      makeUnifiedLog({ id: 20, user: "POS Sale" }),
      makeUnifiedLog({ id: 21, user: "CUSTOMER: a@test.com" }),
      makeUnifiedLog({ id: 22, user: "CUSTOMER: b@test.com" }),
    ])
    mockFindOrdersInRange.mockResolvedValue([])

    await LoggingService.getLedgerEntriesInRange({ startDate, endDate })

    expect(mockFindOrdersInRange).toHaveBeenCalledOnce()
  })

  it("STRIPE: prefix entries are correctly handled as customer orders", async () => {
    const email = "stripe@example.com"
    mockFindLogsInRange.mockResolvedValue([makeUnifiedLog({ id: 30, user: `STRIPE: ${email}` })])
    mockFindOrdersInRange.mockResolvedValue([makeOrder({ customerEmail: email })])
    mockFindIdsByEmails.mockResolvedValue(new Map([[email, "cust-stripe"]]))

    const entries = await LoggingService.getLedgerEntriesInRange({
      startDate,
      endDate,
    })

    expect(entries[0].orderId).toBe("order-abc")
    expect(entries[0].customerId).toBe("cust-stripe")
    expect(entries[0].customerEmail).toBe(email)
  })
})
