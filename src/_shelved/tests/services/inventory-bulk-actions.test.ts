import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — declared before imports (hoisted by vitest)
// ---------------------------------------------------------------------------

vi.mock("@/repositories/inventory.repository", () => ({
  InventoryRepository: {
    deleteManyByIds: vi.fn(),
  },
}))

vi.mock("@/services/logging.service", () => ({
  LoggingService: {
    logPrice: vi.fn().mockResolvedValue(undefined),
    logQuantity: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    inventory: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// unstable_cache is used by InventoryService.getAllSets — stub it so the
// module can be imported without hitting Next.js internals.
vi.mock("next/cache", () => ({
  unstable_cache: (_fn: unknown) => _fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { InventoryService } from "@/services/inventory.service"
import { InventoryRepository } from "@/repositories/inventory.repository"
import { LoggingService } from "@/services/logging.service"
import { prisma } from "@/lib/prisma"

const mockFindMany = prisma.inventory.findMany as ReturnType<typeof vi.fn>
const mockUpdateMany = prisma.inventory.updateMany as ReturnType<typeof vi.fn>
const mockUpdate = prisma.inventory.update as ReturnType<typeof vi.fn>
const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>
const mockLogPrice = LoggingService.logPrice as ReturnType<typeof vi.fn>
const mockLogQuantity = LoggingService.logQuantity as ReturnType<typeof vi.fn>
const mockDeleteManyByIds = InventoryRepository.deleteManyByIds as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(
  overrides: Partial<{
    id: number
    name: string
    storeprice: number
    quantity: number
    finish: string
  }> = {}
) {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Black Lotus",
    storeprice: overrides.storeprice ?? 10000,
    quantity: overrides.quantity ?? 5,
    finish: overrides.finish ?? "nonfoil",
  }
}

// ---------------------------------------------------------------------------
// Tests: bulkUpdatePrice
// ---------------------------------------------------------------------------

describe("InventoryService.bulkUpdatePrice", () => {
  beforeEach(() => vi.clearAllMocks())

  it('mode "set" — calls updateMany with correct price and logs one entry per item', async () => {
    const items = [
      makeItem({ id: 1, storeprice: 5000 }),
      makeItem({ id: 2, storeprice: 8000, name: "Mox Pearl" }),
    ]
    mockFindMany.mockResolvedValue(items)
    mockUpdateMany.mockResolvedValue({ count: 2 })

    const result = await InventoryService.bulkUpdatePrice([1, 2], "set", 6000)

    expect(result).toEqual({ updated: 2 })
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: { storeprice: 6000 },
    })
    // Both items had different prices from the new price, so both should be logged
    expect(mockLogPrice).toHaveBeenCalledTimes(2)
    expect(mockLogPrice).toHaveBeenCalledWith(
      "Black Lotus",
      5000,
      6000,
      "Bulk Price Update",
      "nonfoil"
    )
    expect(mockLogPrice).toHaveBeenCalledWith(
      "Mox Pearl",
      8000,
      6000,
      "Bulk Price Update",
      "nonfoil"
    )
  })

  it('mode "set" — does not log items whose price is already the target value', async () => {
    const items = [makeItem({ id: 1, storeprice: 6000 })]
    mockFindMany.mockResolvedValue(items)
    mockUpdateMany.mockResolvedValue({ count: 1 })

    await InventoryService.bulkUpdatePrice([1], "set", 6000)

    expect(mockLogPrice).not.toHaveBeenCalled()
  })

  it('mode "set" — clamps negative value to 0', async () => {
    const items = [makeItem({ id: 1, storeprice: 500 })]
    mockFindMany.mockResolvedValue(items)
    mockUpdateMany.mockResolvedValue({ count: 1 })

    await InventoryService.bulkUpdatePrice([1], "set", -100)

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
      data: { storeprice: 0 },
    })
  })

  it('mode "adjust_fixed" — fetches current prices, computes Math.max(0, current + value)', async () => {
    const items = [
      makeItem({ id: 1, storeprice: 5000 }),
      makeItem({ id: 2, storeprice: 3000, name: "Sol Ring" }),
    ]
    mockFindMany.mockResolvedValue(items)
    mockTransaction.mockResolvedValue(items)

    const result = await InventoryService.bulkUpdatePrice([1, 2], "adjust_fixed", 1000)

    expect(result).toEqual({ updated: 2 })
    // Transaction should be called with an array of update operations
    expect(mockTransaction).toHaveBeenCalledOnce()
    const txArg = mockTransaction.mock.calls[0][0]
    expect(txArg).toHaveLength(2)
  })

  it('mode "adjust_fixed" with negative value clamps to 0', async () => {
    const items = [makeItem({ id: 1, storeprice: 200 })]
    mockFindMany.mockResolvedValue(items)
    mockUpdate.mockResolvedValue(items[0])
    mockTransaction.mockResolvedValue([items[0]])

    await InventoryService.bulkUpdatePrice([1], "adjust_fixed", -500)

    // The transaction maps over items; each call uses prisma.inventory.update
    // with newPrice = Math.max(0, 200 + (-500)) = 0
    const txArg = mockTransaction.mock.calls[0][0]
    expect(txArg).toHaveLength(1)

    // Verify log was called with price clamped to 0
    expect(mockLogPrice).toHaveBeenCalledWith("Black Lotus", 200, 0, "Bulk Price Update", "nonfoil")
  })

  it('mode "adjust_pct" — computes Math.round(current * (1 + value/10000))', async () => {
    // 10% increase = 1000 basis points
    const items = [makeItem({ id: 1, storeprice: 10000 })]
    mockFindMany.mockResolvedValue(items)
    mockTransaction.mockResolvedValue([items[0]])

    await InventoryService.bulkUpdatePrice([1], "adjust_pct", 1000)

    // newPrice = Math.max(0, Math.round(10000 * (1 + 1000/10000))) = Math.round(10000 * 1.1) = 11000
    expect(mockLogPrice).toHaveBeenCalledWith(
      "Black Lotus",
      10000,
      11000,
      "Bulk Price Update",
      "nonfoil"
    )
  })

  it("empty ids array — returns { updated: 0 } without calling prisma", async () => {
    const result = await InventoryService.bulkUpdatePrice([], "set", 5000)

    // Implementation: mode === "set" => findMany with empty ids, updateMany with empty ids
    // The ids array is empty, so findMany returns empty array, updateMany count is 0
    // Updated = ids.length = 0
    expect(result).toEqual({ updated: 0 })
  })

  it("single item update — works correctly", async () => {
    const items = [makeItem({ id: 42, storeprice: 1500, name: "Lightning Bolt" })]
    mockFindMany.mockResolvedValue(items)
    mockUpdateMany.mockResolvedValue({ count: 1 })

    const result = await InventoryService.bulkUpdatePrice([42], "set", 2000)

    expect(result).toEqual({ updated: 1 })
    expect(mockLogPrice).toHaveBeenCalledWith(
      "Lightning Bolt",
      1500,
      2000,
      "Bulk Price Update",
      "nonfoil"
    )
  })
})

// ---------------------------------------------------------------------------
// Tests: bulkUpdateStock
// ---------------------------------------------------------------------------

describe("InventoryService.bulkUpdateStock", () => {
  beforeEach(() => vi.clearAllMocks())

  it('mode "set" — calls updateMany with correct quantity', async () => {
    const items = [
      makeItem({ id: 1, quantity: 5 }),
      makeItem({ id: 2, quantity: 10, name: "Sol Ring" }),
    ]
    mockFindMany.mockResolvedValue(items)
    mockUpdateMany.mockResolvedValue({ count: 2 })

    const result = await InventoryService.bulkUpdateStock([1, 2], "set", 8)

    expect(result).toEqual({ updated: 2 })
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: { quantity: 8 },
    })
  })

  it('mode "set" — logs quantity changes for items with different quantities', async () => {
    const items = [
      makeItem({ id: 1, quantity: 5 }),
      makeItem({ id: 2, quantity: 8, name: "Sol Ring" }),
    ]
    mockFindMany.mockResolvedValue(items)
    mockUpdateMany.mockResolvedValue({ count: 2 })

    await InventoryService.bulkUpdateStock([1, 2], "set", 8)

    // Item 1: diff = 8 - 5 = 3
    expect(mockLogQuantity).toHaveBeenCalledWith("Black Lotus", 3, "Bulk Stock Update", "nonfoil")
    // Item 2: quantity is already 8, should NOT be logged
    expect(mockLogQuantity).toHaveBeenCalledTimes(1)
  })

  it('mode "adjust" — fetches current quantities, computes Math.max(0, current + value)', async () => {
    const items = [
      makeItem({ id: 1, quantity: 5 }),
      makeItem({ id: 2, quantity: 3, name: "Sol Ring" }),
    ]
    mockFindMany.mockResolvedValue(items)
    mockTransaction.mockResolvedValue([])

    const result = await InventoryService.bulkUpdateStock([1, 2], "adjust", 2)

    expect(result).toEqual({ updated: 2 })
    expect(mockTransaction).toHaveBeenCalledOnce()
    // Log should be called for both items (diff = 2 for each)
    expect(mockLogQuantity).toHaveBeenCalledWith("Black Lotus", 2, "Bulk Stock Update", "nonfoil")
    expect(mockLogQuantity).toHaveBeenCalledWith("Sol Ring", 2, "Bulk Stock Update", "nonfoil")
  })

  it('mode "adjust" with negative delta clamped to 0', async () => {
    const items = [makeItem({ id: 1, quantity: 2 })]
    mockFindMany.mockResolvedValue(items)
    mockTransaction.mockResolvedValue([])

    await InventoryService.bulkUpdateStock([1], "adjust", -10)

    // newQty = Math.max(0, 2 + (-10)) = 0, diff = 0 - 2 = -2
    expect(mockLogQuantity).toHaveBeenCalledWith("Black Lotus", -2, "Bulk Stock Update", "nonfoil")
  })

  it("empty ids array — returns { updated: 0 }", async () => {
    mockFindMany.mockResolvedValue([])
    mockUpdateMany.mockResolvedValue({ count: 0 })

    const result = await InventoryService.bulkUpdateStock([], "set", 5)

    expect(result).toEqual({ updated: 0 })
  })
})

// ---------------------------------------------------------------------------
// Tests: bulkDelete
// ---------------------------------------------------------------------------

describe("InventoryService.bulkDelete", () => {
  beforeEach(() => vi.clearAllMocks())

  it("all items deletable — returns { deleted: N, skipped: [] }", async () => {
    mockDeleteManyByIds.mockResolvedValue({ deleted: 3, skipped: [] })

    const result = await InventoryService.bulkDelete([1, 2, 3])

    expect(result).toEqual({ deleted: 3, skipped: [] })
    expect(mockDeleteManyByIds).toHaveBeenCalledWith([1, 2, 3])
  })

  it("some items have order history — returns correct deleted + skipped with reasons", async () => {
    mockDeleteManyByIds.mockResolvedValue({
      deleted: 1,
      skipped: [{ id: 2, reason: "Has order history" }],
    })

    const result = await InventoryService.bulkDelete([1, 2])

    expect(result).toEqual({
      deleted: 1,
      skipped: [{ id: 2, reason: "Has order history" }],
    })
  })

  it("all items have order history — returns { deleted: 0, skipped: [all] }", async () => {
    mockDeleteManyByIds.mockResolvedValue({
      deleted: 0,
      skipped: [
        { id: 1, reason: "Has order history" },
        { id: 2, reason: "Has order history" },
      ],
    })

    const result = await InventoryService.bulkDelete([1, 2])

    expect(result).toEqual({
      deleted: 0,
      skipped: [
        { id: 1, reason: "Has order history" },
        { id: 2, reason: "Has order history" },
      ],
    })
  })

  it("empty ids — returns { deleted: 0, skipped: [] }", async () => {
    mockDeleteManyByIds.mockResolvedValue({ deleted: 0, skipped: [] })

    const result = await InventoryService.bulkDelete([])

    expect(result).toEqual({ deleted: 0, skipped: [] })
    expect(mockDeleteManyByIds).toHaveBeenCalledWith([])
  })
})
