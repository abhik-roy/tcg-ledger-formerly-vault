/**
 * @file ledger-grouping.test.ts
 * @description Tests for ledger mapper functions using new LedgerEntryDTO shape
 *   (type: 'quantity' | 'price' lowercase, new fields)
 */

import { describe, it, expect } from "vitest"
import {
  fromQuantityLog,
  fromPriceLog,
  fromQuantityLogs,
  fromPriceLogs,
  toMergedLedger,
} from "@/mappers/ledger.mapper"
import type { LedgerEntryDTO } from "@/lib/dtos"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeQuantityLogRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: "user-1",
    cardName: "Lightning Bolt",
    cardSet: "LEB",
    condition: "NM",
    finish: "nonfoil",
    delta: -2,
    reason: "Sold at event",
    actorId: "admin-1",
    time: new Date("2026-03-05T10:00:00Z"),
    ...overrides,
  }
}

function makePriceLogRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    cardName: "Black Lotus",
    finish: "nonfoil",
    oldPrice: 5000,
    newPrice: 6000,
    source: "Market Update",
    time: new Date("2026-03-06T12:00:00Z"),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests: fromQuantityLog
// ---------------------------------------------------------------------------

describe("fromQuantityLog", () => {
  it("maps all fields correctly and sets type to 'quantity'", () => {
    const row = makeQuantityLogRow()
    const dto = fromQuantityLog(row)

    expect(dto.type).toBe("quantity")
    expect(dto.id).toBe(1)
    expect(dto.userId).toBe("user-1")
    expect(dto.cardName).toBe("Lightning Bolt")
    expect(dto.cardSet).toBe("LEB")
    expect(dto.condition).toBe("NM")
    expect(dto.finish).toBe("nonfoil")
    expect(dto.delta).toBe(-2)
    expect(dto.reason).toBe("Sold at event")
    expect(dto.actorId).toBe("admin-1")
    expect(dto.time).toEqual(new Date("2026-03-05T10:00:00Z"))
  })

  it("uses cardname (lowercase) as fallback for cardName", () => {
    const row = { ...makeQuantityLogRow(), cardName: undefined, cardname: "Mox Pearl" }
    const dto = fromQuantityLog(row)
    expect(dto.cardName).toBe("Mox Pearl")
  })

  it("uses amount as fallback for delta", () => {
    const row = { ...makeQuantityLogRow(), delta: undefined, amount: -3 }
    const dto = fromQuantityLog(row)
    expect(dto.delta).toBe(-3)
  })

  it("defaults undefined optional fields", () => {
    const row = makeQuantityLogRow({
      cardSet: undefined,
      condition: undefined,
      finish: undefined,
      reason: undefined,
      actorId: undefined,
    })
    const dto = fromQuantityLog(row)

    expect(dto.cardSet).toBeUndefined()
    expect(dto.condition).toBeNull()
    expect(dto.finish).toBeNull()
    expect(dto.reason).toBeNull()
    expect(dto.actorId).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Tests: fromPriceLog
// ---------------------------------------------------------------------------

describe("fromPriceLog", () => {
  it("maps all fields correctly and sets type to 'price'", () => {
    const row = makePriceLogRow()
    const dto = fromPriceLog(row)

    expect(dto.type).toBe("price")
    expect(dto.id).toBe(100)
    expect(dto.cardName).toBe("Black Lotus")
    expect(dto.finish).toBe("nonfoil")
    expect(dto.oldPrice).toBe(5000)
    expect(dto.newPrice).toBe(6000)
    expect(dto.source).toBe("Market Update")
    expect(dto.time).toEqual(new Date("2026-03-06T12:00:00Z"))
  })

  it("uses cardname (lowercase) as fallback for cardName", () => {
    const row = { ...makePriceLogRow(), cardName: undefined, cardname: "Sol Ring" }
    const dto = fromPriceLog(row)
    expect(dto.cardName).toBe("Sol Ring")
  })

  it("defaults undefined source to undefined", () => {
    const row = makePriceLogRow({ source: undefined })
    const dto = fromPriceLog(row)
    expect(dto.source).toBeUndefined()
  })

  it("defaults null finish to null", () => {
    const row = makePriceLogRow({ finish: null })
    const dto = fromPriceLog(row)
    expect(dto.finish).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Tests: batch mapping
// ---------------------------------------------------------------------------

describe("fromQuantityLogs / fromPriceLogs", () => {
  it("maps arrays of rows", () => {
    const qRows = [makeQuantityLogRow({ id: 1 }), makeQuantityLogRow({ id: 2 })]
    const pRows = [makePriceLogRow({ id: 10 }), makePriceLogRow({ id: 11 })]

    expect(fromQuantityLogs(qRows)).toHaveLength(2)
    expect(fromPriceLogs(pRows)).toHaveLength(2)
  })

  it("returns empty array for empty input", () => {
    expect(fromQuantityLogs([])).toEqual([])
    expect(fromPriceLogs([])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Tests: toMergedLedger
// ---------------------------------------------------------------------------

describe("toMergedLedger", () => {
  it("merges quantity and price logs sorted by time descending", () => {
    const qLogs = [makeQuantityLogRow({ id: 1, time: new Date("2026-03-01T00:00:00Z") })]
    const pLogs = [makePriceLogRow({ id: 10, time: new Date("2026-03-05T00:00:00Z") })]

    const merged = toMergedLedger(qLogs, pLogs)

    expect(merged).toHaveLength(2)
    expect(merged[0].type).toBe("price") // newer
    expect(merged[1].type).toBe("quantity") // older
  })

  it("handles empty quantity logs", () => {
    const pLogs = [makePriceLogRow()]
    const merged = toMergedLedger([], pLogs)
    expect(merged).toHaveLength(1)
    expect(merged[0].type).toBe("price")
  })

  it("handles empty price logs", () => {
    const qLogs = [makeQuantityLogRow()]
    const merged = toMergedLedger(qLogs, [])
    expect(merged).toHaveLength(1)
    expect(merged[0].type).toBe("quantity")
  })

  it("handles both empty", () => {
    expect(toMergedLedger([], [])).toEqual([])
  })

  it("correctly interleaves by time", () => {
    const qLogs = [
      makeQuantityLogRow({ id: 1, time: new Date("2026-03-01T00:00:00Z") }),
      makeQuantityLogRow({ id: 2, time: new Date("2026-03-04T00:00:00Z") }),
    ]
    const pLogs = [
      makePriceLogRow({ id: 10, time: new Date("2026-03-02T00:00:00Z") }),
      makePriceLogRow({ id: 11, time: new Date("2026-03-05T00:00:00Z") }),
    ]

    const merged = toMergedLedger(qLogs, pLogs)

    expect(merged).toHaveLength(4)
    // Most recent first
    expect(merged[0].id).toBe(11) // Mar 5 (price)
    expect(merged[1].id).toBe(2) // Mar 4 (quantity)
    expect(merged[2].id).toBe(10) // Mar 2 (price)
    expect(merged[3].id).toBe(1) // Mar 1 (quantity)
  })
})
