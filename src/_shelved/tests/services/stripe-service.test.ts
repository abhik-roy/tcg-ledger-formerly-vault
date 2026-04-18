import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Stripe SDK mock (must be hoisted for module-level `new Stripe(...)`) ---
const { mockSessionCreate, mockSessionRetrieve } = vi.hoisted(() => ({
  mockSessionCreate: vi.fn(),
  mockSessionRetrieve: vi.fn(),
}))

vi.mock("stripe", () => ({
  Stripe: function () {
    return {
      checkout: {
        sessions: { create: mockSessionCreate, retrieve: mockSessionRetrieve },
      },
    }
  },
}))

// --- Prisma mock (service now uses prisma.$transaction directly) ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}))

// --- Repository mocks ---
vi.mock("@/repositories/inventory.repository", () => ({
  InventoryRepository: {
    findForStripeVerification: vi.fn(),
    findAndLockForUpdate: vi.fn(),
  },
}))

vi.mock("@/repositories/order.repository", () => ({
  OrderRepository: {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
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
  },
}))

vi.mock("@/services/settings.service", () => ({
  SettingsService: {
    getSettings: vi.fn().mockResolvedValue({
      taxRate: 0,
      standardShippingRate: 499,
      freeShippingThreshold: 0,
      currency: "USD",
    }),
  },
}))

import { StripeService } from "@/services/stripe.service"
import { InventoryRepository } from "@/repositories/inventory.repository"
import { OrderRepository } from "@/repositories/order.repository"
import { LogRepository } from "@/repositories/log.repository"
import { EmailService } from "@/services/email.service"
import { prisma } from "@/lib/prisma"

const mockFindForStripeVerification = InventoryRepository.findForStripeVerification as ReturnType<
  typeof vi.fn
>
const mockFindAndLockForUpdate = InventoryRepository.findAndLockForUpdate as ReturnType<
  typeof vi.fn
>
const mockOrderUpdate = OrderRepository.update as ReturnType<typeof vi.fn>
const mockOrderFindById = OrderRepository.findById as ReturnType<typeof vi.fn>
const mockCreateQuantityLog = LogRepository.createQuantityLogInTransaction as ReturnType<
  typeof vi.fn
>
const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>

// --- Fixtures ---
const validInventoryItem = {
  id: 1,
  name: "Black Lotus",
  setname: "Alpha",
  condition: "NM",
  finish: "nonfoil",
  storeprice: 50000,
  quantity: 10,
  imagenormal: "https://example.com/lotus.jpg",
  imagesmall: null,
}

const validCheckoutData = {
  items: [{ id: 1, cartQuantity: 2 }],
  email: "customer@example.com",
}

// Reusable mock transaction client
function createMockTx() {
  return {
    inventory: { update: vi.fn() },
    order: { create: vi.fn().mockResolvedValue({ id: "order-abc" }) },
    quantityLog: { create: vi.fn() },
  }
}

/**
 * Sets up the prisma.$transaction mock so it executes the callback with a mock tx.
 * Returns the mock tx for assertion inspection.
 */
function setupTransaction(mockTx = createMockTx()) {
  mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
    fn(mockTx)
  )
  return mockTx
}

describe("StripeService", () => {
  beforeEach(() => vi.clearAllMocks())

  // ── createCheckoutSession ─────────────────────────────────────────────

  describe("createCheckoutSession", () => {
    it("returns the Stripe checkout URL on happy path", async () => {
      mockFindForStripeVerification.mockResolvedValue(validInventoryItem)
      setupTransaction()
      mockFindAndLockForUpdate.mockResolvedValue({ id: 1, quantity: 10, name: "Black Lotus" })
      mockSessionCreate.mockResolvedValue({
        id: "sess_123",
        url: "https://checkout.stripe.com/pay/sess_123",
      })
      mockOrderUpdate.mockResolvedValue({})

      const result = await StripeService.createCheckoutSession(validCheckoutData)

      expect(result).toEqual({
        url: "https://checkout.stripe.com/pay/sess_123",
      })
    })

    it("creates a PENDING order inside the transaction before the Stripe session", async () => {
      mockFindForStripeVerification.mockResolvedValue(validInventoryItem)
      const mockTx = setupTransaction()
      mockFindAndLockForUpdate.mockResolvedValue({ id: 1, quantity: 10, name: "Black Lotus" })
      mockSessionCreate.mockResolvedValue({
        id: "sess_123",
        url: "https://stripe.com",
      })
      mockOrderUpdate.mockResolvedValue({})

      await StripeService.createCheckoutSession(validCheckoutData)

      // Order is created via tx.order.create inside the transaction
      expect(mockTx.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerEmail: "customer@example.com",
          status: "PENDING",
          paymentMethod: "STRIPE_ONLINE",
          fulfillment: "SHIPPING",
        }),
      })
      // Verify call order: transaction (which includes order create) before stripe session create
      const txCallOrder = mockTransaction.mock.invocationCallOrder[0]
      const stripeCallOrder = mockSessionCreate.mock.invocationCallOrder[0]
      expect(txCallOrder).toBeLessThan(stripeCallOrder)
    })

    it("stores stripeSessionId on the order after session creation", async () => {
      mockFindForStripeVerification.mockResolvedValue(validInventoryItem)
      setupTransaction()
      mockFindAndLockForUpdate.mockResolvedValue({ id: 1, quantity: 10, name: "Black Lotus" })
      mockSessionCreate.mockResolvedValue({
        id: "sess_123",
        url: "https://stripe.com",
      })
      mockOrderUpdate.mockResolvedValue({})

      await StripeService.createCheckoutSession(validCheckoutData)

      expect(mockOrderUpdate).toHaveBeenCalledWith("order-abc", {
        stripeSessionId: "sess_123",
      })
    })

    it("throws when an item is not found in inventory", async () => {
      mockFindForStripeVerification.mockResolvedValue(null)

      await expect(StripeService.createCheckoutSession(validCheckoutData)).rejects.toThrow(
        "Item 1 not found or has no price"
      )
    })

    it("throws when an item has no price", async () => {
      mockFindForStripeVerification.mockResolvedValue({
        ...validInventoryItem,
        storeprice: null,
      })

      await expect(StripeService.createCheckoutSession(validCheckoutData)).rejects.toThrow(
        "Item 1 not found or has no price"
      )
    })

    it("throws when there is insufficient stock (from locked row in transaction)", async () => {
      mockFindForStripeVerification.mockResolvedValue(validInventoryItem)
      // findAndLockForUpdate returns a row with quantity less than requested
      mockFindAndLockForUpdate.mockResolvedValue({ id: 1, quantity: 1, name: "Black Lotus" })
      // Transaction executes the callback which will throw
      mockTransaction.mockImplementation(
        async (fn: (tx: ReturnType<typeof createMockTx>) => Promise<unknown>) =>
          fn({
            inventory: { update: vi.fn() },
            order: { create: vi.fn() },
            quantityLog: { create: vi.fn() },
          })
      )

      await expect(StripeService.createCheckoutSession(validCheckoutData)).rejects.toThrow(
        "Insufficient stock for Black Lotus"
      )
    })

    it("passes orderId in Stripe session metadata", async () => {
      mockFindForStripeVerification.mockResolvedValue(validInventoryItem)
      const mockTx = createMockTx()
      mockTx.order.create.mockResolvedValue({ id: "order-xyz" })
      setupTransaction(mockTx)
      mockFindAndLockForUpdate.mockResolvedValue({ id: 1, quantity: 10, name: "Black Lotus" })
      mockSessionCreate.mockResolvedValue({
        id: "sess_1",
        url: "https://stripe.com",
      })
      mockOrderUpdate.mockResolvedValue({})

      await StripeService.createCheckoutSession(validCheckoutData)

      expect(mockSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ orderId: "order-xyz" }),
        })
      )
    })

    it("calculates subtotal correctly for multiple items", async () => {
      const item1 = { ...validInventoryItem, id: 1, storeprice: 100 }
      const item2 = {
        ...validInventoryItem,
        id: 2,
        storeprice: 250,
        name: "Mox Sapphire",
      }

      mockFindForStripeVerification.mockResolvedValueOnce(item1).mockResolvedValueOnce(item2)
      mockFindAndLockForUpdate
        .mockResolvedValueOnce({ id: 1, quantity: 10, name: "Black Lotus" })
        .mockResolvedValueOnce({ id: 2, quantity: 10, name: "Mox Sapphire" })

      const mockTx = createMockTx()
      mockTx.order.create.mockResolvedValue({ id: "order-1" })
      setupTransaction(mockTx)

      mockSessionCreate.mockResolvedValue({
        id: "sess_1",
        url: "https://stripe.com",
      })
      mockOrderUpdate.mockResolvedValue({})

      await StripeService.createCheckoutSession({
        items: [
          { id: 1, cartQuantity: 3 },
          { id: 2, cartQuantity: 1 },
        ],
        email: "test@test.com",
      })

      // subtotal = (100 * 3) + (250 * 1) = 550
      expect(mockTx.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ subtotal: 550, totalAmount: 550 }),
      })
    })

    it("treats zero quantity as insufficient stock (from locked row)", async () => {
      mockFindForStripeVerification.mockResolvedValue(validInventoryItem)
      // findAndLockForUpdate returns zero quantity — not enough stock
      mockFindAndLockForUpdate.mockResolvedValue({ id: 1, quantity: 0, name: "Black Lotus" })
      mockTransaction.mockImplementation(
        async (fn: (tx: ReturnType<typeof createMockTx>) => Promise<unknown>) =>
          fn({
            inventory: { update: vi.fn() },
            order: { create: vi.fn() },
            quantityLog: { create: vi.fn() },
          })
      )

      await expect(StripeService.createCheckoutSession(validCheckoutData)).rejects.toThrow(
        "Insufficient stock for Black Lotus"
      )
    })

    it("decrements inventory inside the transaction for each item", async () => {
      const item1 = { ...validInventoryItem, id: 1, storeprice: 100 }
      const item2 = { ...validInventoryItem, id: 2, storeprice: 200, name: "Mox Sapphire" }

      mockFindForStripeVerification.mockResolvedValueOnce(item1).mockResolvedValueOnce(item2)
      mockFindAndLockForUpdate
        .mockResolvedValueOnce({ id: 1, quantity: 10, name: "Black Lotus" })
        .mockResolvedValueOnce({ id: 2, quantity: 10, name: "Mox Sapphire" })

      const mockTx = createMockTx()
      mockTx.order.create.mockResolvedValue({ id: "order-1" })
      setupTransaction(mockTx)

      mockSessionCreate.mockResolvedValue({ id: "sess_1", url: "https://stripe.com" })
      mockOrderUpdate.mockResolvedValue({})

      await StripeService.createCheckoutSession({
        items: [
          { id: 1, cartQuantity: 3 },
          { id: 2, cartQuantity: 1 },
        ],
        email: "test@test.com",
      })

      expect(mockTx.inventory.update).toHaveBeenCalledTimes(2)
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { quantity: { decrement: 3 } },
      })
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { quantity: { decrement: 1 } },
      })
    })

    it("logs quantity reservation inside the transaction", async () => {
      mockFindForStripeVerification.mockResolvedValue(validInventoryItem)
      mockFindAndLockForUpdate.mockResolvedValue({ id: 1, quantity: 10, name: "Black Lotus" })
      setupTransaction()
      mockSessionCreate.mockResolvedValue({ id: "sess_1", url: "https://stripe.com" })
      mockOrderUpdate.mockResolvedValue({})

      await StripeService.createCheckoutSession(validCheckoutData)

      expect(mockCreateQuantityLog).toHaveBeenCalledTimes(1)
      expect(mockCreateQuantityLog).toHaveBeenCalledWith(
        expect.anything(), // the tx object
        {
          cardname: "Black Lotus",
          amount: -2,
          user: "STRIPE_RESERVE: customer@example.com",
          finish: "nonfoil",
        }
      )
    })

    it("does not create Stripe session when stock check fails in transaction", async () => {
      mockFindForStripeVerification.mockResolvedValue(validInventoryItem)
      // Stock is insufficient inside the locked row
      mockFindAndLockForUpdate.mockResolvedValue({ id: 1, quantity: 0, name: "Black Lotus" })
      mockTransaction.mockImplementation(
        async (fn: (tx: ReturnType<typeof createMockTx>) => Promise<unknown>) =>
          fn({
            inventory: { update: vi.fn() },
            order: { create: vi.fn() },
            quantityLog: { create: vi.fn() },
          })
      )

      await expect(StripeService.createCheckoutSession(validCheckoutData)).rejects.toThrow()

      expect(mockSessionCreate).not.toHaveBeenCalled()
    })

    it("calls findAndLockForUpdate for each item in the transaction", async () => {
      const item1 = { ...validInventoryItem, id: 1, storeprice: 100 }
      const item2 = { ...validInventoryItem, id: 2, storeprice: 200, name: "Mox Sapphire" }

      mockFindForStripeVerification.mockResolvedValueOnce(item1).mockResolvedValueOnce(item2)
      mockFindAndLockForUpdate
        .mockResolvedValueOnce({ id: 1, quantity: 10, name: "Black Lotus" })
        .mockResolvedValueOnce({ id: 2, quantity: 10, name: "Mox Sapphire" })

      const mockTx = createMockTx()
      mockTx.order.create.mockResolvedValue({ id: "order-1" })
      setupTransaction(mockTx)

      mockSessionCreate.mockResolvedValue({ id: "sess_1", url: "https://stripe.com" })
      mockOrderUpdate.mockResolvedValue({})

      await StripeService.createCheckoutSession({
        items: [
          { id: 1, cartQuantity: 1 },
          { id: 2, cartQuantity: 1 },
        ],
        email: "test@test.com",
      })

      expect(mockFindAndLockForUpdate).toHaveBeenCalledTimes(2)
      // First argument is the tx object, second is the inventory ID
      expect(mockFindAndLockForUpdate).toHaveBeenCalledWith(expect.anything(), 1)
      expect(mockFindAndLockForUpdate).toHaveBeenCalledWith(expect.anything(), 2)
    })
  })

  // ── verifyOrderFromSession ────────────────────────────────────────────

  describe("verifyOrderFromSession", () => {
    it("returns success and orderId when payment_status is paid", async () => {
      mockSessionRetrieve.mockResolvedValue({
        payment_status: "paid",
        metadata: { orderId: "order-123" },
      })
      mockOrderFindById.mockResolvedValue({ id: "order-123" })

      const result = await StripeService.verifyOrderFromSession("sess_abc")

      expect(result.success).toBe(true)
      expect(result.orderId).toBe("order-123")
      expect(result.order).toBeDefined()
      expect(result.order?.id).toBe("order-123")
      expect(mockSessionRetrieve).toHaveBeenCalledWith("sess_abc")
    })

    it("returns failure when payment_status is not paid", async () => {
      mockSessionRetrieve.mockResolvedValue({
        payment_status: "unpaid",
        metadata: { orderId: "order-123" },
      })

      const result = await StripeService.verifyOrderFromSession("sess_abc")

      expect(result).toEqual({
        success: false,
        error: "Payment not completed",
      })
      expect(mockOrderFindById).not.toHaveBeenCalled()
    })

    it("returns failure when orderId is missing from metadata", async () => {
      mockSessionRetrieve.mockResolvedValue({
        payment_status: "paid",
        metadata: {},
      })

      const result = await StripeService.verifyOrderFromSession("sess_abc")

      expect(result).toEqual({
        success: false,
        error: "Order reference not found",
      })
    })

    it("returns failure when order is not found in the database", async () => {
      mockSessionRetrieve.mockResolvedValue({
        payment_status: "paid",
        metadata: { orderId: "nonexistent" },
      })
      mockOrderFindById.mockResolvedValue(null)

      const result = await StripeService.verifyOrderFromSession("sess_abc")

      expect(result).toEqual({ success: false, error: "Order not found" })
    })

    it("sends confirmation email when emailConfirmationSent is false (webhook fallback)", async () => {
      mockSessionRetrieve.mockResolvedValue({
        payment_status: "paid",
        metadata: { orderId: "order-123" },
      })
      mockOrderFindById.mockResolvedValue({
        id: "order-123",
        emailConfirmationSent: false,
        items: [],
      })
      mockOrderUpdate.mockResolvedValue({})

      await StripeService.verifyOrderFromSession("sess_abc")

      expect(EmailService.sendOrderConfirmation).toHaveBeenCalledOnce()
      expect(mockOrderUpdate).toHaveBeenCalledWith("order-123", { emailConfirmationSent: true })
    })

    it("does NOT send confirmation email when emailConfirmationSent is true", async () => {
      mockSessionRetrieve.mockResolvedValue({
        payment_status: "paid",
        metadata: { orderId: "order-123" },
      })
      mockOrderFindById.mockResolvedValue({
        id: "order-123",
        emailConfirmationSent: true,
        items: [],
      })

      await StripeService.verifyOrderFromSession("sess_abc")

      expect(EmailService.sendOrderConfirmation).not.toHaveBeenCalled()
      expect(mockOrderUpdate).not.toHaveBeenCalled()
    })
  })
})
