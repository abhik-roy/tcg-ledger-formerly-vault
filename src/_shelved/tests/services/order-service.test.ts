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
import { LogRepository } from "@/repositories/log.repository"
import { EmailService } from "@/services/email.service"

const mockCountByStatuses = OrderRepository.countByStatuses as ReturnType<typeof vi.fn>
const mockFindManyPaginated = OrderRepository.findManyPaginated as ReturnType<typeof vi.fn>
const mockFulfillOrder = OrderRepository.fulfillOrder as ReturnType<typeof vi.fn>
const mockFindById = OrderRepository.findById as ReturnType<typeof vi.fn>
const mockTransaction = OrderRepository.transaction as ReturnType<typeof vi.fn>
const mockOrderUpdate = OrderRepository.update as ReturnType<typeof vi.fn>
const mockFindStalePending = OrderRepository.findStalePending as ReturnType<typeof vi.fn>
const mockCreateQuantityLog = LogRepository.createQuantityLogInTransaction as ReturnType<
  typeof vi.fn
>
const mockSendOrderConfirmation = EmailService.sendOrderConfirmation as ReturnType<typeof vi.fn>
const mockSendOrderCancellation = EmailService.sendOrderCancellation as ReturnType<typeof vi.fn>

describe("OrderService", () => {
  beforeEach(() => vi.clearAllMocks())

  // ── getPendingOrderCount ──────────────────────────────────────────────

  describe("getPendingOrderCount", () => {
    it("calls OrderRepository.countByStatuses with PENDING and PAID", async () => {
      mockCountByStatuses.mockResolvedValue(5)

      const count = await OrderService.getPendingOrderCount()

      expect(count).toBe(5)
      expect(mockCountByStatuses).toHaveBeenCalledWith(["PENDING", "PAID"])
    })
  })

  // ── getAdminOrders ────────────────────────────────────────────────────

  describe("getAdminOrders", () => {
    it("calculates skip correctly for page 1", async () => {
      mockFindManyPaginated.mockResolvedValue({ orders: [], total: 0 })

      await OrderService.getAdminOrders(1, 10)

      expect(mockFindManyPaginated).toHaveBeenCalledWith(0, 10, expect.any(Object))
    })

    it("calculates skip correctly for page 2 with limit 10", async () => {
      mockFindManyPaginated.mockResolvedValue({ orders: [], total: 25 })

      await OrderService.getAdminOrders(2, 10)

      expect(mockFindManyPaginated).toHaveBeenCalledWith(10, 10, expect.any(Object))
    })

    it("calculates totalPages correctly", async () => {
      mockFindManyPaginated.mockResolvedValue({ orders: [], total: 25 })

      const result = await OrderService.getAdminOrders(1, 10)

      expect(result.totalPages).toBe(3) // ceil(25/10) = 3
    })

    it("returns orders from the repository", async () => {
      const fakeOrders = [{ id: "o1" }, { id: "o2" }]
      mockFindManyPaginated.mockResolvedValue({
        orders: fakeOrders,
        total: 2,
      })

      const result = await OrderService.getAdminOrders(1, 10)

      expect(result.orders).toEqual(fakeOrders)
      expect(result.total).toBe(2)
    })

    it("uses default page=1 and limit=10 when not provided", async () => {
      mockFindManyPaginated.mockResolvedValue({ orders: [], total: 0 })

      await OrderService.getAdminOrders()

      expect(mockFindManyPaginated).toHaveBeenCalledWith(0, 10, expect.any(Object))
    })
  })

  // ── fulfillOrder ──────────────────────────────────────────────────────

  describe("fulfillOrder", () => {
    it("calls OrderRepository.fulfillOrder with correct data", async () => {
      mockFulfillOrder.mockResolvedValue({})

      const result = await OrderService.fulfillOrder("order-1", "TRACK123", "FedEx")

      expect(result).toEqual({ success: true })
      expect(mockFulfillOrder).toHaveBeenCalledWith(
        "order-1",
        expect.objectContaining({
          status: "COMPLETED",
          carrier: "FedEx",
          trackingNumber: "TRACK123",
        })
      )
    })

    it("defaults carrier to USPS when not provided", async () => {
      mockFulfillOrder.mockResolvedValue({})

      await OrderService.fulfillOrder("order-1", "TRACK123")

      expect(mockFulfillOrder).toHaveBeenCalledWith(
        "order-1",
        expect.objectContaining({ carrier: "USPS" })
      )
    })

    it("defaults carrier to USPS when empty string is passed", async () => {
      mockFulfillOrder.mockResolvedValue({})

      await OrderService.fulfillOrder("order-1", "TRACK123", "")

      expect(mockFulfillOrder).toHaveBeenCalledWith(
        "order-1",
        expect.objectContaining({ carrier: "USPS" })
      )
    })

    it("sets trackingNumber to null when not provided", async () => {
      mockFulfillOrder.mockResolvedValue({})

      await OrderService.fulfillOrder("order-1")

      expect(mockFulfillOrder).toHaveBeenCalledWith(
        "order-1",
        expect.objectContaining({ trackingNumber: null })
      )
    })

    it("includes a shippedAt date", async () => {
      mockFulfillOrder.mockResolvedValue({})

      await OrderService.fulfillOrder("order-1")

      const callArgs = mockFulfillOrder.mock.calls[0][1]
      expect(callArgs.shippedAt).toBeInstanceOf(Date)
    })
  })

  // ── processStripePayment ──────────────────────────────────────────────

  describe("processStripePayment", () => {
    const orderWithItems = {
      id: "order-1",
      status: "PENDING",
      totalAmount: 10000,
      customerEmail: "buyer@example.com",
      items: [
        {
          inventoryId: 101,
          name: "Lightning Bolt",
          quantity: 2,
          finish: "nonfoil",
        },
        {
          inventoryId: 102,
          name: "Counterspell",
          quantity: 1,
          finish: "foil",
        },
      ],
    }

    const session = { amount_total: 11000, amount_subtotal: 10000 }

    it("returns early if order is not found", async () => {
      mockFindById.mockResolvedValue(null)
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await OrderService.processStripePayment("missing-id", session)

      expect(mockTransaction).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("skips processing if order is already PAID (idempotency)", async () => {
      mockFindById.mockResolvedValue({ ...orderWithItems, status: "PAID" })
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      await OrderService.processStripePayment("order-1", session)

      expect(mockTransaction).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("skips processing if order is already COMPLETED (idempotency)", async () => {
      mockFindById.mockResolvedValue({
        ...orderWithItems,
        status: "COMPLETED",
      })
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      await OrderService.processStripePayment("order-1", session)

      expect(mockTransaction).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("updates order status to PAID within the transaction", async () => {
      mockFindById.mockResolvedValue(orderWithItems)
      const mockTx = {
        order: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.processStripePayment("order-1", session)

      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: expect.objectContaining({ status: "PAID" }),
      })
    })

    it("calculates tax correctly from amount_total - amount_subtotal", async () => {
      mockFindById.mockResolvedValue(orderWithItems)
      const mockTx = {
        order: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.processStripePayment("order-1", session)

      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: 11000,
            tax: 1000, // 11000 - 10000
          }),
        })
      )
    })

    it("does not decrement inventory (pre-reserved at session creation)", async () => {
      mockFindById.mockResolvedValue(orderWithItems)
      const mockTx = {
        order: { update: vi.fn() },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.processStripePayment("order-1", session)

      // Inventory should NOT be decremented -- stock was already reserved at checkout session creation
      expect(mockTx.inventory.update).not.toHaveBeenCalled()
    })

    it("does not log quantity changes (pre-logged at session creation)", async () => {
      mockFindById.mockResolvedValue(orderWithItems)
      const mockTx = {
        order: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.processStripePayment("order-1", session)

      expect(mockCreateQuantityLog).not.toHaveBeenCalled()
    })

    it("uses order totalAmount when session amount_total is null", async () => {
      mockFindById.mockResolvedValue(orderWithItems)
      const mockTx = {
        order: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockOrderUpdate.mockResolvedValue({})

      await OrderService.processStripePayment("order-1", {
        amount_total: null,
        amount_subtotal: null,
      })

      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: 10000, // falls back to order.totalAmount
            tax: 0, // (0) - (0) = 0
          }),
        })
      )
    })

    // ── Email confirmation ──────────────────────────────────────

    it("calls sendOrderConfirmation after successful processing", async () => {
      mockFindById.mockResolvedValue({ ...orderWithItems, emailConfirmationSent: false })
      const mockTx = {
        order: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockOrderUpdate.mockResolvedValue({})

      await OrderService.processStripePayment("order-1", session)

      expect(mockSendOrderConfirmation).toHaveBeenCalledTimes(1)
      expect(mockSendOrderConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ id: "order-1" })
      )
    })

    it("does NOT call sendOrderConfirmation when emailConfirmationSent is true (idempotency)", async () => {
      mockFindById.mockResolvedValue({ ...orderWithItems, emailConfirmationSent: true })
      const mockTx = {
        order: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.processStripePayment("order-1", session)

      expect(mockSendOrderConfirmation).not.toHaveBeenCalled()
    })

    it("sets emailConfirmationSent to true via OrderRepository.update after sending", async () => {
      mockFindById.mockResolvedValue({ ...orderWithItems, emailConfirmationSent: false })
      const mockTx = {
        order: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockOrderUpdate.mockResolvedValue({})

      await OrderService.processStripePayment("order-1", session)

      expect(mockOrderUpdate).toHaveBeenCalledWith("order-1", { emailConfirmationSent: true })
    })

    it("does NOT update emailConfirmationSent when email was already sent", async () => {
      mockFindById.mockResolvedValue({ ...orderWithItems, emailConfirmationSent: true })
      const mockTx = {
        order: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.processStripePayment("order-1", session)

      expect(mockOrderUpdate).not.toHaveBeenCalledWith("order-1", { emailConfirmationSent: true })
    })
  })

  // ── handleExpiredSession ──────────────────────────────────────────────

  describe("handleExpiredSession", () => {
    const pendingOrderWithItems = {
      id: "order-exp",
      status: "PENDING",
      customerEmail: "buyer@example.com",
      items: [
        {
          inventoryId: 101,
          name: "Lightning Bolt",
          quantity: 2,
          finish: "nonfoil",
        },
        {
          inventoryId: 102,
          name: "Counterspell",
          quantity: 1,
          finish: "foil",
        },
      ],
    }

    it("restores inventory for all items in a PENDING order", async () => {
      mockFindById.mockResolvedValue(pendingOrderWithItems)
      const mockTx = {
        inventory: { update: vi.fn() },
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.handleExpiredSession("order-exp")

      expect(mockTx.inventory.update).toHaveBeenCalledTimes(2)
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { quantity: { increment: 2 } },
      })
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { id: 102 },
        data: { quantity: { increment: 1 } },
      })
    })

    it("logs each restore with STRIPE_EXPIRED: prefix and positive amount", async () => {
      mockFindById.mockResolvedValue(pendingOrderWithItems)
      const mockTx = {
        inventory: { update: vi.fn() },
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.handleExpiredSession("order-exp")

      expect(mockCreateQuantityLog).toHaveBeenCalledTimes(2)
      expect(mockCreateQuantityLog).toHaveBeenCalledWith(mockTx, {
        cardname: "Lightning Bolt",
        amount: 2, // positive: restoring stock
        user: "STRIPE_EXPIRED: buyer@example.com",
        finish: "nonfoil",
      })
      expect(mockCreateQuantityLog).toHaveBeenCalledWith(mockTx, {
        cardname: "Counterspell",
        amount: 1, // positive: restoring stock
        user: "STRIPE_EXPIRED: buyer@example.com",
        finish: "foil",
      })
    })

    it("cancels the order atomically using updateMany with status guard", async () => {
      mockFindById.mockResolvedValue(pendingOrderWithItems)
      const mockTx = {
        inventory: { update: vi.fn() },
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.handleExpiredSession("order-exp")

      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: "order-exp", status: "PENDING" },
        data: { status: "CANCELLED" },
      })
    })

    it("skips inventory restore when concurrent process already cancelled the order", async () => {
      mockFindById.mockResolvedValue(pendingOrderWithItems)
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const mockTx = {
        inventory: { update: vi.fn() },
        order: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.handleExpiredSession("order-exp")

      expect(mockTx.inventory.update).not.toHaveBeenCalled()
      expect(mockCreateQuantityLog).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("is a no-op when order is not found", async () => {
      mockFindById.mockResolvedValue(null)
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await OrderService.handleExpiredSession("nonexistent")

      expect(mockTransaction).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("is a no-op when order is already PAID", async () => {
      mockFindById.mockResolvedValue({ ...pendingOrderWithItems, status: "PAID" })
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      await OrderService.handleExpiredSession("order-exp")

      expect(mockTransaction).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("is a no-op when order is already CANCELLED", async () => {
      mockFindById.mockResolvedValue({ ...pendingOrderWithItems, status: "CANCELLED" })
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      await OrderService.handleExpiredSession("order-exp")

      expect(mockTransaction).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  // ── cancelStalePendingOrders ──────────────────────────────────────────

  describe("cancelStalePendingOrders", () => {
    it("calls findStalePending with the given olderThanMinutes", async () => {
      mockFindStalePending.mockResolvedValue([])

      await OrderService.cancelStalePendingOrders(45)

      expect(mockFindStalePending).toHaveBeenCalledWith(45)
    })

    it("uses 30 minutes as the default threshold", async () => {
      mockFindStalePending.mockResolvedValue([])

      await OrderService.cancelStalePendingOrders()

      expect(mockFindStalePending).toHaveBeenCalledWith(30)
    })

    it("calls handleExpiredSession for each stale order", async () => {
      mockFindStalePending.mockResolvedValue([{ id: "order-1" }, { id: "order-2" }])
      const handleSpy = vi.spyOn(OrderService, "handleExpiredSession").mockResolvedValue(undefined)

      await OrderService.cancelStalePendingOrders(30)

      expect(handleSpy).toHaveBeenCalledTimes(2)
      expect(handleSpy).toHaveBeenCalledWith("order-1")
      expect(handleSpy).toHaveBeenCalledWith("order-2")
      handleSpy.mockRestore()
    })

    it("returns the count of successfully cancelled orders", async () => {
      mockFindStalePending.mockResolvedValue([{ id: "order-1" }, { id: "order-2" }])
      const handleSpy = vi.spyOn(OrderService, "handleExpiredSession").mockResolvedValue(undefined)

      const count = await OrderService.cancelStalePendingOrders(30)

      expect(count).toBe(2)
      handleSpy.mockRestore()
    })

    it("returns 0 when there are no stale orders", async () => {
      mockFindStalePending.mockResolvedValue([])

      const count = await OrderService.cancelStalePendingOrders(30)

      expect(count).toBe(0)
    })

    it("skips a failed order and continues processing the rest", async () => {
      mockFindStalePending.mockResolvedValue([
        { id: "order-ok" },
        { id: "order-fail" },
        { id: "order-ok-2" },
      ])
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const handleSpy = vi
        .spyOn(OrderService, "handleExpiredSession")
        .mockImplementation(async (id) => {
          if (id === "order-fail") throw new Error("DB error")
        })

      const count = await OrderService.cancelStalePendingOrders(30)

      // 2 succeeded, 1 failed
      expect(count).toBe(2)
      expect(handleSpy).toHaveBeenCalledTimes(3)
      consoleSpy.mockRestore()
      handleSpy.mockRestore()
    })
  })

  // ── cancelOrder ──────────────────────────────────────────────────────

  describe("cancelOrder", () => {
    const pendingOrderWithItems = {
      id: "order-cancel",
      status: "PENDING",
      customerEmail: "buyer@example.com",
      items: [
        {
          inventoryId: 101,
          name: "Lightning Bolt",
          quantity: 2,
          finish: "nonfoil",
        },
        {
          inventoryId: 102,
          name: "Counterspell",
          quantity: 1,
          finish: "foil",
        },
      ],
    }

    it("returns error when order is not found", async () => {
      mockFindById.mockResolvedValue(null)

      const result = await OrderService.cancelOrder("nonexistent")

      expect(result).toEqual({ success: false, error: "Order not found" })
    })

    it("returns error when order is already CANCELLED", async () => {
      mockFindById.mockResolvedValue({ ...pendingOrderWithItems, status: "CANCELLED" })

      const result = await OrderService.cancelOrder("order-cancel")

      expect(result).toEqual({ success: false, error: "Order cannot be cancelled" })
    })

    it("returns error when order is already COMPLETED", async () => {
      mockFindById.mockResolvedValue({ ...pendingOrderWithItems, status: "COMPLETED" })

      const result = await OrderService.cancelOrder("order-cancel")

      expect(result).toEqual({ success: false, error: "Order cannot be cancelled" })
    })

    it("cancels a PENDING order and restores inventory", async () => {
      mockFindById.mockResolvedValue(pendingOrderWithItems)
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.cancelOrder("order-cancel")

      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: "order-cancel", status: { in: ["PENDING", "PAID"] } },
        data: { status: "CANCELLED" },
      })
      expect(mockTx.inventory.update).toHaveBeenCalledTimes(2)
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { quantity: { increment: 2 } },
      })
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { id: 102 },
        data: { quantity: { increment: 1 } },
      })
    })

    it("cancels a PAID order and restores inventory", async () => {
      mockFindById.mockResolvedValue({ ...pendingOrderWithItems, status: "PAID" })
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.cancelOrder("order-cancel")

      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: "order-cancel", status: { in: ["PENDING", "PAID"] } },
        data: { status: "CANCELLED" },
      })
      expect(mockTx.inventory.update).toHaveBeenCalledTimes(2)
    })

    it("logs each restoration with CANCELLED_BY_ADMIN: prefix", async () => {
      mockFindById.mockResolvedValue(pendingOrderWithItems)
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.cancelOrder("order-cancel")

      expect(mockCreateQuantityLog).toHaveBeenCalledTimes(2)
      expect(mockCreateQuantityLog).toHaveBeenCalledWith(mockTx, {
        cardname: "Lightning Bolt",
        amount: 2,
        user: "CANCELLED_BY_ADMIN: Cancelled by admin",
        finish: "nonfoil",
      })
      expect(mockCreateQuantityLog).toHaveBeenCalledWith(mockTx, {
        cardname: "Counterspell",
        amount: 1,
        user: "CANCELLED_BY_ADMIN: Cancelled by admin",
        finish: "foil",
      })
    })

    it("includes custom reason in log user field", async () => {
      mockFindById.mockResolvedValue(pendingOrderWithItems)
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.cancelOrder("order-cancel", "Customer request")

      expect(mockCreateQuantityLog).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ user: "CANCELLED_BY_ADMIN: Customer request" })
      )
    })

    it("sends cancellation email after successful cancel", async () => {
      mockFindById.mockResolvedValue(pendingOrderWithItems)
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.cancelOrder("order-cancel")

      expect(mockSendOrderCancellation).toHaveBeenCalledTimes(1)
      expect(mockSendOrderCancellation).toHaveBeenCalledWith(
        expect.objectContaining({ id: "order-cancel" }),
        "Cancelled by admin"
      )
    })

    it("skips inventory restore when concurrent process already cancelled (count=0)", async () => {
      mockFindById.mockResolvedValue(pendingOrderWithItems)
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.cancelOrder("order-cancel")

      expect(mockTx.inventory.update).not.toHaveBeenCalled()
      expect(mockCreateQuantityLog).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("returns { success: true } on success", async () => {
      mockFindById.mockResolvedValue(pendingOrderWithItems)
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      const result = await OrderService.cancelOrder("order-cancel")

      expect(result).toEqual({ success: true })
    })
  })

  // ── handleStripeRefund ──────────────────────────────────────────────

  describe("handleStripeRefund", () => {
    const paidOrderWithItems = {
      id: "order-refund",
      status: "PAID",
      customerEmail: "buyer@example.com",
      items: [
        {
          inventoryId: 101,
          name: "Lightning Bolt",
          quantity: 2,
          finish: "nonfoil",
        },
        {
          inventoryId: 102,
          name: "Counterspell",
          quantity: 1,
          finish: "foil",
        },
      ],
    }

    it("is a no-op for partial refunds", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      await OrderService.handleStripeRefund("order-refund", false)

      expect(mockTransaction).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("logs a warning for partial refunds", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      await OrderService.handleStripeRefund("order-refund", false)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("cancels a PAID order on full refund and restores inventory", async () => {
      mockFindById.mockResolvedValue(paidOrderWithItems)
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.handleStripeRefund("order-refund", true)

      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: "order-refund", status: { in: ["PAID", "COMPLETED"] } },
        data: { status: "CANCELLED" },
      })
      expect(mockTx.inventory.update).toHaveBeenCalledTimes(2)
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { quantity: { increment: 2 } },
      })
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { id: 102 },
        data: { quantity: { increment: 1 } },
      })
    })

    it("cancels a COMPLETED order on full refund", async () => {
      mockFindById.mockResolvedValue({ ...paidOrderWithItems, status: "COMPLETED" })
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.handleStripeRefund("order-refund", true)

      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: "order-refund", status: { in: ["PAID", "COMPLETED"] } },
        data: { status: "CANCELLED" },
      })
      expect(mockTx.inventory.update).toHaveBeenCalledTimes(2)
    })

    it("uses REFUNDED_BY_STRIPE: prefix in quantityLog", async () => {
      mockFindById.mockResolvedValue(paidOrderWithItems)
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.handleStripeRefund("order-refund", true)

      expect(mockCreateQuantityLog).toHaveBeenCalledTimes(2)
      expect(mockCreateQuantityLog).toHaveBeenCalledWith(mockTx, {
        cardname: "Lightning Bolt",
        amount: 2,
        user: "REFUNDED_BY_STRIPE: buyer@example.com",
        finish: "nonfoil",
      })
      expect(mockCreateQuantityLog).toHaveBeenCalledWith(mockTx, {
        cardname: "Counterspell",
        amount: 1,
        user: "REFUNDED_BY_STRIPE: buyer@example.com",
        finish: "foil",
      })
    })

    it("is a no-op when order is not found", async () => {
      mockFindById.mockResolvedValue(null)

      await OrderService.handleStripeRefund("nonexistent", true)

      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it("is a no-op when order is already CANCELLED", async () => {
      mockFindById.mockResolvedValue({ ...paidOrderWithItems, status: "CANCELLED" })

      await OrderService.handleStripeRefund("order-refund", true)

      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it("is a no-op when order status is not PAID or COMPLETED", async () => {
      mockFindById.mockResolvedValue({ ...paidOrderWithItems, status: "PENDING" })
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      await OrderService.handleStripeRefund("order-refund", true)

      expect(mockTransaction).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("sends cancellation email after full refund", async () => {
      mockFindById.mockResolvedValue(paidOrderWithItems)
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.handleStripeRefund("order-refund", true)

      expect(mockSendOrderCancellation).toHaveBeenCalledTimes(1)
      expect(mockSendOrderCancellation).toHaveBeenCalledWith(
        expect.objectContaining({ id: "order-refund" }),
        "Your payment has been refunded"
      )
    })

    it("skips restore when concurrent process already handled it (count=0)", async () => {
      mockFindById.mockResolvedValue(paidOrderWithItems)
      const mockTx = {
        order: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        inventory: { update: vi.fn() },
      }
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      await OrderService.handleStripeRefund("order-refund", true)

      expect(mockTx.inventory.update).not.toHaveBeenCalled()
    })
  })
})
