import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/repositories/order.repository", () => ({
  OrderRepository: {
    findByCustomerAndTimeWindow: vi.fn(),
  },
}))

vi.mock("@/repositories/customer.repository", () => ({
  CustomerRepository: {
    findByEmail: vi.fn(),
    findIdsByEmails: vi.fn(),
  },
}))

// LogRepository is imported by LoggingService so it must be mocked
vi.mock("@/repositories/log.repository", () => ({
  LogRepository: {
    findAllQuantityLogsInRange: vi.fn(),
    findAllPriceLogsInRange: vi.fn(),
  },
}))

import { LoggingService } from "@/services/logging.service"
import { OrderRepository } from "@/repositories/order.repository"
import { CustomerRepository } from "@/repositories/customer.repository"

const mockFindByWindow = OrderRepository.findByCustomerAndTimeWindow as ReturnType<typeof vi.fn>
const mockCustomerFindByEmail = CustomerRepository.findByEmail as ReturnType<typeof vi.fn>

const logTime = new Date("2026-03-05T10:00:00Z")

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-123",
    customerEmail: "jane@test.com",
    totalAmount: 1000,
    status: "COMPLETED",
    paymentMethod: "CARD",
    fulfillment: "SHIPPING",
    createdAt: new Date("2026-03-05T10:01:00Z"),
    items: [
      {
        id: "i1",
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

describe("LoggingService.getOrderForLedgerEntry — customer lookup", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns customerId when customer exists in CUSTOMER table", async () => {
    mockFindByWindow.mockResolvedValue(makeOrder({ customerEmail: "jane@test.com" }))
    mockCustomerFindByEmail.mockResolvedValue({ id: "cust-abc" })

    const result = await LoggingService.getOrderForLedgerEntry(
      "Lightning Bolt",
      logTime,
      "CUSTOMER: jane@test.com"
    )

    expect(result).not.toBeNull()
    expect(result!.customerId).toBe("cust-abc")
    expect(mockCustomerFindByEmail).toHaveBeenCalledWith("jane@test.com")
  })

  it("returns customerId=null for POS walk-in", async () => {
    mockFindByWindow.mockResolvedValue(makeOrder({ customerEmail: "walkin@pos.local" }))

    const result = await LoggingService.getOrderForLedgerEntry(
      "Lightning Bolt",
      logTime,
      "POS Sale"
    )

    expect(result).not.toBeNull()
    expect(result!.customerId).toBeNull()
    expect(mockCustomerFindByEmail).not.toHaveBeenCalled()
  })

  it("returns customerId=null when Customer.findUnique returns null", async () => {
    mockFindByWindow.mockResolvedValue(makeOrder({ customerEmail: "nobody@test.com" }))
    mockCustomerFindByEmail.mockResolvedValue(null)

    const result = await LoggingService.getOrderForLedgerEntry(
      "Lightning Bolt",
      logTime,
      "CUSTOMER: nobody@test.com"
    )

    expect(result).not.toBeNull()
    expect(result!.customerId).toBeNull()
  })

  it("returns customerId=null when Customer.findUnique throws (graceful error handling)", async () => {
    mockFindByWindow.mockResolvedValue(makeOrder({ customerEmail: "error@test.com" }))
    mockCustomerFindByEmail.mockRejectedValue(new Error("DB connection lost"))

    const result = await LoggingService.getOrderForLedgerEntry(
      "Lightning Bolt",
      logTime,
      "CUSTOMER: error@test.com"
    )

    expect(result).not.toBeNull()
    expect(result!.customerId).toBeNull()
  })

  it("returns null for non-sale sources (e.g. Admin Manual Update)", async () => {
    const result = await LoggingService.getOrderForLedgerEntry(
      "Lightning Bolt",
      logTime,
      "Admin Manual Update"
    )

    expect(result).toBeNull()
    expect(mockFindByWindow).not.toHaveBeenCalled()
  })

  it("correct STRIPE: prefix handling — email extracted correctly", async () => {
    mockFindByWindow.mockResolvedValue(makeOrder({ customerEmail: "stripe-user@example.com" }))
    mockCustomerFindByEmail.mockResolvedValue({ id: "cust-stripe-1" })

    const result = await LoggingService.getOrderForLedgerEntry(
      "Lightning Bolt",
      logTime,
      "STRIPE: stripe-user@example.com"
    )

    expect(result).not.toBeNull()
    expect(result!.customerId).toBe("cust-stripe-1")
    // Verify the email was extracted and used for the window search
    expect(mockFindByWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "stripe-user@example.com",
      })
    )
  })
})
