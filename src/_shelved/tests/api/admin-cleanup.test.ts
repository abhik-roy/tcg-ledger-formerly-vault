import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/headers (required at module level for Next.js routes)
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

vi.mock("@/lib/auth-guard", () => ({
  requireStaff: vi.fn(),
}))

vi.mock("@/services/order.service", () => ({
  OrderService: {
    cancelStalePendingOrders: vi.fn(),
  },
}))

import { POST } from "@/app/api/admin/cleanup/route"
import { requireStaff } from "@/lib/auth-guard"
import { OrderService } from "@/services/order.service"

const mockRequireStaff = requireStaff as ReturnType<typeof vi.fn>
const mockCancelStalePendingOrders = OrderService.cancelStalePendingOrders as ReturnType<
  typeof vi.fn
>

// Helper to create mock Request objects with a JSON body
const makeRequest = (body: object = {}) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as Request

// Helper to create mock Request objects where json() throws (simulates missing/invalid body)
const makeEmptyRequest = () =>
  ({ json: vi.fn().mockRejectedValue(new Error("no body")) }) as unknown as Request

describe("POST /api/admin/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when no session exists", async () => {
    mockRequireStaff.mockRejectedValue(new Error("Unauthorized"))

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.message).toBe("Unauthorized")
  })

  it("returns 401 when role is CUSTOMER", async () => {
    mockRequireStaff.mockRejectedValue(new Error("Unauthorized"))

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.message).toBe("Unauthorized")
  })

  it("returns 200 with cancelled count for ADMIN role", async () => {
    mockRequireStaff.mockResolvedValue(undefined)
    mockCancelStalePendingOrders.mockResolvedValue(3)

    const response = await POST(makeRequest({ olderThanMinutes: 30 }))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.cancelled).toBe(3)
  })

  it("returns 200 with cancelled count for TEAM role", async () => {
    mockRequireStaff.mockResolvedValue(undefined)
    mockCancelStalePendingOrders.mockResolvedValue(1)

    const response = await POST(makeRequest({ olderThanMinutes: 60 }))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.cancelled).toBe(1)
  })

  it("passes olderThanMinutes from body to cancelStalePendingOrders", async () => {
    mockRequireStaff.mockResolvedValue(undefined)
    mockCancelStalePendingOrders.mockResolvedValue(0)

    await POST(makeRequest({ olderThanMinutes: 60 }))

    expect(mockCancelStalePendingOrders).toHaveBeenCalledWith(60)
  })

  it("defaults to 30 minutes when olderThanMinutes is not provided", async () => {
    mockRequireStaff.mockResolvedValue(undefined)
    mockCancelStalePendingOrders.mockResolvedValue(0)

    await POST(makeEmptyRequest())

    expect(mockCancelStalePendingOrders).toHaveBeenCalledWith(30)
  })

  it("defaults to 30 minutes when olderThanMinutes is zero or negative", async () => {
    mockRequireStaff.mockResolvedValue(undefined)
    mockCancelStalePendingOrders.mockResolvedValue(0)

    await POST(makeRequest({ olderThanMinutes: 0 }))

    expect(mockCancelStalePendingOrders).toHaveBeenCalledWith(30)
  })

  it("returns a human-readable message in the response", async () => {
    mockRequireStaff.mockResolvedValue(undefined)
    mockCancelStalePendingOrders.mockResolvedValue(5)

    const response = await POST(makeRequest({ olderThanMinutes: 30 }))
    const json = await response.json()

    expect(json.message).toContain("5")
    expect(json.message).toContain("stale pending orders")
  })

  it("uses singular 'order' when exactly 1 order is cancelled", async () => {
    mockRequireStaff.mockResolvedValue(undefined)
    mockCancelStalePendingOrders.mockResolvedValue(1)

    const response = await POST(makeRequest())
    const json = await response.json()

    expect(json.message).toBe("Cancelled 1 stale pending order.")
  })

  it("returns 500 with message when cancelStalePendingOrders throws", async () => {
    mockRequireStaff.mockResolvedValue(undefined)
    mockCancelStalePendingOrders.mockRejectedValue(new Error("DB connection lost"))

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.message).toBe("Internal server error")
  })
})
