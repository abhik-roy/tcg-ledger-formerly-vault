/**
 * @file holding.mapper.test.ts
 * @description Tests for toCardDTO, toHoldingDTO, toHoldingDTOs pure mapping functions
 */

import { describe, it, expect } from "vitest"
import { toCardDTO, toHoldingDTO, toHoldingDTOs } from "@/mappers/holding.mapper"

// ---------------------------------------------------------------------------
// Fixtures — raw DB-like rows
// ---------------------------------------------------------------------------

function makeCardRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "card-1",
    name: "Lightning Bolt",
    set: "LEB",
    setName: "Limited Edition Beta",
    collectorNumber: "161",
    finish: "nonfoil",
    game: "magic",
    rarity: "common",
    imageSmall: "http://small.jpg",
    imageNormal: "http://normal.jpg",
    marketPrice: 5000,
    marketPriceAt: new Date("2026-01-01"),
    ...overrides,
  }
}

function makeHoldingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "holding-1",
    userId: "user-1",
    card: makeCardRow(),
    quantity: 2,
    condition: "NM",
    notes: "great condition",
    listedForTrade: false,
    tradeNotes: null,
    idealQuantity: 4,
    maxQuantity: 8,
    acquiredPrice: 3000,
    acquiredAt: new Date("2026-01-15"),
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests: toCardDTO
// ---------------------------------------------------------------------------

describe("toCardDTO", () => {
  it("maps all fields correctly from a complete row", () => {
    const row = makeCardRow()
    const dto = toCardDTO(row)

    expect(dto.id).toBe("card-1")
    expect(dto.name).toBe("Lightning Bolt")
    expect(dto.set).toBe("LEB")
    expect(dto.setName).toBe("Limited Edition Beta")
    expect(dto.collectorNumber).toBe("161")
    expect(dto.finish).toBe("nonfoil")
    expect(dto.game).toBe("magic")
    expect(dto.rarity).toBe("common")
    expect(dto.imageSmall).toBe("http://small.jpg")
    expect(dto.imageNormal).toBe("http://normal.jpg")
    expect(dto.marketPrice).toBe(5000)
    expect(dto.marketPriceAt).toEqual(new Date("2026-01-01"))
  })

  it("defaults undefined imageSmall to null", () => {
    const dto = toCardDTO(makeCardRow({ imageSmall: undefined }))
    expect(dto.imageSmall).toBeNull()
  })

  it("defaults undefined imageNormal to null", () => {
    const dto = toCardDTO(makeCardRow({ imageNormal: undefined }))
    expect(dto.imageNormal).toBeNull()
  })

  it("defaults undefined marketPrice to null", () => {
    const dto = toCardDTO(makeCardRow({ marketPrice: undefined }))
    expect(dto.marketPrice).toBeNull()
  })

  it("defaults undefined marketPriceAt to null", () => {
    const dto = toCardDTO(makeCardRow({ marketPriceAt: undefined }))
    expect(dto.marketPriceAt).toBeNull()
  })

  it("passes through zero marketPrice", () => {
    const dto = toCardDTO(makeCardRow({ marketPrice: 0 }))
    expect(dto.marketPrice).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Tests: toHoldingDTO
// ---------------------------------------------------------------------------

describe("toHoldingDTO", () => {
  it("maps all fields correctly including nested card", () => {
    const row = makeHoldingRow()
    const dto = toHoldingDTO(row)

    expect(dto.id).toBe("holding-1")
    expect(dto.userId).toBe("user-1")
    expect(dto.card.name).toBe("Lightning Bolt")
    expect(dto.quantity).toBe(2)
    expect(dto.condition).toBe("NM")
    expect(dto.notes).toBe("great condition")
    expect(dto.listedForTrade).toBe(false)
    expect(dto.tradeNotes).toBeNull()
    expect(dto.idealQuantity).toBe(4)
    expect(dto.maxQuantity).toBe(8)
    expect(dto.acquiredPrice).toBe(3000)
    expect(dto.acquiredAt).toEqual(new Date("2026-01-15"))
    expect(dto.createdAt).toEqual(new Date("2026-01-01"))
    expect(dto.updatedAt).toEqual(new Date("2026-01-01"))
  })

  it("defaults undefined notes to null", () => {
    const dto = toHoldingDTO(makeHoldingRow({ notes: undefined }))
    expect(dto.notes).toBeNull()
  })

  it("defaults undefined tradeNotes to null", () => {
    const dto = toHoldingDTO(makeHoldingRow({ tradeNotes: undefined }))
    expect(dto.tradeNotes).toBeNull()
  })

  it("defaults undefined acquiredPrice to null", () => {
    const dto = toHoldingDTO(makeHoldingRow({ acquiredPrice: undefined }))
    expect(dto.acquiredPrice).toBeNull()
  })

  it("defaults undefined acquiredAt to null", () => {
    const dto = toHoldingDTO(makeHoldingRow({ acquiredAt: undefined }))
    expect(dto.acquiredAt).toBeNull()
  })

  it("passes through zero quantity", () => {
    const dto = toHoldingDTO(makeHoldingRow({ quantity: 0 }))
    expect(dto.quantity).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Tests: toHoldingDTOs
// ---------------------------------------------------------------------------

describe("toHoldingDTOs", () => {
  it("maps an array of holding rows to DTOs", () => {
    const rows = [
      makeHoldingRow({ id: "h-1" }),
      makeHoldingRow({ id: "h-2", card: makeCardRow({ name: "Black Lotus" }) }),
    ]
    const dtos = toHoldingDTOs(rows)

    expect(dtos).toHaveLength(2)
    expect(dtos[0].id).toBe("h-1")
    expect(dtos[1].id).toBe("h-2")
    expect(dtos[1].card.name).toBe("Black Lotus")
  })

  it("returns empty array for empty input", () => {
    expect(toHoldingDTOs([])).toEqual([])
  })
})
