"use client"

import { useState, useMemo } from "react"
import type { TradeBinderItemDTO, HoldingDTO } from "@/lib/dtos"
import { Search, Plus } from "lucide-react"
import { FILTER_OPTIONS } from "@/lib/constants"
import { MakeOfferWizard } from "./trade-binder/MakeOfferWizard"
import { ListingDetailDialog } from "./trade-binder/ListingDetailDialog"
import { CreateListingDialog } from "./trade-binder/CreateListingDialog"
import { Button } from "@/components/ui/button"
import { Masthead } from "./trade-binder/Masthead"
import { FeatureStrip } from "./trade-binder/FeatureStrip"
import { ListingCard } from "./trade-binder/ListingCard"
import { EmptyShelf } from "./trade-binder/EmptyShelf"
import { Eyebrow } from "@/components/ui/graphite"

interface TradeBinderClientProps {
  listings: TradeBinderItemDTO[]
  currentUserId: string
  myHoldings: HoldingDTO[]
}

export function TradeBinderClient({ listings, currentUserId, myHoldings }: TradeBinderClientProps) {
  const [search, setSearch] = useState("")
  const [gameFilter, setGameFilter] = useState("")
  const [conditionFilter, setConditionFilter] = useState("")
  const [sortBy, setSortBy] = useState<"new" | "price-high" | "price-low" | "offers">("new")
  const [onlyTradable, setOnlyTradable] = useState(false)

  const [openListing, setOpenListing] = useState<TradeBinderItemDTO | null>(null)
  const [offerListing, setOfferListing] = useState<TradeBinderItemDTO | null>(null)
  const [showOfferDialog, setShowOfferDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const filtered = useMemo(() => {
    let result = listings
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          l.card.name.toLowerCase().includes(q) ||
          l.card.setName.toLowerCase().includes(q) ||
          (l.owner.displayName ?? "").toLowerCase().includes(q) ||
          l.owner.email.toLowerCase().includes(q)
      )
    }
    if (gameFilter) {
      result = result.filter((l) => l.card.game.toLowerCase() === gameFilter.toLowerCase())
    }
    if (conditionFilter) {
      result = result.filter((l) => l.condition === conditionFilter)
    }
    if (onlyTradable) {
      result = result.filter((l) => l.askType === "trade_only" || l.askType === "percent")
    }

    const sorted = [...result]
    if (sortBy === "price-high")
      sorted.sort((a, b) => (b.card.marketPrice ?? 0) - (a.card.marketPrice ?? 0))
    else if (sortBy === "price-low")
      sorted.sort((a, b) => (a.card.marketPrice ?? 0) - (b.card.marketPrice ?? 0))
    else if (sortBy === "offers") sorted.sort((a, b) => b.offerCount - a.offerCount)
    return sorted
  }, [listings, search, gameFilter, conditionFilter, onlyTradable, sortBy])

  const games = useMemo(() => {
    const s = new Set(listings.map((l) => l.card.game))
    return Array.from(s).sort()
  }, [listings])

  const feature = useMemo(() => {
    const others = filtered.filter((l) => l.owner.id !== currentUserId)
    return (
      [...others].sort((a, b) => (b.card.marketPrice ?? 0) - (a.card.marketPrice ?? 0))[0] ??
      filtered[0] ??
      null
    )
  }, [filtered, currentUserId])

  const handleOpenListing = (listing: TradeBinderItemDTO) => {
    setOpenListing(listing)
  }
  const handleCreateListing = () => {
    setShowCreateDialog(true)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1440px] mx-auto pb-12">
          <Masthead listings={listings} currentUserId={currentUserId} />

          {feature && (
            <FeatureStrip
              listing={feature}
              onOpen={() => handleOpenListing(feature)}
              onCreateListing={handleCreateListing}
            />
          )}

          {/* Toolbar */}
          <div className="px-8 pt-4.5 flex items-baseline justify-between mb-3.5">
            <div>
              <Eyebrow>The Binder</Eyebrow>
              <div className="serif mt-1" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
                {filtered.length} {filtered.length === 1 ? "listing" : "listings"}
              </div>
            </div>
            <Button variant="default" onClick={handleCreateListing}>
              <Plus className="w-4 h-4 mr-2" />
              List a card
            </Button>
          </div>

          <div
            className="mx-8 mb-4.5 flex flex-wrap items-center gap-1 p-1"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius)",
            }}
          >
            <div className="relative flex-1 min-w-[220px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: "var(--ink-3)" }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cards, sets, members…"
                className="w-full pl-9 pr-3 bg-transparent outline-none"
                style={{ height: 34, fontSize: 13, color: "var(--ink)" }}
              />
            </div>

            <div className="w-px h-5" style={{ background: "var(--rule)" }} />

            {games.length > 0 && (
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="px-2 bg-transparent outline-none cursor-pointer"
                style={{ height: 30, fontSize: 11.5, color: "var(--ink-2)" }}
              >
                <option value="">All games</option>
                {games.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}

            <div className="w-px h-5" style={{ background: "var(--rule)" }} />

            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="px-2 bg-transparent outline-none cursor-pointer"
              style={{ height: 30, fontSize: 11.5, color: "var(--ink-2)" }}
            >
              <option value="">Any condition</option>
              {FILTER_OPTIONS.conditions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-2 bg-transparent outline-none cursor-pointer"
              style={{ height: 30, fontSize: 11.5, color: "var(--ink-2)" }}
            >
              <option value="new">Newest</option>
              <option value="price-high">Price ↓</option>
              <option value="price-low">Price ↑</option>
              <option value="offers">Most offers</option>
            </select>

            <label
              className="flex items-center gap-1.5 px-3 cursor-pointer"
              style={{ height: 34, fontSize: 11.5, color: "var(--ink-2)" }}
            >
              <input
                type="checkbox"
                checked={onlyTradable}
                onChange={(e) => setOnlyTradable(e.target.checked)}
              />
              Trade-only
            </label>
          </div>

          {/* Grid / empty */}
          <div className="px-8">
            {filtered.length === 0 ? (
              <EmptyShelf onCreate={handleCreateListing} />
            ) : (
              <div
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0"
                style={{
                  borderTop: "1px solid var(--rule)",
                  borderLeft: "1px solid var(--rule)",
                }}
              >
                {filtered.map((listing, i) => (
                  <ListingCard
                    key={listing.holdingId}
                    listing={listing}
                    currentUserId={currentUserId}
                    index={i}
                    onClick={() => handleOpenListing(listing)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {openListing && (
        <ListingDetailDialog
          listing={openListing}
          currentUserId={currentUserId}
          onClose={() => setOpenListing(null)}
          onMakeOffer={() => {
            setOfferListing(openListing)
            setShowOfferDialog(true)
            setOpenListing(null)
          }}
        />
      )}

      {offerListing && (
        <MakeOfferWizard
          listing={offerListing}
          currentUserId={currentUserId}
          myHoldings={myHoldings}
          open={showOfferDialog}
          onClose={() => {
            setShowOfferDialog(false)
            setOfferListing(null)
          }}
        />
      )}

      {showCreateDialog && (
        <CreateListingDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          myHoldings={myHoldings}
        />
      )}
    </div>
  )
}
