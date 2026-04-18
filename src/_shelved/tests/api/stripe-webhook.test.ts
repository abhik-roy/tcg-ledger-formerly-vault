import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Hoisted mocks (available during vi.mock factory execution) ---
const { mockConstructEvent, mockSessionsList } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockSessionsList: vi.fn(),
}))

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

vi.mock("stripe", () => ({
  default: function () {
    return {
      webhooks: { constructEvent: mockConstructEvent },
      checkout: { sessions: { list: mockSessionsList } },
    }
  },
}))

vi.mock("@/services/order.service", () => ({
  OrderService: {
    processStripePayment: vi.fn(),
    handleExpiredSession: vi.fn(),
    handleStripeRefund: vi.fn(),
  },
}))

vi.mock("@/repositories/order.repository", () => ({
  OrderRepository: {
    findByStripeSessionId: vi.fn(),
  },
}))

vi.mock("@/services/email.service", () => ({
  EmailService: {
    sendDisputeNotification: vi.fn().mockResolvedValue(undefined),
  },
}))

import { POST } from "@/app/api/webhooks/stripe/route"
import { headers } from "next/headers"
import { OrderService } from "@/services/order.service"
import { OrderRepository } from "@/repositories/order.repository"
import { EmailService } from "@/services/email.service"

const mockProcessStripePayment = OrderService.processStripePayment as ReturnType<typeof vi.fn>
const mockHandleExpiredSession = OrderService.handleExpiredSession as ReturnType<typeof vi.fn>
const mockHandleStripeRefund = OrderService.handleStripeRefund as ReturnType<typeof vi.fn>
const mockFindByStripeSessionId = OrderRepository.findByStripeSessionId as ReturnType<typeof vi.fn>
const mockSendDisputeNotification = EmailService.sendDisputeNotification as ReturnType<typeof vi.fn>

// Helper to create a mock Request
const makeMockRequest = (body: string = "raw-body") =>
  ({ text: vi.fn().mockResolvedValue(body) }) as unknown as Request

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: headers returns a Map-like with Stripe-Signature
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue("test-signature"),
    } as unknown as Awaited<ReturnType<typeof headers>>)
  })

  it("returns 200 and calls processStripePayment for checkout.session.completed", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { orderId: "order-123" },
          amount_total: 5000,
          amount_subtotal: 4500,
        },
      },
    })
    mockProcessStripePayment.mockResolvedValue(undefined)

    const response = await POST(makeMockRequest())

    expect(response.status).toBe(200)
    expect(mockProcessStripePayment).toHaveBeenCalledWith("order-123", {
      amount_total: 5000,
      amount_subtotal: 4500,
    })
  })

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    const response = await POST(makeMockRequest())

    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toContain("Webhook Error:")
    expect(text).toContain("Invalid signature")
    expect(mockProcessStripePayment).not.toHaveBeenCalled()
  })

  it("returns 200 without processing for non-checkout events", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: {} },
    })

    const response = await POST(makeMockRequest())

    expect(response.status).toBe(200)
    expect(mockProcessStripePayment).not.toHaveBeenCalled()
    expect(mockHandleExpiredSession).not.toHaveBeenCalled()
  })

  it("returns 200 without processing when orderId is missing from metadata", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: {},
          amount_total: 5000,
          amount_subtotal: 4500,
        },
      },
    })

    const response = await POST(makeMockRequest())

    expect(response.status).toBe(200)
    expect(mockProcessStripePayment).not.toHaveBeenCalled()
  })

  it("returns 500 when processStripePayment throws so Stripe retries the payment event", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { orderId: "order-fail" },
          amount_total: 5000,
          amount_subtotal: 4500,
        },
      },
    })
    mockProcessStripePayment.mockRejectedValue(new Error("DB error"))
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await POST(makeMockRequest())

    expect(response.status).toBe(500)
    consoleSpy.mockRestore()
  })

  it("reads the raw body from the request", async () => {
    const req = makeMockRequest("stripe-raw-body")
    mockConstructEvent.mockReturnValue({
      type: "some.event",
      data: { object: {} },
    })

    await POST(req)

    expect(req.text).toHaveBeenCalled()
    expect(mockConstructEvent).toHaveBeenCalledWith(
      "stripe-raw-body",
      "test-signature",
      process.env.STRIPE_WEBHOOK_SECRET
    )
  })

  // ── checkout.session.expired handling ──────────────────────────────────

  describe("checkout.session.expired handling", () => {
    it("calls handleExpiredSession with orderId from metadata", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.expired",
        data: {
          object: {
            metadata: { orderId: "order-expired-1" },
          },
        },
      })
      mockHandleExpiredSession.mockResolvedValue(undefined)
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      expect(mockHandleExpiredSession).toHaveBeenCalledWith("order-expired-1")
      expect(mockProcessStripePayment).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("returns 200 even when handleExpiredSession throws", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.expired",
        data: {
          object: {
            metadata: { orderId: "order-expired-fail" },
          },
        },
      })
      mockHandleExpiredSession.mockRejectedValue(new Error("DB error on expire"))
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      consoleSpy.mockRestore()
      warnSpy.mockRestore()
    })

    it("does not call handleExpiredSession when orderId is missing from metadata", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.expired",
        data: {
          object: {
            metadata: {},
          },
        },
      })

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      expect(mockHandleExpiredSession).not.toHaveBeenCalled()
    })
  })

  // ── checkout.session.async_payment_failed handling ──────────────────────

  describe("checkout.session.async_payment_failed handling", () => {
    it("calls handleExpiredSession with orderId from metadata", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.async_payment_failed",
        data: {
          object: {
            metadata: { orderId: "order-async-fail" },
          },
        },
      })
      mockHandleExpiredSession.mockResolvedValue(undefined)
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      expect(mockHandleExpiredSession).toHaveBeenCalledWith("order-async-fail")
      expect(mockProcessStripePayment).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("returns 200 even when handleExpiredSession throws", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.async_payment_failed",
        data: {
          object: {
            metadata: { orderId: "order-async-fail-err" },
          },
        },
      })
      mockHandleExpiredSession.mockRejectedValue(new Error("DB error on async fail"))
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      consoleSpy.mockRestore()
      warnSpy.mockRestore()
    })

    it("does not call handleExpiredSession when orderId is missing from metadata", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.async_payment_failed",
        data: {
          object: {
            metadata: {},
          },
        },
      })

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      expect(mockHandleExpiredSession).not.toHaveBeenCalled()
    })
  })

  // ── charge.refunded handling ────────────────────────────────────────

  describe("charge.refunded handling", () => {
    const makeRefundEvent = (overrides: Record<string, unknown> = {}, isFullRefund = true) => ({
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_test",
          payment_intent: "pi_test",
          amount: 5000,
          amount_refunded: isFullRefund ? 5000 : 2500,
          refunded: isFullRefund,
          ...overrides,
        },
      },
    })

    beforeEach(() => {
      mockSessionsList.mockResolvedValue({
        data: [{ id: "cs_test", metadata: { orderId: "order-123" } }],
      })
      mockHandleStripeRefund.mockResolvedValue(undefined)
    })

    it("calls handleStripeRefund with isFullRefund=true for a full refund", async () => {
      mockConstructEvent.mockReturnValue(makeRefundEvent())

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      expect(mockHandleStripeRefund).toHaveBeenCalledWith("order-123", true)
    })

    it("calls handleStripeRefund with isFullRefund=false for a partial refund", async () => {
      mockConstructEvent.mockReturnValue(
        makeRefundEvent({ amount_refunded: 2500, refunded: false }, false)
      )

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      expect(mockHandleStripeRefund).toHaveBeenCalledWith("order-123", false)
    })

    it("resolves order via stripe.checkout.sessions.list using payment_intent", async () => {
      mockConstructEvent.mockReturnValue(makeRefundEvent())

      await POST(makeMockRequest())

      expect(mockSessionsList).toHaveBeenCalledWith({
        payment_intent: "pi_test",
        limit: 1,
      })
    })

    it("falls back to findByStripeSessionId when metadata.orderId is missing", async () => {
      mockConstructEvent.mockReturnValue(makeRefundEvent())
      mockSessionsList.mockResolvedValue({
        data: [{ id: "cs_test", metadata: {} }],
      })
      mockFindByStripeSessionId.mockResolvedValue({ id: "order-fallback" })

      await POST(makeMockRequest())

      expect(mockFindByStripeSessionId).toHaveBeenCalledWith("cs_test")
      expect(mockHandleStripeRefund).toHaveBeenCalledWith("order-fallback", true)
    })

    it("does not call handleStripeRefund when session has no orderId and findByStripeSessionId returns null", async () => {
      mockConstructEvent.mockReturnValue(makeRefundEvent())
      mockSessionsList.mockResolvedValue({
        data: [{ id: "cs_test", metadata: {} }],
      })
      mockFindByStripeSessionId.mockResolvedValue(null)

      await POST(makeMockRequest())

      expect(mockHandleStripeRefund).not.toHaveBeenCalled()
    })

    it("does not call handleStripeRefund when no session found", async () => {
      mockConstructEvent.mockReturnValue(makeRefundEvent())
      mockSessionsList.mockResolvedValue({ data: [] })

      await POST(makeMockRequest())

      expect(mockHandleStripeRefund).not.toHaveBeenCalled()
    })

    it("returns 200 even when handleStripeRefund throws", async () => {
      mockConstructEvent.mockReturnValue(makeRefundEvent())
      mockHandleStripeRefund.mockRejectedValue(new Error("DB error"))
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      consoleSpy.mockRestore()
    })

    it("returns 200 when payment_intent is null", async () => {
      mockConstructEvent.mockReturnValue(makeRefundEvent({ payment_intent: null }))

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      expect(mockHandleStripeRefund).not.toHaveBeenCalled()
    })
  })

  // ── charge.dispute.created handling ─────────────────────────────────

  describe("charge.dispute.created handling", () => {
    const makeDisputeEvent = (overrides: Record<string, unknown> = {}) => ({
      type: "charge.dispute.created",
      data: {
        object: {
          charge: "ch_test",
          amount: 5000,
          evidence: { customer_email_address: "buyer@example.com" },
          ...overrides,
        },
      },
    })

    it("calls sendDisputeNotification with chargeId and amount", async () => {
      mockConstructEvent.mockReturnValue(makeDisputeEvent())

      await POST(makeMockRequest())

      expect(mockSendDisputeNotification).toHaveBeenCalledWith({
        chargeId: "ch_test",
        amount: 5000,
        customerEmail: "buyer@example.com",
      })
    })

    it("returns 200 even when sendDisputeNotification throws", async () => {
      mockConstructEvent.mockReturnValue(makeDisputeEvent())
      mockSendDisputeNotification.mockRejectedValue(new Error("Email error"))
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
      consoleSpy.mockRestore()
    })

    it("returns 200 for dispute event", async () => {
      mockConstructEvent.mockReturnValue(makeDisputeEvent())

      const response = await POST(makeMockRequest())

      expect(response.status).toBe(200)
    })
  })
})
