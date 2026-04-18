"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useDebounce } from "@/lib/hooks"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  TrendingUp,
  ArrowRight,
  Download,
} from "lucide-react"
import type { LedgerEntryDTO } from "@/lib/dtos"

const PAGE_SIZE = 40

// -- Sub-components --

function QtyChange({ delta }: { delta: number }) {
  const positive = delta > 0
  return (
    <span
      className={`inline-flex items-center text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
        positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      }`}
    >
      {positive ? "+" : ""}
      {delta}
    </span>
  )
}

function PriceChange({ oldPrice, newPrice }: { oldPrice: number; newPrice: number }) {
  const up = newPrice > oldPrice
  return (
    <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
      <span className="line-through text-muted-foreground/50">${(oldPrice / 100).toFixed(2)}</span>
      <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
      <span className={`font-bold ${up ? "text-success" : "text-destructive"}`}>
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
      className="h-7 px-2.5 rounded-md text-label font-medium border border-border bg-muted/40 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Download className="w-3 h-3" />
      {exporting ? "Exporting\u2026" : "Export"}
    </button>
  )
}

// -- Main component --

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
  const [canScroll, setCanScroll] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScroll(el.scrollWidth > el.clientWidth)
  }, [])

  useEffect(() => {
    checkScroll()
    window.addEventListener("resize", checkScroll)
    return () => window.removeEventListener("resize", checkScroll)
  }, [checkScroll])

  // -- Filtering --

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

  // -- KPI stats --

  const stats = useMemo(() => {
    const qtyEntries = filtered.filter((e) => e.type === "quantity")
    const priceEntries = filtered.filter((e) => e.type === "price")
    return {
      stockAdjustments: qtyEntries.length,
      netStockChange: qtyEntries.reduce((sum, e) => sum + (e.delta ?? 0), 0),
      priceChanges: priceEntries.length,
    }
  }, [filtered])

  // -- Handlers --

  function setFilter(t: "ALL" | "quantity" | "price") {
    setTypeFilter(t)
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [search])

  // -- Render --

  const noResults = paged.length === 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* KPI Stats Strip */}
      <div className="px-4 sm:px-5 h-14 border-b border-border flex items-center gap-4 sm:gap-6 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-info tabular-nums">
            {stats.stockAdjustments.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">Stock Adjustments</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold tabular-nums ${stats.netStockChange >= 0 ? "text-success" : "text-destructive"}`}
          >
            {stats.netStockChange > 0 ? "+" : ""}
            {stats.netStockChange.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">Net Stock</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-warning tabular-nums">
            {stats.priceChanges.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">Price Changes</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-3 sm:px-4 py-2 sm:h-12 border-b border-border flex flex-wrap items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter by card name\u2026"
            className="w-full h-8 pl-8 pr-7 bg-muted/40 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Type segmented control */}
        <div className="flex items-center gap-0.5 bg-muted/40 border border-border rounded-md p-0.5">
          {(["ALL", "quantity", "price"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`h-6 px-2.5 rounded text-label font-medium transition-colors ${
                typeFilter === key
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {key === "ALL" ? "All" : key === "quantity" ? "Stock" : "Price"}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Filtered count */}
        {filtered.length !== data.length && (
          <span className="text-label text-muted-foreground">
            <span className="font-semibold text-foreground">
              {filtered.length.toLocaleString()}
            </span>{" "}
            of {data.length.toLocaleString()}
          </span>
        )}

        {/* Date range presets */}
        {dateRange && (
          <div className="flex items-center gap-0.5 bg-muted/40 border border-border rounded-md p-0.5">
            {[
              { label: "7d", days: 7 },
              { label: "30d", days: 30 },
              { label: "90d", days: 90 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => {
                  const end = new Date()
                  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
                  router.push(`/admin/ledger?start=${start.toISOString()}&end=${end.toISOString()}`)
                }}
                className="h-6 px-2 rounded text-label font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-card"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <ExportButton dateRange={dateRange} typeFilter={typeFilter} />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto relative">
        {noResults ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">No entries found</p>
            {(search || typeFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearchInput("")
                  setFilter("ALL")
                }}
                className="text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div ref={scrollRef} className="overflow-x-auto" onScroll={checkScroll}>
            <table className="w-full text-sm min-w-[640px]">
              <thead className="sticky top-0 z-10 bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px] sticky left-0 z-[5] bg-muted/50">
                    Time
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[180px]">
                    Card
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[160px] hidden sm:table-cell">
                    Change
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px] hidden lg:table-cell">
                    Set
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px] hidden lg:table-cell">
                    Reason/Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paged.map((entry) => (
                  <tr
                    key={`${entry.type}-${entry.id}`}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    {/* Time */}
                    <td className="px-5 py-3 sticky left-0 z-[5] bg-background group-hover:bg-muted/20 transition-colors border-r border-border">
                      <span
                        title={format(new Date(entry.time), "MMM d, yyyy \u00B7 h:mm:ss a")}
                        className="text-xs text-muted-foreground tabular-nums cursor-default"
                      >
                        {format(new Date(entry.time), "MMM d \u00B7 h:mm a")}
                      </span>
                    </td>

                    {/* Card */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/collection?q=${encodeURIComponent(entry.cardName)}`}
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors"
                          title={entry.cardName}
                        >
                          {entry.cardName}
                        </Link>
                        {(entry.finish === "foil" || entry.finish === "etched") && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase leading-none">
                            {entry.finish}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-3">
                      {entry.type === "price" ? (
                        <span className="inline-flex items-center gap-1 text-caption font-semibold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                          <TrendingUp className="w-2.5 h-2.5" /> Price
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-caption font-semibold px-1.5 py-0.5 rounded-full bg-info/10 text-info border border-info/20">
                          <Package className="w-2.5 h-2.5" /> Stock
                        </span>
                      )}
                    </td>

                    {/* Change */}
                    <td className="px-5 py-3 hidden sm:table-cell">
                      {entry.type === "price" ? (
                        <PriceChange
                          oldPrice={entry.oldPrice ?? 0}
                          newPrice={entry.newPrice ?? 0}
                        />
                      ) : (
                        <QtyChange delta={entry.delta ?? 0} />
                      )}
                    </td>

                    {/* Set */}
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {entry.cardSet ?? "\u2014"}
                      </span>
                    </td>

                    {/* Reason/Source */}
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                        {entry.type === "quantity"
                          ? (entry.reason ?? "\u2014")
                          : (entry.source ?? "\u2014")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {canScroll && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-background" />
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 h-11 border-t border-border flex items-center justify-between text-label text-muted-foreground shrink-0">
          <span>
            {(currentPage - 1) * PAGE_SIZE + 1}&ndash;
            {Math.min(currentPage * PAGE_SIZE, totalCount)} of{" "}
            <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-md border border-border hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-foreground font-medium tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-md border border-border hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
