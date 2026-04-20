import { describe, it, expect } from "vitest"
import { computeFairness } from "@/lib/graphite/fairness"

describe("computeFairness", () => {
  it("returns fair when delta is within ±5% of ask", () => {
    expect(computeFairness(9800, 10000)).toMatchObject({ tone: "fair", label: "Fair trade" })
    expect(computeFairness(10400, 10000)).toMatchObject({ tone: "fair", label: "Fair trade" })
  })

  it("treats exact ±5% boundaries as fair (inclusive interval)", () => {
    expect(computeFairness(9500, 10000)).toMatchObject({ tone: "fair" })
    expect(computeFairness(10500, 10000)).toMatchObject({ tone: "fair" })
  })

  it("returns low when delta is more than 10% below ask", () => {
    const r = computeFairness(8000, 10000)
    expect(r.tone).toBe("low")
    expect(r.label).toBe("Lowball")
    expect(r.deltaPct).toBeCloseTo(-20, 0)
  })

  it("returns under when delta is 5–10% below ask", () => {
    expect(computeFairness(9200, 10000)).toMatchObject({ tone: "under", label: "Below ask" })
  })

  it("returns slight-over when delta is 5–15% above ask", () => {
    expect(computeFairness(11000, 10000)).toMatchObject({ tone: "slight-over" })
  })

  it("returns over when delta is more than 15% above ask", () => {
    expect(computeFairness(12000, 10000)).toMatchObject({ tone: "over", label: "Over ask" })
  })

  it("clamps deltaPct to 0 when ask is 0 (trade-only without market fallback)", () => {
    expect(computeFairness(5000, 0).deltaPct).toBe(0)
  })

  it("returns signed delta in cents", () => {
    expect(computeFairness(12500, 10000).delta).toBe(2500)
    expect(computeFairness(7500, 10000).delta).toBe(-2500)
  })
})
