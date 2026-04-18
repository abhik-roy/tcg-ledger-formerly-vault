import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/services/customer.service", () => ({
  CustomerService: {
    getMyOrders: vi.fn(),
    changePassword: vi.fn(),
  },
}))

import { getMyOrders, changePassword } from "@/app/actions/profile"
import { auth } from "@/lib/auth"
import { CustomerService } from "@/services/customer.service"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockGetMyOrders = CustomerService.getMyOrders as ReturnType<typeof vi.fn>
const mockChangePassword = CustomerService.changePassword as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const customerSession = {
  user: {
    id: "cust-1",
    email: "buyer@example.com",
    name: "Test Buyer",
    role: "CUSTOMER",
  },
}

const adminSession = {
  user: {
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin",
    role: "ADMIN",
  },
}

// ---------------------------------------------------------------------------
// Tests: getMyOrders
// ---------------------------------------------------------------------------

describe("getMyOrders", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns paginated orders for authenticated customer", async () => {
    mockAuth.mockResolvedValue(customerSession)
    const mockResult = {
      orders: [{ id: "order-1", totalAmount: 5000 }],
      total: 1,
      totalPages: 1,
    }
    mockGetMyOrders.mockResolvedValue(mockResult)

    const result = await getMyOrders(1)

    expect(result).toEqual(mockResult)
    expect(mockGetMyOrders).toHaveBeenCalledWith("cust-1", "buyer@example.com", 1, 10)
  })

  it("passes page parameter correctly", async () => {
    mockAuth.mockResolvedValue(customerSession)
    mockGetMyOrders.mockResolvedValue({ orders: [], total: 0, totalPages: 0 })

    await getMyOrders(3)

    expect(mockGetMyOrders).toHaveBeenCalledWith("cust-1", "buyer@example.com", 3, 10)
  })

  it("throws Unauthorized for unauthenticated user", async () => {
    mockAuth.mockResolvedValue(null)

    await expect(getMyOrders(1)).rejects.toThrow("Unauthorized")
    expect(mockGetMyOrders).not.toHaveBeenCalled()
  })

  it("throws Unauthorized for admin user", async () => {
    mockAuth.mockResolvedValue(adminSession)

    await expect(getMyOrders(1)).rejects.toThrow("Unauthorized")
    expect(mockGetMyOrders).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Tests: changePassword
// ---------------------------------------------------------------------------

describe("changePassword", () => {
  beforeEach(() => vi.clearAllMocks())

  it("delegates to CustomerService.changePassword for authenticated customer", async () => {
    mockAuth.mockResolvedValue(customerSession)
    mockChangePassword.mockResolvedValue({ success: true })

    const result = await changePassword("oldpass", "NewPass1!")

    expect(result).toEqual({ success: true })
    expect(mockChangePassword).toHaveBeenCalledWith("cust-1", "oldpass", "NewPass1!")
  })

  it("returns error from service when current password is wrong", async () => {
    mockAuth.mockResolvedValue(customerSession)
    mockChangePassword.mockResolvedValue({
      success: false,
      error: "Current password is incorrect",
    })

    const result = await changePassword("wrongpass", "NewPass1!")

    expect(result).toEqual({ success: false, error: "Current password is incorrect" })
  })

  it("throws Unauthorized for unauthenticated user", async () => {
    mockAuth.mockResolvedValue(null)

    await expect(changePassword("old", "new")).rejects.toThrow("Unauthorized")
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it("throws Unauthorized for non-customer role", async () => {
    mockAuth.mockResolvedValue(adminSession)

    await expect(changePassword("old", "new")).rejects.toThrow("Unauthorized")
    expect(mockChangePassword).not.toHaveBeenCalled()
  })
})
