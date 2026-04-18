import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/repositories/order.repository", () => ({
  OrderRepository: {
    countByStatuses: vi.fn(),
    findManyPaginated: vi.fn(),
    fulfillOrder: vi.fn(),
    findById: vi.fn(),
    findByStripeSessionId: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
    findStalePending: vi.fn(),
  },
}))

vi.mock("@/repositories/log.repository", () => ({
  LogRepository: {
    createQuantityLogInTransaction: vi.fn(),
  },
}))

vi.mock("@/services/email.service", () => ({
  EmailService: {
    sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
    sendOrderCancellation: vi.fn().mockResolvedValue(undefined),
  },
}))

import { OrderService } from "@/services/order.service"
import { OrderRepository } from "@/repositories/order.repository"

const mockFindManyPaginated = OrderRepository.findManyPaginated as ReturnType<typeof vi.fn>

describe("OrderService.getAdminOrders — filter params", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindManyPaginated.mockResolvedValue({ orders: [], total: 0 })
  })

  // ── 1. No filters ─────────────────────────────────────────────────────

  it("passes an empty where object when no filters are provided", async () => {
    await OrderService.getAdminOrders(1, 10)

    expect(mockFindManyPaginated).toHaveBeenCalledWith(0, 10, {})
  })

  it("passes an empty where object when filters is an empty object", async () => {
    await OrderService.getAdminOrders(1, 10, {})

    expect(mockFindManyPaginated).toHaveBeenCalledWith(0, 10, {})
  })

  // ── 2. Search filter ──────────────────────────────────────────────────

  it("builds an OR clause with id.startsWith and customerEmail.contains for search", async () => {
    await OrderService.getAdminOrders(1, 10, { search: "test" })

    const where = mockFindManyPaginated.mock.calls[0][2]
    expect(where.OR).toEqual([
      { id: { startsWith: "test", mode: "insensitive" } },
      { customerEmail: { contains: "test", mode: "insensitive" } },
    ])
  })

  // ── 3. dateFrom only ──────────────────────────────────────────────────

  it("sets createdAt.gte when only dateFrom is provided", async () => {
    await OrderService.getAdminOrders(1, 10, { dateFrom: "2026-03-01" })

    const where = mockFindManyPaginated.mock.calls[0][2]
    expect(where.createdAt).toBeDefined()
    expect(where.createdAt.gte).toEqual(new Date("2026-03-01"))
    expect(where.createdAt.lte).toBeUndefined()
  })

  // ── 4. dateTo only ────────────────────────────────────────────────────

  it("sets createdAt.lte (end of day) when only dateTo is provided", async () => {
    await OrderService.getAdminOrders(1, 10, { dateTo: "2026-03-07" })

    const where = mockFindManyPaginated.mock.calls[0][2]
    expect(where.createdAt).toBeDefined()
    expect(where.createdAt.gte).toBeUndefined()
    expect(where.createdAt.lte).toBeInstanceOf(Date)
  })

  // ── 5. Both dateFrom and dateTo ───────────────────────────────────────

  it("sets both gte and lte when dateFrom and dateTo are provided", async () => {
    await OrderService.getAdminOrders(1, 10, {
      dateFrom: "2026-03-01",
      dateTo: "2026-03-07",
    })

    const where = mockFindManyPaginated.mock.calls[0][2]
    expect(where.createdAt.gte).toEqual(new Date("2026-03-01"))
    expect(where.createdAt.lte).toBeInstanceOf(Date)
  })

  // ── 6. fulfillment: PICKUP ────────────────────────────────────────────

  it("sets where.fulfillment to PICKUP", async () => {
    await OrderService.getAdminOrders(1, 10, { fulfillment: "PICKUP" })

    const where = mockFindManyPaginated.mock.calls[0][2]
    expect(where.fulfillment).toBe("PICKUP")
  })

  // ── 7. fulfillment: SHIPPING ──────────────────────────────────────────

  it("sets where.fulfillment to SHIPPING", async () => {
    await OrderService.getAdminOrders(1, 10, { fulfillment: "SHIPPING" })

    const where = mockFindManyPaginated.mock.calls[0][2]
    expect(where.fulfillment).toBe("SHIPPING")
  })

  // ── 8. paymentMethod: STRIPE ──────────────────────────────────────────

  it("maps paymentMethod STRIPE to where.paymentMethod CREDIT_CARD", async () => {
    await OrderService.getAdminOrders(1, 10, { paymentMethod: "STRIPE" })

    const where = mockFindManyPaginated.mock.calls[0][2]
    expect(where.paymentMethod).toBe("CREDIT_CARD")
  })

  // ── 9. paymentMethod: IN_STORE ────────────────────────────────────────

  it("maps paymentMethod IN_STORE to where.paymentMethod in [PAY_IN_STORE, CASH, CARD]", async () => {
    await OrderService.getAdminOrders(1, 10, { paymentMethod: "IN_STORE" })

    const where = mockFindManyPaginated.mock.calls[0][2]
    expect(where.paymentMethod).toEqual({ in: ["PAY_IN_STORE", "CASH", "CARD"] })
  })

  // ── 10. Combined filters ──────────────────────────────────────────────

  it("applies search, date range, and fulfillment filters simultaneously", async () => {
    await OrderService.getAdminOrders(1, 10, {
      search: "user@test.com",
      dateFrom: "2026-03-01",
      dateTo: "2026-03-07",
      fulfillment: "SHIPPING",
    })

    const where = mockFindManyPaginated.mock.calls[0][2]
    expect(where.OR).toBeDefined()
    expect(where.OR).toHaveLength(2)
    expect(where.createdAt.gte).toBeDefined()
    expect(where.createdAt.lte).toBeDefined()
    expect(where.fulfillment).toBe("SHIPPING")
  })

  // ── 11. dateTo end-of-day ─────────────────────────────────────────────

  it("sets dateTo lte to end-of-day (23:59:59.999)", async () => {
    await OrderService.getAdminOrders(1, 10, { dateTo: "2026-03-07" })

    const where = mockFindManyPaginated.mock.calls[0][2]
    const lte: Date = where.createdAt.lte
    expect(lte.getHours()).toBe(23)
    expect(lte.getMinutes()).toBe(59)
    expect(lte.getSeconds()).toBe(59)
    expect(lte.getMilliseconds()).toBe(999)
  })
})
