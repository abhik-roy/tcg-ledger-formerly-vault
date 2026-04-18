import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/repositories/order.repository", () => ({
  OrderRepository: {
    fulfillOrder: vi.fn(),
    countByStatuses: vi.fn(),
    findManyPaginated: vi.fn(),
    findById: vi.fn(),
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

const mockFulfillOrder = OrderRepository.fulfillOrder as ReturnType<typeof vi.fn>

describe("OrderService.bulkFulfillOrders", () => {
  beforeEach(() => vi.clearAllMocks())

  // ── 1. All valid IDs succeed ──────────────────────────────────────────

  it("returns all IDs in succeeded when all fulfillments pass", async () => {
    mockFulfillOrder.mockResolvedValue({})

    const result = await OrderService.bulkFulfillOrders(["o1", "o2", "o3"])

    expect(result.succeeded).toEqual(["o1", "o2", "o3"])
    expect(result.failed).toEqual([])
  })

  // ── 2. One ID throws ─────────────────────────────────────────────────

  it("puts the failing ID in failed while other IDs still succeed", async () => {
    mockFulfillOrder
      .mockResolvedValueOnce({}) // o1 succeeds
      .mockRejectedValueOnce(new Error("DB error")) // o2 fails
      .mockResolvedValueOnce({}) // o3 succeeds

    const result = await OrderService.bulkFulfillOrders(["o1", "o2", "o3"])

    expect(result.succeeded).toEqual(["o1", "o3"])
    expect(result.failed).toEqual([{ id: "o2", error: "DB error" }])
  })

  // ── 3. All IDs throw ─────────────────────────────────────────────────

  it("puts all IDs in failed when every fulfillment throws", async () => {
    mockFulfillOrder
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))

    const result = await OrderService.bulkFulfillOrders(["o1", "o2"])

    expect(result.succeeded).toEqual([])
    expect(result.failed).toHaveLength(2)
    expect(result.failed[0]).toEqual({ id: "o1", error: "fail 1" })
    expect(result.failed[1]).toEqual({ id: "o2", error: "fail 2" })
  })

  // ── 4. Empty array ───────────────────────────────────────────────────

  it("returns empty arrays immediately for an empty orderIds input", async () => {
    const result = await OrderService.bulkFulfillOrders([])

    expect(result).toEqual({ succeeded: [], failed: [] })
    expect(mockFulfillOrder).not.toHaveBeenCalled()
  })

  // ── 5. Sequential processing ─────────────────────────────────────────

  it("calls fulfillOrder once per order ID sequentially", async () => {
    mockFulfillOrder.mockResolvedValue({})

    await OrderService.bulkFulfillOrders(["o1", "o2", "o3"])

    expect(mockFulfillOrder).toHaveBeenCalledTimes(3)
    // Each call should have the order ID as the first positional arg
    expect(mockFulfillOrder.mock.calls[0][0]).toBe("o1")
    expect(mockFulfillOrder.mock.calls[1][0]).toBe("o2")
    expect(mockFulfillOrder.mock.calls[2][0]).toBe("o3")
  })

  // ── 6. Non-Error throws use "Unknown error" ──────────────────────────

  it("uses 'Unknown error' when a non-Error object is thrown", async () => {
    mockFulfillOrder.mockRejectedValueOnce("string error")

    const result = await OrderService.bulkFulfillOrders(["o1"])

    expect(result.failed[0].error).toBe("Unknown error")
  })
})
