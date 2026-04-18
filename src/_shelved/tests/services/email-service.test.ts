import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mock nodemailer — vi.hoisted ensures the mock fn is available when
// vi.mock's factory (which is hoisted) executes.
// ---------------------------------------------------------------------------

const { mockSendMail } = vi.hoisted(() => {
  const mockSendMail = vi.fn()
  return { mockSendMail }
})

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}))

// Mock @react-email/render to return a predictable HTML string
vi.mock("@react-email/render", () => ({
  render: vi.fn(() => Promise.resolve("<html>rendered</html>")),
}))

import { EmailService } from "@/services/email.service"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BUYLIST_HIT_DATA = {
  cardName: "Black Lotus",
  setName: "Alpha",
  quantity: 2,
  condition: "NM",
  buyPrice: 500,
  image: "https://example.com/lotus.jpg",
}

const ORDER_CONFIRMATION_DATA = {
  id: "clxyz1234abcd5678",
  customerEmail: "customer@example.com",
  subtotal: 5000,
  tax: 400,
  shippingCost: 0,
  totalAmount: 5400,
  fulfillment: "PICKUP",
  paymentMethod: "PAY_IN_STORE",
  addressLine1: null,
  city: null,
  postalCode: null,
  createdAt: new Date("2026-03-06"),
  items: [
    {
      name: "Black Lotus",
      setName: "Alpha",
      condition: "NM",
      finish: "nonfoil",
      price: 5000,
      quantity: 1,
    },
  ],
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("EmailService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODEMAILER_USER = "test@example.com"
    process.env.NODEMAILER_FROM = "from@example.com"
    process.env.ADMIN_EMAIL = "admin@example.com"
  })

  describe("sendBuylistHit", () => {
    it("calls transporter.sendMail with correct subject", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "abc" })
      await EmailService.sendBuylistHit(BUYLIST_HIT_DATA)

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.subject).toBe("Buylist Hit: Black Lotus")
    })

    it("sends to the ADMIN_EMAIL env var", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "abc" })
      await EmailService.sendBuylistHit(BUYLIST_HIT_DATA)

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.to).toBe("admin@example.com")
    })

    it("uses NODEMAILER_FROM for the from field", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "abc" })
      await EmailService.sendBuylistHit(BUYLIST_HIT_DATA)

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.from).toContain("from@example.com")
      expect(mailOptions.from).toContain("TCG Vault System")
    })

    it("includes rendered HTML in the html field", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "abc" })
      await EmailService.sendBuylistHit(BUYLIST_HIT_DATA)

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.html).toBe("<html>rendered</html>")
    })

    it("does not throw when sendMail rejects (fire-and-forget)", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("SMTP down"))

      // Should resolve without throwing
      await expect(EmailService.sendBuylistHit(BUYLIST_HIT_DATA)).resolves.toBeUndefined()
    })

    it("logs error to console when sendMail fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockSendMail.mockRejectedValueOnce(new Error("SMTP down"))

      await EmailService.sendBuylistHit(BUYLIST_HIT_DATA)

      expect(consoleSpy).toHaveBeenCalledWith("Failed to send email:", expect.any(Error))
      consoleSpy.mockRestore()
    })

    it("works without an image (optional field)", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "abc" })
      const { image, ...dataWithoutImage } = BUYLIST_HIT_DATA
      await EmailService.sendBuylistHit(dataWithoutImage)

      expect(mockSendMail).toHaveBeenCalledTimes(1)
    })
  })

  // ── sendOrderConfirmation ─────────────────────────────────────────────

  describe("sendOrderConfirmation", () => {
    it("sends email to order.customerEmail", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "oc-1" })

      await EmailService.sendOrderConfirmation(ORDER_CONFIRMATION_DATA)

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.to).toBe("customer@example.com")
    })

    it("subject contains the last 8 chars of orderId uppercased", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "oc-2" })

      await EmailService.sendOrderConfirmation(ORDER_CONFIRMATION_DATA)

      const mailOptions = mockSendMail.mock.calls[0][0]
      // Last 8 chars of "clxyz1234abcd5678" => "ABCD5678"
      expect(mailOptions.subject).toContain("ABCD5678")
    })

    it("uses NODEMAILER_FROM for the from field", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "oc-3" })

      await EmailService.sendOrderConfirmation(ORDER_CONFIRMATION_DATA)

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.from).toContain("from@example.com")
    })

    it("includes rendered HTML in the html field", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "oc-4" })

      await EmailService.sendOrderConfirmation(ORDER_CONFIRMATION_DATA)

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.html).toBe("<html>rendered</html>")
    })

    it("does not throw when sendMail rejects (fire-and-forget)", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("SMTP down"))

      await expect(
        EmailService.sendOrderConfirmation(ORDER_CONFIRMATION_DATA)
      ).resolves.toBeUndefined()
    })

    it("silently skips when customerEmail is empty string", async () => {
      await EmailService.sendOrderConfirmation({
        ...ORDER_CONFIRMATION_DATA,
        customerEmail: "",
      })

      expect(mockSendMail).not.toHaveBeenCalled()
    })

    it("silently skips when customerEmail is falsy", async () => {
      await EmailService.sendOrderConfirmation({
        ...ORDER_CONFIRMATION_DATA,
        customerEmail: undefined as unknown as string,
      })

      expect(mockSendMail).not.toHaveBeenCalled()
    })

    it("works with PICKUP fulfillment", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "oc-pickup" })

      await EmailService.sendOrderConfirmation({
        ...ORDER_CONFIRMATION_DATA,
        fulfillment: "PICKUP",
      })

      expect(mockSendMail).toHaveBeenCalledTimes(1)
    })

    it("works with SHIPPING fulfillment and address fields", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "oc-shipping" })

      await EmailService.sendOrderConfirmation({
        ...ORDER_CONFIRMATION_DATA,
        fulfillment: "SHIPPING",
        shippingCost: 499,
        addressLine1: "123 Main St",
        city: "Portland",
        postalCode: "97201",
      })

      expect(mockSendMail).toHaveBeenCalledTimes(1)
    })
  })
})
