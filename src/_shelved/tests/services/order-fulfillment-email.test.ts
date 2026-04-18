import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks (must be declared before imports) ─────────────────────────────

vi.mock("@/repositories/order.repository", () => ({
  OrderRepository: {
    countByStatuses: vi.fn(),
    findManyPaginated: vi.fn(),
    fulfillOrder: vi.fn().mockResolvedValue(undefined),
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
    sendFulfillmentNotification: vi.fn().mockResolvedValue(undefined),
  },
}))

import { OrderService } from "@/services/order.service"
import { OrderRepository } from "@/repositories/order.repository"
import { EmailService } from "@/services/email.service"

const mockRepoFulfill = OrderRepository.fulfillOrder as ReturnType<typeof vi.fn>
const mockSendFulfillment = EmailService.sendFulfillmentNotification as ReturnType<typeof vi.fn>

// ── Helpers ─────────────────────────────────────────────────────────────

function makeDbOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order_abc123",
    customerEmail: "buyer@example.com",
    fulfillment: "SHIPPING",
    trackingNumber: null,
    carrier: "USPS",
    totalAmount: 5000,
    addressLine1: "123 Main St",
    city: "Springfield",
    state: "IL",
    postalCode: "62701",
    items: [
      {
        name: "Lightning Bolt",
        setName: "Alpha",
        condition: "NM",
        finish: "nonfoil",
        price: 5000,
        quantity: 1,
      },
    ],
    ...overrides,
  }
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("OrderService — fulfillment + email integration (DEV-10)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── fulfillOrder ────────────────────────────────────────────────────

  describe("fulfillOrder", () => {
    it("calls OrderRepository.fulfillOrder with correct status/carrier/trackingNumber/shippedAt", async () => {
      mockRepoFulfill.mockResolvedValue(makeDbOrder())

      await OrderService.fulfillOrder("order_abc123", "TRACK999", "FedEx")

      expect(mockRepoFulfill).toHaveBeenCalledOnce()
      expect(mockRepoFulfill).toHaveBeenCalledWith("order_abc123", {
        status: "COMPLETED",
        carrier: "FedEx",
        trackingNumber: "TRACK999",
        shippedAt: expect.any(Date),
      })
    })

    it("uses the order returned by OrderRepository.fulfillOrder (no separate findUnique)", async () => {
      const order = makeDbOrder()
      mockRepoFulfill.mockResolvedValue(order)

      await OrderService.fulfillOrder("order_abc123")

      // OrderRepository.fulfillOrder now includes items — no second DB fetch needed
      expect(mockRepoFulfill).toHaveBeenCalledOnce()
    })

    it("calls sendFulfillmentNotification when order has customerEmail", async () => {
      const order = makeDbOrder()
      mockRepoFulfill.mockResolvedValue(order)

      await OrderService.fulfillOrder("order_abc123")

      expect(mockSendFulfillment).toHaveBeenCalledOnce()
      expect(mockSendFulfillment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "order_abc123",
          customerEmail: "buyer@example.com",
        }),
        "TCG Vault",
        undefined // process.env.ADMIN_EMAIL is undefined in test
      )
    })

    it("does NOT call sendFulfillmentNotification when order has no customerEmail", async () => {
      mockRepoFulfill.mockResolvedValue(makeDbOrder({ customerEmail: "" }))

      await OrderService.fulfillOrder("order_abc123")

      expect(mockSendFulfillment).not.toHaveBeenCalled()
    })

    it("returns { success: true } even when email send throws", async () => {
      const order = makeDbOrder()
      mockRepoFulfill.mockResolvedValue(order)
      mockSendFulfillment.mockRejectedValueOnce(new Error("SMTP failure"))

      const result = await OrderService.fulfillOrder("order_abc123")

      expect(result).toEqual({ success: true })
    })

    it("returns { success: true } even when OrderRepository.fulfillOrder returns undefined", async () => {
      mockRepoFulfill.mockResolvedValue(undefined)

      const result = await OrderService.fulfillOrder("order_abc123")

      expect(result).toEqual({ success: true })
    })
  })

  // ── bulkFulfillOrders ───────────────────────────────────────────────

  describe("bulkFulfillOrders", () => {
    it("returns all IDs as succeeded when all orders fulfill successfully", async () => {
      mockRepoFulfill.mockResolvedValue(makeDbOrder())

      const result = await OrderService.bulkFulfillOrders(["id1", "id2"])

      expect(result).toEqual({ succeeded: ["id1", "id2"], failed: [] })
    })

    it("captures partial failures — one throws, others succeed", async () => {
      // First call succeeds, second throws at repo level
      mockRepoFulfill
        .mockResolvedValueOnce(makeDbOrder()) // id1 succeeds
        .mockRejectedValueOnce(new Error("DB error")) // id2 fails
        .mockResolvedValueOnce(makeDbOrder()) // id3 succeeds

      const result = await OrderService.bulkFulfillOrders(["id1", "id2", "id3"])

      expect(result.succeeded).toEqual(["id1", "id3"])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0]).toEqual({ id: "id2", error: "DB error" })
    })

    it("returns all IDs as failed when all throw", async () => {
      mockRepoFulfill
        .mockRejectedValueOnce(new Error("fail1"))
        .mockRejectedValueOnce(new Error("fail2"))

      const result = await OrderService.bulkFulfillOrders(["id1", "id2"])

      expect(result.succeeded).toEqual([])
      expect(result.failed).toHaveLength(2)
      expect(result.failed[0]).toEqual({ id: "id1", error: "fail1" })
      expect(result.failed[1]).toEqual({ id: "id2", error: "fail2" })
    })

    it("returns empty arrays for empty input", async () => {
      const result = await OrderService.bulkFulfillOrders([])

      expect(result).toEqual({ succeeded: [], failed: [] })
    })

    it("calls fulfillOrder once per order ID — call count equals input length", async () => {
      mockRepoFulfill.mockResolvedValue(makeDbOrder())

      await OrderService.bulkFulfillOrders(["a", "b", "c"])

      // OrderRepository.fulfillOrder is called once per ID inside OrderService.fulfillOrder
      expect(mockRepoFulfill).toHaveBeenCalledTimes(3)
    })
  })
})
