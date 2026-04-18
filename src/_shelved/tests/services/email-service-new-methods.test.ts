import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks (must be declared before imports) ─────────────────────────────

const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
}))

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}))

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>test</html>"),
}))

vi.mock("@/components/emails/FulfillmentNotificationEmail", () => ({
  default: vi.fn(() => null),
}))
vi.mock("@/components/emails/WelcomeEmail", () => ({
  default: vi.fn(() => null),
}))
vi.mock("@/components/emails/PasswordResetEmail", () => ({
  default: vi.fn(() => null),
}))
// Also mock the other email components that are imported at module level
vi.mock("@/components/emails/BuylistHitEmail", () => ({
  default: vi.fn(() => null),
}))
vi.mock("@/components/emails/OrderConfirmationEmail", () => ({
  default: vi.fn(() => null),
}))
vi.mock("@/components/emails/OrderCancellationEmail", () => ({
  default: vi.fn(() => null),
}))

import { EmailService } from "@/services/email.service"

// ── Helpers ─────────────────────────────────────────────────────────────

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "cuid_order_123456789",
    customerEmail: "customer@example.com",
    fulfillment: "SHIPPING",
    trackingNumber: "TRACK123",
    carrier: "USPS",
    items: [
      {
        name: "Black Lotus",
        setName: "Alpha",
        condition: "NM",
        finish: "nonfoil",
        price: 100000,
        quantity: 1,
      },
    ],
    totalAmount: 100000,
    addressLine1: "123 Main St",
    city: "Springfield",
    state: "IL",
    postalCode: "62701",
    ...overrides,
  }
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("EmailService — new methods (DEV-10/11)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── sendFulfillmentNotification ─────────────────────────────────────

  describe("sendFulfillmentNotification", () => {
    it("sends email with 'has shipped' subject for SHIPPING orders", async () => {
      const order = makeOrder({ fulfillment: "SHIPPING" })

      await EmailService.sendFulfillmentNotification(order)

      expect(mockSendMail).toHaveBeenCalledOnce()
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.to).toBe("customer@example.com")
      expect(callArgs.subject).toContain("has shipped")
    })

    it("sends email with 'ready for pickup' subject for PICKUP orders", async () => {
      const order = makeOrder({ fulfillment: "PICKUP" })

      await EmailService.sendFulfillmentNotification(order)

      expect(mockSendMail).toHaveBeenCalledOnce()
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.to).toBe("customer@example.com")
      expect(callArgs.subject).toContain("ready for pickup")
    })

    it("returns without sending when customerEmail is empty", async () => {
      const order = makeOrder({ customerEmail: "" })

      await EmailService.sendFulfillmentNotification(order)

      expect(mockSendMail).not.toHaveBeenCalled()
    })

    it("does NOT throw when sendMail rejects — resolves silently", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("SMTP down"))
      const order = makeOrder()

      // Should not throw
      await expect(EmailService.sendFulfillmentNotification(order)).resolves.toBeUndefined()
    })
  })

  // ── sendWelcomeEmail ────────────────────────────────────────────────

  describe("sendWelcomeEmail", () => {
    it("sends to customer email with subject containing 'Welcome'", async () => {
      const customer = { email: "new@example.com", firstName: "Jane", lastName: "Doe" }

      await EmailService.sendWelcomeEmail(customer)

      expect(mockSendMail).toHaveBeenCalledOnce()
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.to).toBe("new@example.com")
      expect(callArgs.subject).toContain("Welcome")
    })

    it("returns without sending when email is empty", async () => {
      const customer = { email: "", firstName: "Jane" }

      await EmailService.sendWelcomeEmail(customer)

      expect(mockSendMail).not.toHaveBeenCalled()
    })

    it("does NOT throw when sendMail rejects", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("SMTP down"))
      const customer = { email: "new@example.com" }

      await expect(EmailService.sendWelcomeEmail(customer)).resolves.toBeUndefined()
    })
  })

  // ── sendPasswordResetEmail ──────────────────────────────────────────

  describe("sendPasswordResetEmail", () => {
    it("sends to the provided email with subject 'Reset your password'", async () => {
      await EmailService.sendPasswordResetEmail("user@example.com", "token123")

      expect(mockSendMail).toHaveBeenCalledOnce()
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.to).toBe("user@example.com")
      expect(callArgs.subject).toBe("Reset your password")
    })

    it("calls render with PasswordResetEmail component props", async () => {
      const { render } = await import("@react-email/render")
      const mockRender = render as ReturnType<typeof vi.fn>

      await EmailService.sendPasswordResetEmail("user@example.com", "token123")

      expect(mockRender).toHaveBeenCalledOnce()
    })

    it("does NOT throw when sendMail rejects", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("SMTP down"))

      await expect(
        EmailService.sendPasswordResetEmail("user@example.com", "token123")
      ).resolves.toBeUndefined()
    })
  })
})
