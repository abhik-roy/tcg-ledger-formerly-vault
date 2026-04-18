/**
 * @file personal-targets.test.ts
 * @description Tests for PersonalTargetsService (listForUser, updateTargets)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/repositories/holding.repository", () => ({
  HoldingRepository: {
    findByUser: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock("@/mappers/holding.mapper", () => ({
  toHoldingDTO: vi.fn((row: unknown) => row),
  toHoldingDTOs: vi.fn((rows: unknown[]) => rows),
}))

import { PersonalTargetsService } from "@/services/personal-targets.service"
import { HoldingRepository } from "@/repositories/holding.repository"

const mockFindByUser = HoldingRepository.findByUser as ReturnType<typeof vi.fn>
const mockUpdate = HoldingRepository.update as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeHoldingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "h-1",
    userId: "user-1",
    quantity: 2,
    idealQuantity: 0,
    maxQuantity: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests: listForUser
// ---------------------------------------------------------------------------

describe("PersonalTargetsService.listForUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("filters holdings to only those with idealQuantity or maxQuantity > 0", async () => {
    mockFindByUser.mockResolvedValue([
      makeHoldingRow({ id: "h-1", idealQuantity: 4, maxQuantity: 8 }),
      makeHoldingRow({ id: "h-2", idealQuantity: 0, maxQuantity: 0 }),
      makeHoldingRow({ id: "h-3", idealQuantity: 0, maxQuantity: 5 }),
    ])

    const result = await PersonalTargetsService.listForUser("user-1")

    expect(result).toHaveLength(2)
    expect((result[0] as ReturnType<typeof makeHoldingRow>).id).toBe("h-1")
    expect((result[1] as ReturnType<typeof makeHoldingRow>).id).toBe("h-3")
  })

  it("returns empty when no holdings have targets set", async () => {
    mockFindByUser.mockResolvedValue([makeHoldingRow({ idealQuantity: 0, maxQuantity: 0 })])

    const result = await PersonalTargetsService.listForUser("user-1")

    expect(result).toHaveLength(0)
  })

  it("calls findByUser with userId and empty filter", async () => {
    mockFindByUser.mockResolvedValue([])

    await PersonalTargetsService.listForUser("user-1")

    expect(mockFindByUser).toHaveBeenCalledWith("user-1", {})
  })
})

// ---------------------------------------------------------------------------
// Tests: updateTargets
// ---------------------------------------------------------------------------

describe("PersonalTargetsService.updateTargets", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls repo.update with idealQuantity and maxQuantity", async () => {
    mockUpdate.mockResolvedValue(makeHoldingRow({ idealQuantity: 4, maxQuantity: 8 }))

    await PersonalTargetsService.updateTargets("h-1", 4, 8)

    expect(mockUpdate).toHaveBeenCalledWith("h-1", {
      idealQuantity: 4,
      maxQuantity: 8,
    })
  })

  it("returns the mapped DTO", async () => {
    const row = makeHoldingRow({ id: "h-1", idealQuantity: 3, maxQuantity: 6 })
    mockUpdate.mockResolvedValue(row)

    const result = await PersonalTargetsService.updateTargets("h-1", 3, 6)

    expect(result).toEqual(row) // mapper is mocked to pass through
  })
})
