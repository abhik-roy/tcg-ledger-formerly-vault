import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/prisma", () => ({
  prisma: {
    orderItem: {
      findMany: vi.fn(),
    },
    inventory: {
      deleteMany: vi.fn(),
    },
  },
}))

import { InventoryRepository } from "@/repositories/inventory.repository"
import { prisma } from "@/lib/prisma"

const mockOrderItemFindMany = prisma.orderItem.findMany as ReturnType<typeof vi.fn>
const mockInventoryDeleteMany = prisma.inventory.deleteMany as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Tests: deleteManyByIds
// ---------------------------------------------------------------------------

describe("InventoryRepository.deleteManyByIds", () => {
  beforeEach(() => vi.clearAllMocks())

  it("no items have order history — calls deleteMany with all ids, returns { deleted: N, skipped: [] }", async () => {
    mockOrderItemFindMany.mockResolvedValue([])
    mockInventoryDeleteMany.mockResolvedValue({ count: 3 })

    const result = await InventoryRepository.deleteManyByIds([1, 2, 3])

    expect(mockOrderItemFindMany).toHaveBeenCalledWith({
      where: { inventoryId: { in: [1, 2, 3] } },
      select: { inventoryId: true },
    })
    expect(mockInventoryDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2, 3] } },
    })
    expect(result).toEqual({ deleted: 3, skipped: [] })
  })

  it("some items have order history — deleteMany called with only safe ids, skipped items reported", async () => {
    mockOrderItemFindMany.mockResolvedValue([{ inventoryId: 2 }])
    mockInventoryDeleteMany.mockResolvedValue({ count: 2 })

    const result = await InventoryRepository.deleteManyByIds([1, 2, 3])

    expect(mockInventoryDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 3] } },
    })
    expect(result).toEqual({
      deleted: 2,
      skipped: [{ id: 2, reason: "Has order history" }],
    })
  })

  it("all items have order history — deleteMany NOT called, all returned as skipped", async () => {
    mockOrderItemFindMany.mockResolvedValue([{ inventoryId: 1 }, { inventoryId: 2 }])

    const result = await InventoryRepository.deleteManyByIds([1, 2])

    expect(mockInventoryDeleteMany).not.toHaveBeenCalled()
    expect(result).toEqual({
      deleted: 0,
      skipped: [
        { id: 1, reason: "Has order history" },
        { id: 2, reason: "Has order history" },
      ],
    })
  })

  it("empty input — deleteMany NOT called, returns { deleted: 0, skipped: [] }", async () => {
    mockOrderItemFindMany.mockResolvedValue([])

    const result = await InventoryRepository.deleteManyByIds([])

    expect(mockInventoryDeleteMany).not.toHaveBeenCalled()
    expect(result).toEqual({ deleted: 0, skipped: [] })
  })

  it("duplicate inventoryId in order items — still only reports each id once in skipped", async () => {
    // The same inventory item could appear in multiple order items
    mockOrderItemFindMany.mockResolvedValue([
      { inventoryId: 2 },
      { inventoryId: 2 },
      { inventoryId: 2 },
    ])
    mockInventoryDeleteMany.mockResolvedValue({ count: 1 })

    const result = await InventoryRepository.deleteManyByIds([1, 2])

    expect(mockInventoryDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
    })
    expect(result).toEqual({
      deleted: 1,
      skipped: [{ id: 2, reason: "Has order history" }],
    })
  })
})
