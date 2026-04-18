import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/services/order.service", () => ({
  OrderService: {
    bulkFulfillOrders: vi.fn(),
  },
}))

vi.mock("@/lib/auth-guard", () => ({
  requireStaff: vi.fn().mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { bulkFulfillAction } from "@/app/actions/order"
import { OrderService } from "@/services/order.service"
import { requireStaff } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"

const mockBulkFulfill = OrderService.bulkFulfillOrders as ReturnType<typeof vi.fn>
const mockRequireStaff = requireStaff as ReturnType<typeof vi.fn>
const mockRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>

describe("bulkFulfillAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireStaff.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
  })

  // ── 1. Empty orderIds ─────────────────────────────────────────────────

  it("returns failure when orderIds is empty without calling the service", async () => {
    const result = await bulkFulfillAction([])

    expect(result).toEqual({ success: false, error: "No order IDs provided" })
    expect(mockBulkFulfill).not.toHaveBeenCalled()
  })

  // ── 2. Valid ids — delegates to service ───────────────────────────────

  it("calls OrderService.bulkFulfillOrders and returns succeeded and failed", async () => {
    mockBulkFulfill.mockResolvedValue({
      succeeded: ["o1", "o2"],
      failed: [{ id: "o3", error: "not found" }],
    })

    const result = await bulkFulfillAction(["o1", "o2", "o3"])

    expect(result.success).toBe(true)
    expect(result.succeeded).toEqual(["o1", "o2"])
    expect(result.failed).toEqual([{ id: "o3", error: "not found" }])
  })

  // ── 3. Service throws ────────────────────────────────────────────────

  it("returns failure when the service throws", async () => {
    mockBulkFulfill.mockRejectedValue(new Error("Database connection lost"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await bulkFulfillAction(["o1"])

    expect(result.success).toBe(false)
    expect(result.error).toBe("Failed to bulk fulfill orders")
  })

  // ── 4. revalidatePath called on success ──────────────────────────────

  it("calls revalidatePath('/admin/orders') after successful fulfillment", async () => {
    mockBulkFulfill.mockResolvedValue({ succeeded: ["o1"], failed: [] })

    await bulkFulfillAction(["o1"])

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/orders")
  })

  it("does not call revalidatePath when the service throws", async () => {
    mockBulkFulfill.mockRejectedValue(new Error("fail"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    await bulkFulfillAction(["o1"])

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ── 5. Auth guard called ─────────────────────────────────────────────

  it("calls requireStaff before processing", async () => {
    mockBulkFulfill.mockResolvedValue({ succeeded: [], failed: [] })

    await bulkFulfillAction(["o1"])

    expect(mockRequireStaff).toHaveBeenCalledOnce()
  })

  it("returns unauthorized error when requireStaff throws", async () => {
    mockRequireStaff.mockRejectedValue(new Error("Unauthorized"))

    const result = await bulkFulfillAction(["o1"])

    expect(result).toEqual({ success: false, error: "Unauthorized" })
    expect(mockBulkFulfill).not.toHaveBeenCalled()
  })
})
