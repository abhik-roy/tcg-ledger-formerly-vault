import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the service
// ---------------------------------------------------------------------------

vi.mock("@/repositories/customer.repository", () => ({
  CustomerRepository: {
    findOrdersByCustomerPaginated: vi.fn(),
    findById: vi.fn(),
    updatePassword: vi.fn(),
    // Existing methods (needed because they're referenced at module level)
    findManyPaginated: vi.fn(),
    findOrdersByCustomer: vi.fn(),
    count: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock("@/repositories/order.repository", () => ({
  OrderRepository: {
    aggregateRevenue: vi.fn(),
    countNonCancelled: vi.fn(),
  },
}))

vi.mock("@/repositories/log.repository", () => ({
  LogRepository: {
    findForCustomerOrderItem: vi.fn(),
  },
}))

vi.mock("@/mappers/customer.mapper", () => ({
  toCustomerWithStatsDTOs: vi.fn(),
}))

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

import { CustomerService } from "@/services/customer.service"
import { CustomerRepository } from "@/repositories/customer.repository"
import bcrypt from "bcryptjs"

const mockFindOrdersPaginated = CustomerRepository.findOrdersByCustomerPaginated as ReturnType<
  typeof vi.fn
>
const mockFindById = CustomerRepository.findById as ReturnType<typeof vi.fn>
const mockUpdatePassword = CustomerRepository.updatePassword as ReturnType<typeof vi.fn>
const mockBcryptCompare = bcrypt.compare as ReturnType<typeof vi.fn>
const mockBcryptHash = bcrypt.hash as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Tests: getMyOrders
// ---------------------------------------------------------------------------

describe("CustomerService.getMyOrders", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns paginated orders with correct pagination math", async () => {
    const mockOrders = [
      { id: "order-1", totalAmount: 5000, items: [] },
      { id: "order-2", totalAmount: 3000, items: [] },
    ]
    mockFindOrdersPaginated.mockResolvedValue({ orders: mockOrders, total: 15 })

    const result = await CustomerService.getMyOrders("cust-1", "buyer@test.com", 2, 10)

    expect(mockFindOrdersPaginated).toHaveBeenCalledWith("cust-1", "buyer@test.com", 10, 10)
    expect(result.orders).toEqual(mockOrders)
    expect(result.total).toBe(15)
    expect(result.totalPages).toBe(2) // ceil(15/10)
  })

  it("defaults to page 1 and limit 10", async () => {
    mockFindOrdersPaginated.mockResolvedValue({ orders: [], total: 0 })

    const result = await CustomerService.getMyOrders("cust-1", "buyer@test.com")

    expect(mockFindOrdersPaginated).toHaveBeenCalledWith("cust-1", "buyer@test.com", 0, 10)
    expect(result.totalPages).toBe(0)
  })

  it("returns totalPages = 1 for exactly 10 orders with limit 10", async () => {
    mockFindOrdersPaginated.mockResolvedValue({ orders: [], total: 10 })

    const result = await CustomerService.getMyOrders("cust-1", "buyer@test.com", 1, 10)

    expect(result.totalPages).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Tests: changePassword
// ---------------------------------------------------------------------------

describe("CustomerService.changePassword", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when customer is not found", async () => {
    mockFindById.mockResolvedValue(null)

    const result = await CustomerService.changePassword("cust-1", "oldpass", "NewPass1!")

    expect(result).toEqual({ success: false, error: "Customer not found" })
    expect(mockBcryptCompare).not.toHaveBeenCalled()
  })

  it("returns error when current password is wrong", async () => {
    mockFindById.mockResolvedValue({ id: "cust-1", password: "hashed" })
    mockBcryptCompare.mockResolvedValue(false)

    const result = await CustomerService.changePassword("cust-1", "wrongpass", "NewPass1!")

    expect(result).toEqual({ success: false, error: "Current password is incorrect" })
    expect(mockBcryptHash).not.toHaveBeenCalled()
  })

  it("returns error when new password is too short", async () => {
    mockFindById.mockResolvedValue({ id: "cust-1", password: "hashed" })
    mockBcryptCompare.mockResolvedValue(true)

    const result = await CustomerService.changePassword("cust-1", "correct", "short1")

    expect(result).toEqual({
      success: false,
      error: "Password must be between 8 and 128 characters",
    })
  })

  it("returns error when new password is too long", async () => {
    mockFindById.mockResolvedValue({ id: "cust-1", password: "hashed" })
    mockBcryptCompare.mockResolvedValue(true)

    const longPassword = "a".repeat(129) + "1"

    const result = await CustomerService.changePassword("cust-1", "correct", longPassword)

    expect(result).toEqual({
      success: false,
      error: "Password must be between 8 and 128 characters",
    })
  })

  it("returns error when new password lacks number or special char", async () => {
    mockFindById.mockResolvedValue({ id: "cust-1", password: "hashed" })
    mockBcryptCompare.mockResolvedValue(true)

    const result = await CustomerService.changePassword("cust-1", "correct", "allLettersOnly")

    expect(result).toEqual({
      success: false,
      error: "Password must contain at least one number or special character",
    })
  })

  it("hashes and saves password on success", async () => {
    mockFindById.mockResolvedValue({ id: "cust-1", password: "old-hashed" })
    mockBcryptCompare.mockResolvedValue(true)
    mockBcryptHash.mockResolvedValue("new-hashed")
    mockUpdatePassword.mockResolvedValue({})

    const result = await CustomerService.changePassword("cust-1", "correct", "NewPass1!")

    expect(result).toEqual({ success: true })
    expect(mockBcryptHash).toHaveBeenCalledWith("NewPass1!", 10)
    expect(mockUpdatePassword).toHaveBeenCalledWith("cust-1", "new-hashed")
  })

  it("accepts password with special character (no number)", async () => {
    mockFindById.mockResolvedValue({ id: "cust-1", password: "hashed" })
    mockBcryptCompare.mockResolvedValue(true)
    mockBcryptHash.mockResolvedValue("new-hashed")
    mockUpdatePassword.mockResolvedValue({})

    const result = await CustomerService.changePassword("cust-1", "correct", "ValidPass!")

    expect(result).toEqual({ success: true })
  })

  it("accepts password with number (no special character)", async () => {
    mockFindById.mockResolvedValue({ id: "cust-1", password: "hashed" })
    mockBcryptCompare.mockResolvedValue(true)
    mockBcryptHash.mockResolvedValue("new-hashed")
    mockUpdatePassword.mockResolvedValue({})

    const result = await CustomerService.changePassword("cust-1", "correct", "ValidPass8")

    expect(result).toEqual({ success: true })
  })
})
