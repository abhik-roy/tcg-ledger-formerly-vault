"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { TradeBinderItemDTO, HoldingDTO } from "@/lib/dtos"
import { makeOffer } from "@/app/actions/trade-offer"
import { CardPickerDialog, type PickedCard } from "./CardPickerDialog"
import { ImageIcon, X, Plus, Loader2, DollarSign } from "lucide-react"
import { toast } from "sonner"

interface MakeOfferDialogProps {
  listing: TradeBinderItemDTO | null
  open: boolean
  onClose: () => void
  myHoldings: HoldingDTO[]
  onSuccess?: () => void
}

function formatAskPrice(listing: TradeBinderItemDTO): string {
  if (listing.askType === "trade_only") return "Trade Only"
  if (listing.askPrice != null) return `$${(listing.askPrice / 100).toFixed(2)}`
  if (listing.askType === "percent" && listing.askValue != null)
    return `${listing.askValue}% of market`
  if (listing.askType === "custom" && listing.askValue != null)
    return `$${(listing.askValue / 100).toFixed(2)}`
  return "No ask price"
}

export function MakeOfferDialog({
  listing,
  open,
  onClose,
  myHoldings,
  onSuccess,
}: MakeOfferDialogProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [cashDollars, setCashDollars] = useState("")
  const [message, setMessage] = useState("")
  const [offeredCards, setOfferedCards] = useState<PickedCard[]>([])
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Dialog open/close management
  const prevOpen = useRef(false)
  useEffect(() => {
    if (open && !prevOpen.current) {
      setCashDollars("")
      setMessage("")
      setOfferedCards([])
      setTimeout(() => dialogRef.current?.showModal(), 0)
    }
    if (!open && prevOpen.current) {
      dialogRef.current?.close()
    }
    prevOpen.current = open
  }, [open])

  const cashCents = Math.round((parseFloat(cashDollars) || 0) * 100)
  const cardsValue = offeredCards.reduce(
    (sum, c) => sum + (c.card.marketPrice ?? 0) * c.quantity,
    0
  )
  const totalValue = cashCents + cardsValue

  function removeCard(holdingId: string) {
    setOfferedCards((prev) => prev.filter((c) => c.holdingId !== holdingId))
  }

  function handleCardsPicked(cards: PickedCard[]) {
    setOfferedCards((prev) => {
      const existing = new Map(prev.map((c) => [c.holdingId, c]))
      for (const card of cards) {
        existing.set(card.holdingId, card)
      }
      return Array.from(existing.values())
    })
  }

  async function handleSubmit() {
    if (!listing) return
    if (cashCents <= 0 && offeredCards.length === 0) {
      toast.error("Offer must include cash or cards")
      return
    }

    setSubmitting(true)
    const result = await makeOffer({
      holdingId: listing.holdingId,
      cashAmount: cashCents,
      message: message.trim() || undefined,
      cards: offeredCards.map((c) => ({
        holdingId: c.holdingId,
        quantity: c.quantity,
      })),
    })
    setSubmitting(false)

    if (result.success) {
      toast.success("Offer sent!")
      onSuccess?.()
      onClose()
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  if (!listing) return null

  return (
    <>
      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 bg-card border border-border rounded-lg p-0 w-[90vw] max-w-md shadow-xl"
        onClick={(e) => {
          if (e.target === dialogRef.current) onClose()
        }}
        onClose={onClose}
      >
        <div className="p-4 flex flex-col max-h-[85vh] overflow-y-auto">
          {/* Header: listing card info */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Make an Offer</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Listing card */}
          <div className="flex gap-3 mb-4 p-3 bg-muted/30 rounded-lg border border-border">
            <div className="w-14 h-20 relative bg-muted rounded border border-border shrink-0 overflow-hidden">
              {listing.card.imageSmall ? (
                <Image
                  src={listing.card.imageSmall}
                  alt={listing.card.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{listing.card.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-caption bg-muted px-1.5 py-0.5 rounded text-foreground/60 font-medium uppercase tracking-wide">
                  {listing.card.set}
                </span>
                <span className="text-caption text-muted-foreground">{listing.condition}</span>
              </div>
              <p className="text-xs font-medium text-primary mt-1">
                Ask: {formatAskPrice(listing)}
              </p>
            </div>
          </div>

          {/* Cash input */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Cash Offer
            </label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashDollars}
                onChange={(e) => setCashDollars(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 pl-8 pr-3 bg-muted/40 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors tabular-nums"
              />
            </div>
          </div>

          {/* Card offers */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Cards to Offer</label>
              <button
                onClick={() => setShowCardPicker(true)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-h-[32px]"
              >
                <Plus className="w-3 h-3" />
                Add cards
              </button>
            </div>
            {offeredCards.length > 0 ? (
              <div className="space-y-1.5">
                {offeredCards.map((c) => (
                  <div
                    key={c.holdingId}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded border border-border"
                  >
                    <div className="w-6 h-8 relative bg-muted rounded border border-border shrink-0 overflow-hidden">
                      {c.card.imageSmall ? (
                        <Image
                          src={c.card.imageSmall}
                          alt={c.card.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-2 h-2 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        {c.card.name}
                      </p>
                      <span className="text-caption text-muted-foreground">
                        x{c.quantity} {c.condition}
                        {c.card.marketPrice != null && (
                          <> - ${((c.card.marketPrice * c.quantity) / 100).toFixed(2)}</>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => removeCard(c.holdingId)}
                      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-caption text-muted-foreground/60 py-2">No cards added yet.</p>
            )}
          </div>

          {/* Message */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note..."
              maxLength={512}
              rows={2}
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {/* Value comparison bar */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Ask: <span className="font-medium text-foreground">{formatAskPrice(listing)}</span>
              </span>
              <span className="text-muted-foreground">
                Your offer:{" "}
                <span className="font-medium text-foreground">
                  {cashCents > 0 && `$${(cashCents / 100).toFixed(2)} cash`}
                  {cashCents > 0 && cardsValue > 0 && " + "}
                  {cardsValue > 0 && `$${(cardsValue / 100).toFixed(2)} cards`}
                  {cashCents === 0 && cardsValue === 0 && "$0.00"}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-end mt-1">
              <span className="text-xs font-bold text-foreground">
                = ${(totalValue / 100).toFixed(2)} total
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || (cashCents <= 0 && offeredCards.length === 0)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Send Offer
            </button>
          </div>
        </div>
      </dialog>

      <CardPickerDialog
        open={showCardPicker}
        onClose={() => setShowCardPicker(false)}
        onSelect={handleCardsPicked}
        holdings={myHoldings}
      />
    </>
  )
}
