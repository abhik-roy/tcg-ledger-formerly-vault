import { describe, it, expect } from "vitest"
import { formatAsk, formatUsdCents } from "@/lib/graphite/format-ask"

describe("formatUsdCents", () => {
  it("formats cents as USD with 2 decimals", () => {
    expect(formatUsdCents(0)).toBe("$0.00")
    expect(formatUsdCents(1234)).toBe("$12.34")
    expect(formatUsdCents(850000)).toBe("$8,500.00")
  })
  it("handles negatives", () => {
    expect(formatUsdCents(-500)).toBe("-$5.00")
  })
})

describe("formatAsk", () => {
  it("returns null when askType is null", () => {
    expect(formatAsk(null, null, 10000)).toBeNull()
  })
  it("returns 'Trade only' for trade_only", () => {
    expect(formatAsk("trade_only", null, 10000)).toBe("Trade only")
  })
  it("formats custom ask as dollar amount", () => {
    expect(formatAsk("custom", 8500, 10000)).toBe("$85.00")
  })
  it("formats percent ask as percent + resolved dollar", () => {
    expect(formatAsk("percent", 95, 10000)).toBe("95% mkt · $95.00")
  })
  it("falls back to market when market is null in percent mode", () => {
    expect(formatAsk("percent", 95, null)).toBe("95% mkt")
  })
})
