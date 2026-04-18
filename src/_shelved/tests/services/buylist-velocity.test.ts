import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    inventory: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

vi.mock("@/repositories/log.repository", () => ({
  LogRepository: {
    getBuylistVelocities: vi.fn(),
  },
}))

import { BuylistService } from "@/services/buylist.service"
import { prisma } from "@/lib/prisma"
import { LogRepository } from "@/repositories/log.repository"

const mockFindMany = prisma.inventory.findMany as ReturnType<typeof vi.fn>
const mockCount = prisma.inventory.count as ReturnType<typeof vi.fn>
const mockQueryRaw = prisma.$queryRaw as ReturnType<typeof vi.fn>
const mockGetVelocities = LogRepository.getBuylistVelocities as ReturnType<typeof vi.fn>

const DEFAULT_STATS_RAW = [
  { total_on_buylist: BigInt(1), needing_restock: BigInt(0), at_capacity: BigInt(0) },
]

function makeRow(
  overrides: Partial<{
    id: number
    name: string
    setname: string
    condition: string
    finish: string
    imagesmall: string | null
    imagenormal: string | null
    quantity: number
    storeprice: number
    buyPrice: number
    idealQuantity: number
    maxQuantity: number
  }> = {}
) {
  return {
    id: 1,
    name: "Black Lotus",
    setname: "Alpha",
    condition: "NM",
    finish: "nonfoil",
    imagesmall: null,
    imagenormal: null,
    quantity: 3,
    storeprice: 100000,
    buyPrice: 5000,
    idealQuantity: 5,
    maxQuantity: 10,
    ...overrides,
  }
}

describe("BuylistService.getPaginatedItems — velocity integration", () => {
  beforeEach(() => vi.clearAllMocks())

  function setupMocks(
    rows: ReturnType<typeof makeRow>[] = [makeRow()],
    total = 1,
    velocities: { cardname: string; total_units: number }[] = []
  ) {
    mockFindMany.mockResolvedValueOnce(rows)
    mockCount.mockResolvedValue(total)
    mockQueryRaw.mockResolvedValue(DEFAULT_STATS_RAW)
    mockGetVelocities.mockResolvedValue(velocities)
  }

  // ── 1. getBuylistVelocities called with card names from current page ──

  it("calls getBuylistVelocities with the card names from the page results", async () => {
    const rows = [makeRow({ id: 1, name: "Black Lotus" }), makeRow({ id: 2, name: "Mox Pearl" })]
    setupMocks(rows, 2)

    await BuylistService.getPaginatedItems()

    expect(mockGetVelocities).toHaveBeenCalledWith(["Black Lotus", "Mox Pearl"])
  })

  // ── 2. Correct velocityPerWeek calculation ────────────────────────────

  it("computes velocityPerWeek correctly from total_units over 30 days", async () => {
    // 10 units in 30 days => 10 * 7 / 30 = 2.333... => rounded to 2.3
    setupMocks([makeRow({ name: "Lightning Bolt" })], 1, [
      { cardname: "lightning bolt", total_units: 10 },
    ])

    const { data } = await BuylistService.getPaginatedItems()

    expect(data[0].velocityPerWeek).toBeCloseTo(2.3, 1)
  })

  // ── 3. Items with NO velocity match show velocityPerWeek: 0 ──────────

  it("sets velocityPerWeek to 0 when no velocity data exists for a card", async () => {
    setupMocks([makeRow({ name: "Ancestral Recall" })], 1, [])

    const { data } = await BuylistService.getPaginatedItems()

    expect(data[0].velocityPerWeek).toBe(0)
  })

  // ── 4. Empty buylist page ─────────────────────────────────────────────

  it("calls getBuylistVelocities with empty array and returns empty data for empty page", async () => {
    setupMocks([], 0)

    const { data } = await BuylistService.getPaginatedItems()

    expect(mockGetVelocities).toHaveBeenCalledWith([])
    expect(data).toEqual([])
  })

  // ── 5. Mixed velocity — some items have data, others do not ───────────

  it("correctly maps velocity per card when only some have sales data", async () => {
    const rows = [
      makeRow({ id: 1, name: "Black Lotus" }),
      makeRow({ id: 2, name: "Mox Pearl" }),
      makeRow({ id: 3, name: "Sol Ring" }),
    ]
    setupMocks(rows, 3, [
      { cardname: "black lotus", total_units: 21 }, // 21*7/30 = 4.9
      { cardname: "sol ring", total_units: 30 }, // 30*7/30 = 7.0
    ])

    const { data } = await BuylistService.getPaginatedItems()

    expect(data[0].cardName).toBe("Black Lotus")
    expect(data[0].velocityPerWeek).toBeCloseTo(4.9, 1)

    expect(data[1].cardName).toBe("Mox Pearl")
    expect(data[1].velocityPerWeek).toBe(0) // no velocity data

    expect(data[2].cardName).toBe("Sol Ring")
    expect(data[2].velocityPerWeek).toBeCloseTo(7.0, 1)
  })

  // ── 6. Velocity with small units ──────────────────────────────────────

  it("rounds velocityPerWeek to one decimal place", async () => {
    // 1 unit in 30 days => 1*7/30 = 0.2333... => rounded to 0.2
    setupMocks([makeRow({ name: "Force of Will" })], 1, [
      { cardname: "force of will", total_units: 1 },
    ])

    const { data } = await BuylistService.getPaginatedItems()

    expect(data[0].velocityPerWeek).toBe(0.2)
  })
})
