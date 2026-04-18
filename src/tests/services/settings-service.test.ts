/**
 * @file settings-service.test.ts
 * @description Tests for SettingsService (getGlobal, updateGlobal)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/repositories/settings.repository", () => ({
  SettingsRepository: {
    find: vi.fn(),
    upsert: vi.fn(),
  },
}))

vi.mock("@/mappers/settings.mapper", () => ({
  toStoreSettingsDTO: vi.fn((row: unknown) => row),
}))

import { SettingsService } from "@/services/settings.service"
import { SettingsRepository } from "@/repositories/settings.repository"
import { toStoreSettingsDTO } from "@/mappers/settings.mapper"

const mockFind = SettingsRepository.find as ReturnType<typeof vi.fn>
const mockUpsert = SettingsRepository.upsert as ReturnType<typeof vi.fn>
const mockToStoreSettingsDTO = toStoreSettingsDTO as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DB_SETTINGS = {
  storeName: "My Card Shop",
  contactEmail: "shop@example.com",
  posExitPin: "9999",
  taxRate: 8.5,
  currency: "CAD",
}

// ---------------------------------------------------------------------------
// Tests: getGlobal
// ---------------------------------------------------------------------------

describe("SettingsService.getGlobal", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls SettingsRepository.find and passes result to mapper", async () => {
    mockFind.mockResolvedValue(DB_SETTINGS)
    mockToStoreSettingsDTO.mockReturnValue(DB_SETTINGS)

    const result = await SettingsService.getGlobal()

    expect(mockFind).toHaveBeenCalledOnce()
    expect(mockToStoreSettingsDTO).toHaveBeenCalledWith(DB_SETTINGS)
    expect(result).toEqual(DB_SETTINGS)
  })

  it("passes null to mapper when no settings row exists", async () => {
    mockFind.mockResolvedValue(null)
    mockToStoreSettingsDTO.mockReturnValue({ storeName: "TCG Ledger" })

    const result = await SettingsService.getGlobal()

    expect(mockToStoreSettingsDTO).toHaveBeenCalledWith(null)
    expect(result.storeName).toBe("TCG Ledger")
  })
})

// ---------------------------------------------------------------------------
// Tests: updateGlobal
// ---------------------------------------------------------------------------

describe("SettingsService.updateGlobal", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls SettingsRepository.upsert and maps the result", async () => {
    const updatedRow = { ...DB_SETTINGS, storeName: "New Name" }
    mockUpsert.mockResolvedValue(updatedRow)
    mockToStoreSettingsDTO.mockReturnValue(updatedRow)

    const result = await SettingsService.updateGlobal({ storeName: "New Name" })

    expect(mockUpsert).toHaveBeenCalledWith({ storeName: "New Name" })
    expect(mockToStoreSettingsDTO).toHaveBeenCalledWith(updatedRow)
    expect(result.storeName).toBe("New Name")
  })

  it("handles partial updates", async () => {
    const partialInput = { taxRate: 10 }
    mockUpsert.mockResolvedValue({ ...DB_SETTINGS, taxRate: 10 })
    mockToStoreSettingsDTO.mockReturnValue({ ...DB_SETTINGS, taxRate: 10 })

    const result = await SettingsService.updateGlobal(partialInput)

    expect(mockUpsert).toHaveBeenCalledWith(partialInput)
    expect(result.taxRate).toBe(10)
  })
})
