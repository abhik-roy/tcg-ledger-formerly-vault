"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useDebounce } from "@/lib/hooks"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Search, X, ChevronLeft, ChevronRight, Download, ArrowRight } from "lucide-react"
import type { LedgerEntryDTO } from "@/lib/dtos"
import { Eyebrow } from "@/components/ui/graphite"

const PAGE_SIZE = 40

// ── Sub-components ────────────────────────────────────────────

function TypeDot({ type }: { type: "quantity" | "price" }) {
  const color = type === "price" ? "var(--signal-amber)" : "var(--accent-cool)"
  const label = type === "price" ? "Price" : "Stock"
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block rounded-full"
        style={{ width: 6, height: 6, background: color }}
      />
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--ink-2)" }}
      >
        {label}
      </span>
    </span>
  )
}

function QtyChange({ delta }: { delta: number }) {
  const positive = delta > 0
  const color = positive ? "var(--signal-green)" : "var(--accent-hot)"
  return (
    <span className="price font-semibold tabular-nums" style={{ fontSize: 14, color }}>
      {positive ? "+" : ""}
      {delta}
    </span>
  )
}

function PriceChange({ oldPrice, newPrice }: { oldPrice: number; newPrice: number }) {
  const up = newPrice > oldPrice
  const newColor = up ? "var(--signal-green)" : "var(--accent-hot)"
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span
        className="price"
        style={{
          fontSize: 12,
          color: "var(--ink-4)",
          textDecoration: "line-through",
        }}
      >
        ${(oldPrice / 100).toFixed(2)}
      </span>
      <ArrowRight className="w-3 h-3 shrink-0" style={{ color: "var(--ink-4)" }} />
      <span className="price font-semibold" style={{ fontSize: 13, color: newColor }}>
        ${(newPrice / 100).toFixed(2)}
      </span>
    </span>
  )
}

function ExportButton({
  dateRange,
  typeFilter,
}: {
  dateRange?: { start: string; end: string }
  typeFilter: string
}) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (dateRange?.start) params.set("startDate", dateRange.start)
      if (dateRange?.end) params.set("endDate", dateRange.end)
      if (typeFilter !== "ALL") params.set("type", typeFilter)

      const response = await fetch(`/api/admin/ledger/export?${params.toString()}`)
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "ledger-export.csv"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silent fail
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      title="Export filtered entries as CSV"
      className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] transition-colors disabled:opacity-50"
      style={{
        background: "var(--ink)",
        color: "var(--bg)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "-0.005em",
      }}
    >
      <Download className="w-3.5 h-3.5" />
      {exporting ? "Exporting…" : "Export"}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────

interface LedgerTableProps {
  data: LedgerEntryDTO[]
  dateRange?: { start: string; end: string }
}

export function LedgerTable({ data, dateRange }: LedgerTableProps) {
  const [searchInput, setSearchInput] = useState("")
  const search = useDebounce(searchInput, 400)
  const [typeFilter, setTypeFilter] = useState<"ALL" | "quantity" | "price">("ALL")
  const [page, setPage] = useState(1)
  const router = useRouter()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [atTop, setAtTop] = useState(true)
  const [atBottom, setAtBottom] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setAtTop(el.scrollTop <= 4)
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight <= 4)
  }, [])

  useEffect(() => {
    updateScrollState()
    window.addEventListener("resize", updateScrollState)
    return () => window.removeEventListener("resize", updateScrollState)
  }, [updateScrollState])

  // Filtering
  const filtered = useMemo(() => {
    let result = data
    if (typeFilter !== "ALL") result = result.filter((e) => e.type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((e) => e.cardName.toLowerCase().includes(q))
    }
    return result
  }, [data, typeFilter, search])

  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const stats = useMemo(() => {
    const qtyEntries = filtered.filter((e) => e.type === "quantity")
    const priceEntries = filtered.filter((e) => e.type === "price")
    return {
      stockAdjustments: qtyEntries.length,
      netStockChange: qtyEntries.reduce((sum, e) => sum + (e.delta ?? 0), 0),
      priceChanges: priceEntries.length,
    }
  }, [filtered])

  const rangeDays = useMemo(() => {
    if (!dateRange) return null
    const ms = new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()
    return Math.round(ms / (1000 * 60 * 60 * 24))
  }, [dateRange])

  function setFilter(t: "ALL" | "quantity" | "price") {
    setTypeFilter(t)
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [search])

  const noResults = paged.length === 0

  // Edge mask: fade top/bottom when scrollable content exists beyond the edge
  const maskImage =
    !atTop && !atBottom
      ? "linear-gradient(to bottom, transparent 0, black 32px, black calc(100% - 32px), transparent 100%)"
      : !atTop
        ? "linear-gradient(to bottom, transparent 0, black 32px, black 100%)"
        : !atBottom
          ? "linear-gradient(to bottom, black 0, black calc(100% - 32px), transparent 100%)"
          : "none"

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Masthead */}
      <section className="px-6 sm:px-10 pt-8 pb-6 shrink-0">
        <Eyebrow className="mb-3">
          Audit · {rangeDays ? `Last ${rangeDays} days` : "All time"}
        </Eyebrow>
        <h1
          className="m-0"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(36px, 4.2vw, 56px)",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 0.95,
            color: "var(--ink)",
          }}
        >
          The ledger.
        </h1>
        <p
          className="mt-3 max-w-[560px]"
          style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}
        >
          Every quantity change, every price update. A complete record of what moved through the
          binder.
        </p>

        {/* Inline stats — dashed dividers, no bordered cards */}
        <div className="mt-6 flex flex-wrap items-baseline gap-x-10 gap-y-3">
          <StatInline label="Stock adjustments" value={stats.stockAdjustments.toLocaleString()} />
          <StatInline
            label="Net stock change"
            value={`${stats.netStockChange > 0 ? "+" : ""}${stats.netStockChange.toLocaleString()}`}
            tone={stats.netStockChange === 0 ? "ink" : stats.netStockChange > 0 ? "green" : "hot"}
          />
          <StatInline label="Price changes" value={stats.priceChanges.toLocaleString()} />
          <StatInline label="Total entries" value={data.length.toLocaleString()} muted />
        </div>
      </section>

      {/* Toolbar — borderless, uses a soft bg-sunk strip */}
      <section
        className="px-6 sm:px-10 py-3 shrink-0 flex flex-wrap items-center gap-2"
        style={{ background: "var(--bg-sunk)" }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "var(--ink-3)" }}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search cards…"
            className="w-full pl-9 pr-8 h-9 rounded-[var(--radius-sm)] outline-none focus:ring-2"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--rule-strong)",
              fontSize: 13,
              color: "var(--ink)",
            }}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded grid place-items-center transition-colors"
              style={{ color: "var(--ink-3)" }}
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type filter — three chip buttons */}
        <div
          className="inline-flex items-center gap-0.5 p-0.5 rounded-[var(--radius-sm)]"
          style={{ background: "var(--surface)", border: "1px solid var(--rule-strong)" }}
        >
          {(["ALL", "quantity", "price"] as const).map((key) => {
            const active = typeFilter === key
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-3 h-7 rounded-[var(--radius-sharp)] transition-colors"
                style={{
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--bg)" : "var(--ink-3)",
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {key === "ALL" ? "All" : key === "quantity" ? "Stock" : "Price"}
              </button>
            )
          })}
        </div>

        {/* Date presets */}
        {dateRange && (
          <div
            className="inline-flex items-center gap-0.5 p-0.5 rounded-[var(--radius-sm)]"
            style={{ background: "var(--surface)", border: "1px solid var(--rule-strong)" }}
          >
            {[
              { label: "7d", days: 7 },
              { label: "30d", days: 30 },
              { label: "90d", days: 90 },
            ].map(({ label, days }) => {
              const active = rangeDays === days
              return (
                <button
                  key={label}
                  onClick={() => {
                    const end = new Date()
                    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
                    router.push(
                      `/admin/ledger?start=${start.toISOString()}&end=${end.toISOString()}`
                    )
                  }}
                  className="px-3 h-7 rounded-[var(--radius-sharp)] transition-colors"
                  style={{
                    background: active ? "var(--ink)" : "transparent",
                    color: active ? "var(--bg)" : "var(--ink-3)",
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex-1" />

        {filtered.length !== data.length && (
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>
              {filtered.length.toLocaleString()}
            </span>{" "}
            / {data.length.toLocaleString()}
          </span>
        )}

        <ExportButton dateRange={dateRange} typeFilter={typeFilter} />
      </section>

      {/* Entries list */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex-1 overflow-y-auto"
        style={{
          maskImage,
          WebkitMaskImage: maskImage,
        }}
      >
        {noResults ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div
              className="serif mb-2"
              style={{ fontSize: 28, letterSpacing: "-0.02em", color: "var(--ink-2)" }}
            >
              <span className="serif-italic">Nothing</span> in the ledger.
            </div>
            <p
              className="max-w-[320px]"
              style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55 }}
            >
              No entries match the current filters. Try clearing them or widening the date range.
            </p>
            {(search || typeFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearchInput("")
                  setFilter("ALL")
                }}
                className="mt-4 underline"
                style={{ fontSize: 12, color: "var(--accent-hot)" }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 sm:px-6 py-2">
            {/* Column headings — mono, subtle */}
            <div
              className="hidden md:grid gap-4 px-4 py-2 font-mono uppercase"
              style={{
                gridTemplateColumns:
                  "140px 1fr 110px 180px minmax(100px, 140px) minmax(120px, 1fr)",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: "var(--ink-4)",
              }}
            >
              <span>Time</span>
              <span>Card</span>
              <span>Type</span>
              <span>Change</span>
              <span>Set</span>
              <span>Source</span>
            </div>

            {/* Rows */}
            <div className="flex flex-col">
              {paged.map((entry) => {
                const rail = entry.type === "price" ? "var(--signal-amber)" : "var(--accent-cool)"
                return (
                  <div
                    key={`${entry.type}-${entry.id}`}
                    className="ledger-row grid gap-4 px-4 py-3 rounded-[var(--radius-sm)] transition-colors items-center"
                    style={
                      {
                        gridTemplateColumns: "1fr auto",
                        "--rail-color": rail,
                      } as React.CSSProperties
                    }
                  >
                    {/* Desktop grid */}
                    <div
                      className="hidden md:grid gap-4 items-center"
                      style={{
                        gridTemplateColumns:
                          "140px 1fr 110px 180px minmax(100px, 140px) minmax(120px, 1fr)",
                        gridColumn: "1 / -1",
                      }}
                    >
                      {/* Time */}
                      <span
                        className="font-mono tabular-nums"
                        style={{ fontSize: 11.5, color: "var(--ink-3)", letterSpacing: "0.02em" }}
                        title={format(new Date(entry.time), "MMM d, yyyy · h:mm:ss a")}
                      >
                        {format(new Date(entry.time), "MMM d · h:mm a")}
                      </span>

                      {/* Card */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Link
                          href={`/admin/collection?q=${encodeURIComponent(entry.cardName)}`}
                          className="truncate hover:underline"
                          style={{
                            fontSize: 13.5,
                            fontWeight: 500,
                            color: "var(--ink)",
                            letterSpacing: "-0.005em",
                          }}
                          title={entry.cardName}
                        >
                          {entry.cardName}
                        </Link>
                        {(entry.finish === "foil" || entry.finish === "etched") && (
                          <span
                            className="font-mono uppercase shrink-0"
                            style={{
                              fontSize: 9,
                              padding: "1px 5px",
                              borderRadius: "var(--radius-sharp)",
                              border:
                                "1px solid color-mix(in srgb, var(--accent-hot) 30%, transparent)",
                              color: "var(--accent-hot)",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {entry.finish}
                          </span>
                        )}
                      </div>

                      {/* Type */}
                      <TypeDot type={entry.type} />

                      {/* Change */}
                      {entry.type === "price" ? (
                        <PriceChange
                          oldPrice={entry.oldPrice ?? 0}
                          newPrice={entry.newPrice ?? 0}
                        />
                      ) : (
                        <QtyChange delta={entry.delta ?? 0} />
                      )}

                      {/* Set */}
                      <span
                        className="font-mono uppercase truncate"
                        style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.06em" }}
                      >
                        {entry.cardSet ?? "—"}
                      </span>

                      {/* Source */}
                      <span
                        className="truncate"
                        style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic" }}
                        title={
                          entry.type === "quantity" ? (entry.reason ?? "") : (entry.source ?? "")
                        }
                      >
                        {entry.type === "quantity" ? (entry.reason ?? "—") : (entry.source ?? "—")}
                      </span>
                    </div>

                    {/* Mobile layout — single cell */}
                    <div className="md:hidden min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TypeDot type={entry.type} />
                        <span
                          className="font-mono tabular-nums"
                          style={{
                            fontSize: 10.5,
                            color: "var(--ink-4)",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {format(new Date(entry.time), "MMM d · h:mm a")}
                        </span>
                      </div>
                      <Link
                        href={`/admin/collection?q=${encodeURIComponent(entry.cardName)}`}
                        className="block truncate"
                        style={{
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: "var(--ink)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {entry.cardName}
                      </Link>
                    </div>
                    <div className="md:hidden text-right shrink-0">
                      {entry.type === "price" ? (
                        <PriceChange
                          oldPrice={entry.oldPrice ?? 0}
                          newPrice={entry.newPrice ?? 0}
                        />
                      ) : (
                        <QtyChange delta={entry.delta ?? 0} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="px-6 sm:px-10 h-12 flex items-center justify-between shrink-0"
          style={{ background: "var(--bg-sunk)" }}
        >
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.04em" }}
          >
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>
              {(currentPage - 1) * PAGE_SIZE + 1}
            </span>
            –
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>
              {Math.min(currentPage * PAGE_SIZE, totalCount)}
            </span>{" "}
            of {totalCount.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--rule-strong)",
                color: "var(--ink-2)",
              }}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span
              className="font-mono px-3 tabular-nums"
              style={{ fontSize: 11, color: "var(--ink-2)" }}
            >
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--rule-strong)",
                color: "var(--ink-2)",
              }}
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Inline stat helper ────────────────────────────────────────

function StatInline({
  label,
  value,
  tone = "ink",
  muted = false,
}: {
  label: string
  value: string
  tone?: "ink" | "green" | "hot"
  muted?: boolean
}) {
  const color =
    tone === "green" ? "var(--signal-green)" : tone === "hot" ? "var(--accent-hot)" : "var(--ink)"
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="font-sans tabular-nums"
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          color: muted ? "var(--ink-3)" : color,
        }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase"
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "var(--ink-3)",
        }}
      >
        {label}
      </span>
    </div>
  )
}
