/**
 * @file inventory-validation.test.ts
 * @description Unit tests for server-side input validation in inventory actions (DEV-16)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth-guard", () => ({
  requireStaff: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/services/inventory.service", () => ({
  InventoryService: {
    updateStock: vi.fn().mockResolvedValue(undefined),
    addItemFromCSV: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (_fn: unknown) => _fn,
}))

import { updateQuickStock, importInventoryAction } from "@/app/actions/inventory"
import { InventoryService } from "@/services/inventory.service"

const mockUpdateStock = InventoryService.updateStock as ReturnType<typeof vi.fn>
const mockAddItemFromCSV = InventoryService.addItemFromCSV as ReturnType<typeof vi.fn>

describe("updateQuickStock — bounds validation (DEV-16)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns success with valid qty and price", async () => {
    const result = await updateQuickStock(1, 10, 500)
    expect(result.success).toBe(true)
    expect(mockUpdateStock).toHaveBeenCalledWith(1, 10, 500)
  })

  it("allows qty=0 (zeroing out stock is valid)", async () => {
    const result = await updateQuickStock(1, 0, 500)
    expect(result.success).toBe(true)
  })

  it("allows price=0 (free items are valid)", async () => {
    const result = await updateQuickStock(1, 5, 0)
    expect(result.success).toBe(true)
  })

  it("rejects negative quantity", async () => {
    const result = await updateQuickStock(1, -1, 500)
    expect(result.success).toBe(false)
    expect(result.error).toContain("non-negative")
    expect(mockUpdateStock).not.toHaveBeenCalled()
  })

  it("rejects negative price", async () => {
    const result = await updateQuickStock(1, 10, -1)
    expect(result.success).toBe(false)
    expect(result.error).toContain("non-negative")
    expect(mockUpdateStock).not.toHaveBeenCalled()
  })

  it("rejects fractional quantity", async () => {
    const result = await updateQuickStock(1, 1.5, 500)
    expect(result.success).toBe(false)
    expect(result.error).toContain("integer")
    expect(mockUpdateStock).not.toHaveBeenCalled()
  })

  it("rejects NaN price", async () => {
    const result = await updateQuickStock(1, 5, NaN)
    expect(result.success).toBe(false)
    expect(mockUpdateStock).not.toHaveBeenCalled()
  })

  it("rejects Infinity price", async () => {
    const result = await updateQuickStock(1, 5, Infinity)
    expect(result.success).toBe(false)
    expect(mockUpdateStock).not.toHaveBeenCalled()
  })
})

describe("importInventoryAction — schema validation (DEV-16)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when rows is not an array", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await importInventoryAction("not-an-array" as any)
    expect(result.success).toBe(false)
    expect(result.error).toContain("array")
  })

  it("skips rows with no card name (no error counted)", async () => {
    const result = await importInventoryAction([{ Quantity: "1", "Price (USD)": "1.00" }])
    expect(result.success).toBe(true)
    // Row skipped silently, not counted as error
    expect(mockAddItemFromCSV).not.toHaveBeenCalled()
  })

  it("skips rows with quantity <= 0", async () => {
    const result = await importInventoryAction([
      { "Card Name": "Black Lotus", Quantity: "0", "Price (USD)": "10.00" },
    ])
    expect(result.success).toBe(true)
    expect(mockAddItemFromCSV).not.toHaveBeenCalled()
  })

  it("rejects rows with negative price (counts as errorCount)", async () => {
    const result = await importInventoryAction([
      { "Card Name": "Black Lotus", Quantity: "1", "Price (USD)": "-5.00" },
    ])
    expect(result.success).toBe(true)
    expect((result as { successCount?: number; errorCount?: number }).errorCount).toBe(1)
    expect(mockAddItemFromCSV).not.toHaveBeenCalled()
  })

  it("successfully imports valid rows", async () => {
    const result = await importInventoryAction([
      {
        "Card Name": "Black Lotus",
        Quantity: "2",
        "Price (USD)": "10.00",
        Condition: "NM",
        Finish: "nonfoil",
      },
    ])
    expect(result.success).toBe(true)
    expect((result as { successCount?: number }).successCount).toBe(1)
    expect(mockAddItemFromCSV).toHaveBeenCalledWith(
      "Black Lotus",
      "",
      expect.objectContaining({ quantity: 2, price: 1000 })
    )
  })

  it("handles empty rows array gracefully", async () => {
    const result = await importInventoryAction([])
    expect(result.success).toBe(true)
    expect((result as { successCount?: number }).successCount).toBe(0)
  })
})
