"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { TradeBinderItemDTO, HoldingDTO } from "@/lib/dtos"
import { Search, Repeat2, ImageIcon, Loader2, Undo2, Send, Package } from "lucide-react"
import { FILTER_OPTIONS } from "@/lib/constants"
import { withdrawOffer } from "@/app/actions/trade-offer"
import { MakeOfferDialog } from "./MakeOfferDialog"
import { OffersPanel } from "./OffersPanel"
import { toast } from "sonner"

interface TradeBinderClientProps {
  listings: TradeBinderItemDTO[]
  currentUserId: string
  myHoldings: HoldingDTO[]
}

function formatAskPrice(listing: TradeBinderItemDTO): string | null {
  if (listing.askType === "trade_only") return "Trade Only"
  if (listing.askPrice != null) return `$${(listing.askPrice / 100).toFixed(2)}`
  if (listing.askType === "percent" && listing.askValue != null)
    return `${listing.askValue}% of market`
  if (listing.askType === "custom" && listing.askValue != null)
    return `$${(listing.askValue / 100).toFixed(2)}`
  return null
}

export function TradeBinderClient({ listings, currentUserId, myHoldings }: TradeBinderClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [gameFilter, setGameFilter] = useState("")
  const [conditionFilter, setConditionFilter] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showOffersPanel, setShowOffersPanel] = useState(false)
  const [offerListing, setOfferListing] = useState<TradeBinderItemDTO | null>(null)
  const [showOfferDialog, setShowOfferDialog] = useState(false)

  async function handleWithdrawOffer(holdingId: string, offerId: string) {
    setActionLoading(holdingId)
    const result = await withdrawOffer(offerId)
    if (result.success) {
      toast.success("Offer withdrawn")
      router.refresh()
    } else {
      toast.error(result.error)
    }
    setActionLoading(null)
  }

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
      result = result.filter((l) => l.card.game.toLowerCase().includes(gameFilter.toLowerCase()))
    }
    if (conditionFilter) {
      result = result.filter((l) => l.condition === conditionFilter)
    }
    return result
  }, [listings, search, gameFilter, conditionFilter])

  const games = useMemo(() => {
    const s = new Set(listings.map((l) => l.card.game))
    return Array.from(s).sort()
  }, [listings])

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center gap-3 px-4 sm:px-6 shrink-0">
        <Repeat2 className="w-4 h-4 text-primary" />
        <h1 className="text-base font-semibold text-foreground">Trade Binder</h1>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {listings.length} listing{listings.length !== 1 ? "s" : ""} across the Tailnet
        </span>
        <div className="ml-auto">
          <button
            onClick={() => setShowOffersPanel((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[44px] ${
              showOffersPanel
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Offers
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 sm:px-5 py-2 sm:h-12 border-b border-border bg-card flex flex-wrap items-center gap-2 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards, owners..."
            className="w-full h-10 sm:h-8 pl-8 pr-3 bg-muted/40 border border-border rounded-md text-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
          />
        </div>

        {games.length > 1 && (
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="h-10 sm:h-8 px-2 rounded-md text-xs font-medium border border-border bg-muted/40 text-muted-foreground hover:text-foreground transition-colors min-w-[44px]"
          >
            <option value="">All Games</option>
            {games.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}

        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          className="h-10 sm:h-8 px-2 rounded-md text-xs font-medium border border-border bg-muted/40 text-muted-foreground hover:text-foreground transition-colors min-w-[44px]"
        >
          <option value="">All Conditions</option>
          {FILTER_OPTIONS.conditions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="relative w-24 h-20 mb-4">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-16 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 -rotate-12" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-16 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-16 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 rotate-12" />
              </div>
              <p className="text-sm font-medium text-foreground">No trade listings found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                List cards for trade from the Collection page to see them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((listing) => {
                const askLabel = formatAskPrice(listing)
                const isOwn = listing.owner.id === currentUserId
                const hasPendingOffer = listing.myOffer?.status === "pending"

                return (
                  <div
                    key={listing.holdingId}
                    className="bg-card border border-border rounded-lg overflow-hidden flex flex-col card-glow hover:-translate-y-px transition-all duration-150 group"
                  >
                    {/* Card image */}
                    <div className="aspect-[3/4] relative bg-muted overflow-hidden">
                      {listing.card.imageNormal || listing.card.imageSmall ? (
                        <Image
                          src={listing.card.imageNormal || listing.card.imageSmall || ""}
                          alt={listing.card.name}
                          fill
                          className="object-contain p-1 group-hover:scale-[1.03] transition-transform duration-200"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                        </div>
                      )}

                      {/* Offer count badge */}
                      {listing.offerCount > 0 && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                          {listing.offerCount} offer{listing.offerCount > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <p
                        className="text-sm font-semibold text-foreground line-clamp-1"
                        title={listing.card.name}
                      >
                        {listing.card.name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-caption bg-muted px-1.5 py-0.5 rounded text-foreground/60 font-medium uppercase tracking-wide">
                          {listing.card.set}
                        </span>
                        <span className="text-caption text-muted-foreground">
                          {listing.condition}
                        </span>
                      </div>

                      {/* Ask price */}
                      {askLabel && (
                        <p className="text-xs font-medium text-primary mt-0.5">Ask: {askLabel}</p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-border">
                        <span
                          className="text-caption text-muted-foreground truncate max-w-[100px]"
                          title={listing.owner.email}
                        >
                          {listing.owner.displayName || listing.owner.email.split("@")[0]}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          x{listing.listedQuantity || listing.quantity}
                        </span>
                      </div>
                      {listing.tradeNotes && (
                        <p className="text-caption text-muted-foreground/70 line-clamp-2 mt-0.5">
                          {listing.tradeNotes}
                        </p>
                      )}

                      {/* Offer section */}
                      <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border">
                        <div className="ml-auto">
                          {isOwn ? (
                            <span className="text-[10px] text-muted-foreground/50">
                              Your listing
                            </span>
                          ) : hasPendingOffer ? (
                            <button
                              onClick={() =>
                                handleWithdrawOffer(listing.holdingId, listing.myOffer!.id)
                              }
                              disabled={actionLoading === listing.holdingId}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-50 min-h-[32px]"
                            >
                              {actionLoading === listing.holdingId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Undo2 className="w-3 h-3" />
                              )}
                              Withdraw Offer
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setOfferListing(listing)
                                setShowOfferDialog(true)
                              }}
                              disabled={actionLoading === listing.holdingId}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 min-h-[32px]"
                            >
                              {actionLoading === listing.holdingId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              Make Offer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Offers Panel (slide-in from the side) */}
        {showOffersPanel && (
          <div className="w-full sm:w-96 border-l border-border shrink-0 overflow-y-auto">
            <OffersPanel />
          </div>
        )}
      </div>

      {/* Make Offer Dialog */}
      <MakeOfferDialog
        listing={offerListing}
        open={showOfferDialog}
        onClose={() => {
          setShowOfferDialog(false)
          setOfferListing(null)
        }}
        myHoldings={myHoldings}
      />
    </div>
  )
}
