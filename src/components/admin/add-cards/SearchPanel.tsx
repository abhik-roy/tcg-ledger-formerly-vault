"use client"

import { useState } from "react"
import Image from "next/image"
import { searchCatalogAction } from "@/app/actions/import-helpers"
import { AddCardBtn } from "@/components/admin/AddCardBtn"
import { Search, Loader2, SlidersHorizontal, X } from "lucide-react"
import type { CardDTO } from "@/lib/dtos"

export function SearchPanel() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CardDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [filters, setFilters] = useState({ set: "", rarity: "" })
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilter = filters.set || filters.rarity

  async function handleSearch() {
    if (query.trim().length < 2) return
    setLoading(true)
    setHasSearched(true)
    let finalQuery = query
    if (filters.set) finalQuery += ` set:${filters.set}`
    if (filters.rarity) finalQuery += ` rarity:${filters.rarity}`
    const data = await searchCatalogAction(finalQuery)
    setResults(data)
    setLoading(false)
  }

  function clearFilters() {
    setFilters({ set: "", rarity: "" })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search toolbar */}
      <div className="h-12 px-4 border-b border-border bg-card flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search card name (e.g. Black Lotus)..."
            className="w-full h-8 pl-8 pr-3 bg-muted/40 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
          />
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border transition-colors ${
            showFilters || hasActiveFilter
              ? "bg-primary/10 border-primary/25 text-primary"
              : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {hasActiveFilter && (
            <span className="w-3.5 h-3.5 bg-primary text-primary-foreground rounded-full text-[9px] font-bold flex items-center justify-center">
              {(filters.set ? 1 : 0) + (filters.rarity ? 1 : 0)}
            </span>
          )}
        </button>

        <button
          onClick={handleSearch}
          disabled={loading || query.trim().length < 2}
          className="h-8 px-4 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          Search
        </button>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="px-4 h-10 border-b border-border bg-card flex items-center gap-3 shrink-0 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-label font-bold uppercase tracking-wider text-muted-foreground">
            Filter:
          </span>

          <div className="flex items-center gap-1.5">
            <label className="text-label text-muted-foreground">Set</label>
            <input
              type="text"
              placeholder="e.g. MH2"
              value={filters.set}
              onChange={(e) => setFilters((f) => ({ ...f, set: e.target.value }))}
              className="h-7 w-20 px-2 text-xs bg-muted/40 border border-border rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors uppercase"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-label text-muted-foreground">Rarity</label>
            <select
              value={filters.rarity}
              onChange={(e) => setFilters((f) => ({ ...f, rarity: e.target.value }))}
              className="h-7 px-2 text-xs bg-muted/40 border border-border rounded text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="">Any</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="mythic">Mythic</option>
            </select>
          </div>

          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-label text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Results area */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mb-3">
              <Search className="w-4 h-4 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">Search the catalog</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enter a card name above to find printings
            </p>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium text-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different name or adjust your filters
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-4">
            {results.map((card) => (
              <div
                key={card.id}
                className="bg-card border border-border rounded-lg overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-px transition-all duration-150 group"
              >
                <div className="aspect-[3/4] relative bg-muted overflow-hidden">
                  {card.imageNormal || card.imageSmall ? (
                    <Image
                      src={card.imageNormal || card.imageSmall || ""}
                      alt={card.name}
                      fill
                      className="object-contain p-1 group-hover:scale-[1.03] transition-transform duration-200"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20 text-[9px] uppercase tracking-widest">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-2 flex flex-col gap-1.5 flex-1">
                  <div>
                    <p
                      className="text-xs font-semibold text-foreground line-clamp-1"
                      title={card.name}
                    >
                      {card.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-caption bg-muted px-1.5 py-0.5 rounded text-foreground/60 font-medium uppercase tracking-wide">
                        {card.set}
                      </span>
                      {card.collectorNumber && (
                        <span className="text-caption text-muted-foreground/50">
                          #{card.collectorNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto pt-1.5 border-t border-border flex justify-end">
                    <AddCardBtn card={card} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
