/**
 * @file holding.service.test.ts
 * @description Tests for HoldingService
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/repositories/holding.repository", () => ({
  HoldingRepository: {
    findByUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findListed: vi.fn(),
    upsertFromImport: vi.fn(),
  },
}))

vi.mock("@/mappers/holding.mapper", () => ({
  toHoldingDTO: vi.fn((row: unknown) => row),
  toHoldingDTOs: vi.fn((rows: unknown[]) => rows),
}))

vi.mock("@/mappers/trade-binder.mapper", () => ({
  toTradeBinderItemDTOs: vi.fn((rows: unknown[]) => rows),
}))

import { HoldingService } from "@/services/holding.service"
import { HoldingRepository } from "@/repositories/holding.repository"

const mockFindByUser = HoldingRepository.findByUser as ReturnType<typeof vi.fn>
const mockFindById = HoldingRepository.findById as ReturnType<typeof vi.fn>
const mockUpdate = HoldingRepository.update as ReturnType<typeof vi.fn>
const mockFindListed = HoldingRepository.findListed as ReturnType<typeof vi.fn>
const mockUpsertFromImport = HoldingRepository.upsertFromImport as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Tests: listForUser
// ---------------------------------------------------------------------------

describe("HoldingService.listForUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls repo and maps DTOs", async () => {
    const rows = [{ id: "h-1" }, { id: "h-2" }]
    mockFindByUser.mockResolvedValue(rows)

    const result = await HoldingService.listForUser("user-1", {})

    expect(mockFindByUser).toHaveBeenCalledWith("user-1", {})
    expect(result).toEqual(rows) // mapper mocked to pass through
  })

  it("passes filter to repository", async () => {
    mockFindByUser.mockResolvedValue([])

    await HoldingService.listForUser("user-1", { game: "magic" })

    expect(mockFindByUser).toHaveBeenCalledWith("user-1", { game: "magic" })
  })
})

// ---------------------------------------------------------------------------
// Tests: getById
// ---------------------------------------------------------------------------

describe("HoldingService.getById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns holding when found", async () => {
    const row = { id: "h-1", userId: "user-1" }
    mockFindById.mockResolvedValue(row)

    const result = await HoldingService.getById("h-1")

    expect(result).toEqual(row)
  })

  it("throws when holding not found", async () => {
    mockFindById.mockResolvedValue(null)

    await expect(HoldingService.getById("no-exist")).rejects.toThrow("Holding not found")
  })
})

// ---------------------------------------------------------------------------
// Tests: toggleListing
// ---------------------------------------------------------------------------

describe("HoldingService.toggleListing", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls repo update with correct args", async () => {
    const row = { id: "h-1", listedForTrade: true, listedQuantity: 3, tradeNotes: "Want to trade" }
    mockUpdate.mockResolvedValue(row)

    const result = await HoldingService.toggleListing("h-1", 3, "Want to trade")

    expect(mockUpdate).toHaveBeenCalledWith("h-1", {
      listedForTrade: true,
      listedQuantity: 3,
      tradeNotes: "Want to trade",
    })
    expect(result).toEqual(row)
  })

  it("sets listedForTrade=false when quantity is 0", async () => {
    mockUpdate.mockResolvedValue({ id: "h-1", listedForTrade: false, listedQuantity: 0 })

    await HoldingService.toggleListing("h-1", 0)

    expect(mockUpdate).toHaveBeenCalledWith("h-1", {
      listedForTrade: false,
      listedQuantity: 0,
      tradeNotes: undefined,
    })
  })
})

// ---------------------------------------------------------------------------
// Tests: listTradeBinder
// ---------------------------------------------------------------------------

describe("HoldingService.listTradeBinder", () => {
  beforeEach(() => vi.clearAllMocks())

  it("delegates to repo.findListed and mapper", async () => {
    const rows = [{ id: "h-1" }]
    mockFindListed.mockResolvedValue(rows)

    const result = await HoldingService.listTradeBinder({})

    expect(mockFindListed).toHaveBeenCalledWith({})
    expect(result).toEqual(rows)
  })

  it("passes excludeUserId to filter", async () => {
    mockFindListed.mockResolvedValue([])

    await HoldingService.listTradeBinder({ excludeUserId: "user-1" })

    expect(mockFindListed).toHaveBeenCalledWith({ excludeUserId: "user-1" })
  })
})

// ---------------------------------------------------------------------------
// Tests: bulkImportFromCsv
// ---------------------------------------------------------------------------

describe("HoldingService.bulkImportFromCsv", () => {
  beforeEach(() => vi.clearAllMocks())

  it("counts successes and failures", async () => {
    mockUpsertFromImport
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Invalid card"))
      .mockResolvedValueOnce({})

    const rows = [
      { cardId: "c-1", quantity: 1, condition: "NM" },
      { cardId: "c-bad", quantity: 1, condition: "NM" },
      { cardId: "c-2", quantity: 2, condition: "LP" },
    ]

    const result = await HoldingService.bulkImportFromCsv("user-1", rows)

    expect(result.imported).toBe(2)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0]).toEqual({ row: 1, reason: "Invalid card" })
  })

  it("returns all imported when no failures", async () => {
    mockUpsertFromImport.mockResolvedValue({})

    const result = await HoldingService.bulkImportFromCsv("user-1", [
      { cardId: "c-1", quantity: 1, condition: "NM" },
    ])

    expect(result.imported).toBe(1)
    expect(result.failed).toEqual([])
  })

  it("returns empty counts for empty input", async () => {
    const result = await HoldingService.bulkImportFromCsv("user-1", [])

    expect(result.imported).toBe(0)
    expect(result.failed).toEqual([])
    expect(mockUpsertFromImport).not.toHaveBeenCalled()
  })
})
