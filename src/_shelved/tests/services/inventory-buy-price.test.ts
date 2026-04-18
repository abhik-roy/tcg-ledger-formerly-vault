import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    inventory: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    priceLog: {
      createMany: vi.fn(),
    },
    // Array-form $transaction: just run all ops via Promise.all
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}))

// Mock the repository + catalog deps so InventoryService can import cleanly
vi.mock("@/repositories/inventory.repository", () => ({
  InventoryRepository: {
    groupBySet: vi.fn(),
    findMany: vi.fn(),
    findManyBasic: vi.fn(),
    findByIdForStockUpdate: vi.fn(),
    update: vi.fn(),
    findByCardIdentity: vi.fn(),
    incrementQuantity: vi.fn(),
    create: vi.fn(),
    getOverviewAggregates: vi.fn(),
    updateBuylistTargets: vi.fn(),
    findBuylistItems: vi.fn(),
    getBuylistStats: vi.fn(),
  },
}))

vi.mock("@/repositories/catalog.repository", () => ({
  CatalogRepository: {
    findById: vi.fn(),
    searchByName: vi.fn(),
    findByNameAndNumber: vi.fn(),
  },
}))

vi.mock("next/cache", () => ({
  unstable_cache: (_fn: (...args: unknown[]) => unknown) => _fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("@/mappers/inventory.mapper", () => ({
  toInventoryItemDTO: vi.fn((r: unknown) => r),
  toBuylistItemDTOs: vi.fn((rows: unknown[]) => rows),
  toBuylistOverviewStats: vi.fn(() => ({ totalOnBuylist: 0, needingRestock: 0, atCapacity: 0 })),
  toPOSInventoryItemDTOs: vi.fn((rows: unknown[]) => rows),
  toInventoryTopItem: vi.fn((r: unknown) => r),
}))

import { InventoryService } from "@/services/inventory.service"
import { prisma } from "@/lib/prisma"

const mockFindMany = prisma.inventory.findMany as ReturnType<typeof vi.fn>
const mockUpdate = prisma.inventory.update as ReturnType<typeof vi.fn>
const mockPriceLogCreateMany = prisma.priceLog.createMany as ReturnType<typeof vi.fn>

describe("InventoryService.bulkUpdateBuyPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({})
    mockPriceLogCreateMany.mockResolvedValue({ count: 0 })
  })

  // ── 1. mode: "set" ───────────────────────────────────────────────────

  it("sets buyPrice to the given value and logs every change", async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, name: "Black Lotus", buyPrice: 5000, finish: "nonfoil" },
      { id: 2, name: "Mox Pearl", buyPrice: 3000, finish: "foil" },
    ])

    const result = await InventoryService.bulkUpdateBuyPrice([1, 2], "set", 7000)

    expect(result.updated).toBe(2)
    expect(mockUpdate).toHaveBeenCalledTimes(2)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { buyPrice: 7000 } })
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 2 }, data: { buyPrice: 7000 } })

    expect(mockPriceLogCreateMany).toHaveBeenCalledOnce()
    expect(mockPriceLogCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          cardname: "Black Lotus",
          oldPrice: 5000,
          newPrice: 7000,
          user: "Bulk Buy Price Update",
          finish: "nonfoil",
        }),
        expect.objectContaining({
          cardname: "Mox Pearl",
          oldPrice: 3000,
          newPrice: 7000,
          user: "Bulk Buy Price Update",
          finish: "foil",
        }),
      ]),
    })
  })

  // ── 2. mode: "adjust_fixed" ──────────────────────────────────────────

  it("adds a fixed amount to current buyPrice", async () => {
    mockFindMany.mockResolvedValue([{ id: 1, name: "Sol Ring", buyPrice: 200, finish: "nonfoil" }])

    const result = await InventoryService.bulkUpdateBuyPrice([1], "adjust_fixed", 50)

    expect(result.updated).toBe(1)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { buyPrice: 250 } })
    expect(mockPriceLogCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ cardname: "Sol Ring", oldPrice: 200, newPrice: 250 }),
      ]),
    })
  })

  // ── 3. mode: "adjust_pct" ────────────────────────────────────────────

  it("applies percentage adjustment and rounds correctly", async () => {
    // buyPrice=1000, adjust_pct=10 => 1000 * (1 + 10/100) = 1100
    mockFindMany.mockResolvedValue([
      { id: 1, name: "Lightning Bolt", buyPrice: 1000, finish: "nonfoil" },
    ])

    const result = await InventoryService.bulkUpdateBuyPrice([1], "adjust_pct", 10)

    expect(result.updated).toBe(1)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { buyPrice: 1100 } })
  })

  // ── 4. Negative result clamped to 0 ──────────────────────────────────

  it("clamps buyPrice to 0 when adjust_fixed would make it negative", async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, name: "Counterspell", buyPrice: 50, finish: "nonfoil" },
    ])

    const result = await InventoryService.bulkUpdateBuyPrice([1], "adjust_fixed", -100)

    expect(result.updated).toBe(1)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { buyPrice: 0 } })
    expect(mockPriceLogCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ cardname: "Counterspell", oldPrice: 50, newPrice: 0 }),
      ]),
    })
  })

  it("clamps buyPrice to 0 when adjust_pct would make it negative", async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, name: "Counterspell", buyPrice: 100, finish: "nonfoil" },
    ])

    const result = await InventoryService.bulkUpdateBuyPrice([1], "adjust_pct", -200)

    expect(result.updated).toBe(1)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { buyPrice: 0 } })
  })

  // ── 5. No-op when value unchanged ────────────────────────────────────

  it("does not log or update when the new price equals the current price", async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, name: "Black Lotus", buyPrice: 5000, finish: "nonfoil" },
    ])

    const result = await InventoryService.bulkUpdateBuyPrice([1], "set", 5000)

    expect(result.updated).toBe(0)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockPriceLogCreateMany).not.toHaveBeenCalled()
  })

  it("skips items that did not change in a mixed batch", async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, name: "Unchanged", buyPrice: 500, finish: "nonfoil" },
      { id: 2, name: "Changed", buyPrice: 300, finish: "foil" },
    ])

    const result = await InventoryService.bulkUpdateBuyPrice([1, 2], "set", 500)

    expect(result.updated).toBe(1) // only id=2 changed
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 2 }, data: { buyPrice: 500 } })
    expect(mockPriceLogCreateMany).toHaveBeenCalledOnce()
    expect(mockPriceLogCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([expect.objectContaining({ cardname: "Changed" })]),
    })
  })

  // ── 6. Empty ids array ───────────────────────────────────────────────

  it("returns { updated: 0 } immediately for empty ids array", async () => {
    mockFindMany.mockResolvedValue([])

    const result = await InventoryService.bulkUpdateBuyPrice([], "set", 100)

    expect(result.updated).toBe(0)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockPriceLogCreateMany).not.toHaveBeenCalled()
  })

  // ── 7. Uses "nonfoil" default when finish is null ────────────────────

  it("falls back to nonfoil for logging when item.finish is null", async () => {
    mockFindMany.mockResolvedValue([{ id: 1, name: "Time Walk", buyPrice: 100, finish: null }])

    await InventoryService.bulkUpdateBuyPrice([1], "set", 200)

    expect(mockPriceLogCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          cardname: "Time Walk",
          oldPrice: 100,
          newPrice: 200,
          finish: "nonfoil",
        }),
      ]),
    })
  })
})
