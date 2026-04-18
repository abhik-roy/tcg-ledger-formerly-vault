import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth-guard", () => ({
  requireStaff: vi.fn(),
}))

vi.mock("@/services/logging.service", () => ({
  LoggingService: {
    getLedgerEntriesForExport: vi.fn(),
  },
}))

import { GET } from "@/app/api/admin/ledger/export/route"
import { requireStaff } from "@/lib/auth-guard"
import { LoggingService } from "@/services/logging.service"
import type { LedgerEntry } from "@/lib/types"

const mockRequireStaff = requireStaff as ReturnType<typeof vi.fn>
const mockGetExport = LoggingService.getLedgerEntriesForExport as ReturnType<typeof vi.fn>

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/admin/ledger/export")
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

function makeEntry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: "qty-1",
    type: "QUANTITY",
    cardName: "Lightning Bolt",
    user: "POS Sale",
    time: new Date("2026-03-05T10:00:00Z"),
    finish: null,
    amount: -1,
    ...overrides,
  }
}

describe("GET /api/admin/ledger/export", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireStaff.mockResolvedValue(undefined)
    mockGetExport.mockResolvedValue([])
  })

  it("returns 401 when requireStaff throws", async () => {
    mockRequireStaff.mockRejectedValue(new Error("Unauthorized"))

    const res = await GET(makeRequest())

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns CSV response with Content-Type text/csv when entries exist", async () => {
    mockGetExport.mockResolvedValue([makeEntry()])

    const res = await GET(makeRequest({ startDate: "2026-03-01", endDate: "2026-03-07" }))

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/csv")
  })

  it("Content-Disposition header contains attachment and .csv filename", async () => {
    mockGetExport.mockResolvedValue([makeEntry()])

    const res = await GET(makeRequest({ startDate: "2026-03-01", endDate: "2026-03-07" }))

    const disposition = res.headers.get("Content-Disposition") ?? ""
    expect(disposition).toContain("attachment; filename=")
    expect(disposition).toContain(".csv")
  })

  it("CSV body has correct headers as first line", async () => {
    mockGetExport.mockResolvedValue([makeEntry()])

    const res = await GET(makeRequest({ startDate: "2026-03-01", endDate: "2026-03-07" }))
    const body = await res.text()
    const firstLine = body.split("\n")[0]

    expect(firstLine).toBe(
      "Date,Card,Type,Qty Change,Old Price (USD),New Price (USD),Source,Order ID,Order Status,Admin/Source"
    )
  })

  it("CSV has N+1 lines for N entries (1 header + N data rows)", async () => {
    mockGetExport.mockResolvedValue([
      makeEntry({ id: "qty-1" }),
      makeEntry({ id: "qty-2", cardName: "Sol Ring" }),
      makeEntry({ id: "qty-3", cardName: "Mox Jet" }),
    ])

    const res = await GET(makeRequest({ startDate: "2026-03-01", endDate: "2026-03-07" }))
    const body = await res.text()
    const lines = body.split("\n")

    expect(lines).toHaveLength(4) // 1 header + 3 data
  })

  it("returns 400 for invalid startDate param", async () => {
    const res = await GET(makeRequest({ startDate: "not-a-date" }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Invalid")
  })

  it("defaults to last 30 days when no startDate/endDate given", async () => {
    mockGetExport.mockResolvedValue([])

    await GET(makeRequest())

    expect(mockGetExport).toHaveBeenCalledOnce()
    const callArgs = mockGetExport.mock.calls[0][0]
    const now = Date.now()
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

    // endDate should be close to now
    expect(Math.abs(callArgs.endDate.getTime() - now)).toBeLessThan(5000)
    // startDate should be ~30 days before endDate
    const diff = callArgs.endDate.getTime() - callArgs.startDate.getTime()
    expect(Math.abs(diff - thirtyDaysMs)).toBeLessThan(5000)
  })

  it("passes type, source, status filter params to getLedgerEntriesForExport", async () => {
    mockGetExport.mockResolvedValue([])

    await GET(
      makeRequest({
        startDate: "2026-03-01",
        endDate: "2026-03-07",
        type: "QUANTITY",
        source: "POS",
        status: "COMPLETED",
      })
    )

    expect(mockGetExport).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "QUANTITY",
        source: "POS",
        orderStatus: "COMPLETED",
      })
    )
  })

  it("card names with commas are wrapped in quotes in CSV output", async () => {
    mockGetExport.mockResolvedValue([makeEntry({ cardName: "Jace, the Mind Sculptor" })])

    const res = await GET(makeRequest({ startDate: "2026-03-01", endDate: "2026-03-07" }))
    const body = await res.text()
    const dataLine = body.split("\n")[1]

    expect(dataLine).toContain('"Jace, the Mind Sculptor"')
  })

  it("price entries: Old Price and New Price converted from cents to dollars", async () => {
    mockGetExport.mockResolvedValue([
      makeEntry({
        id: "price-1",
        type: "PRICE",
        oldPrice: 1050,
        newPrice: 2099,
        amount: undefined,
      }),
    ])

    const res = await GET(makeRequest({ startDate: "2026-03-01", endDate: "2026-03-07" }))
    const body = await res.text()
    const dataLine = body.split("\n")[1]

    expect(dataLine).toContain("10.50")
    expect(dataLine).toContain("20.99")
  })

  it("empty entries list returns headers-only CSV with 200 status", async () => {
    mockGetExport.mockResolvedValue([])

    const res = await GET(makeRequest({ startDate: "2026-03-01", endDate: "2026-03-07" }))
    const body = await res.text()
    const lines = body.split("\n")

    expect(res.status).toBe(200)
    expect(lines).toHaveLength(1) // header only
    expect(lines[0]).toContain("Date,Card,Type")
  })
})
