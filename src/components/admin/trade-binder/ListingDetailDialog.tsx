"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Shield, Info, Inbox, Pencil, MessageSquare, Handshake } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CardArt, Eyebrow } from "@/components/ui/graphite"
import { OfferCard } from "./OfferCard"
import {
  getOffersForListing,
  acceptOffer,
  declineOffer,
  withdrawOffer,
} from "@/app/actions/trade-offer"
import { formatUsdCents } from "@/lib/graphite/format-ask"
import { formatAsk } from "@/lib/graphite/format-ask"
import type { TradeBinderItemDTO, TradeOfferDTO } from "@/lib/dtos"

interface ListingDetailDialogProps {
  listing: TradeBinderItemDTO
  currentUserId: string
  onClose: () => void
  onMakeOffer: () => void
}

const GAME_COLORS: Record<string, string> = {
  magic: "#60a5fa",
  pokemon: "#f87171",
  yugioh: "#c084fc",
  lorcana: "#818cf8",
}

export function ListingDetailDialog({
  listing,
  currentUserId,
  onClose,
  onMakeOffer,
}: ListingDetailDialogProps) {
  const router = useRouter()
  const [offers, setOffers] = useState<TradeOfferDTO[]>([])
  const [loading, setLoading] = useState(true)

  const isOwn = listing.owner.id === currentUserId
  const myOffer = offers.find((o) => o.offerUser.id === currentUserId) ?? null
  const pendingCount = offers.filter((o) => o.status === "pending").length

  const color = GAME_COLORS[listing.card.game.toLowerCase()] ?? "#888"

  const askDisplay = formatAsk(listing.askType, listing.askValue, listing.card.marketPrice) ?? "—"
  const isTradeOnly = listing.askType === "trade_only"

  async function loadOffers() {
    setLoading(true)
    const result = await getOffersForListing(listing.holdingId)
    if (result.success) {
      setOffers(result.data)
    } else {
      toast.error(result.error ?? "Failed to load offers")
    }
    setLoading(false)
  }

  useEffect(() => {
    loadOffers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.holdingId])

  async function handleAccept(offerId: string) {
    const result = await acceptOffer(offerId)
    if (result.success) {
      toast.success("Offer accepted — trade complete!")
      await loadOffers()
      router.refresh()
    } else {
      toast.error(result.error ?? "Failed to accept offer")
    }
  }

  async function handleDecline(offerId: string) {
    const result = await declineOffer(offerId)
    if (result.success) {
      toast.success("Offer declined.")
      await loadOffers()
      router.refresh()
    } else {
      toast.error(result.error ?? "Failed to decline offer")
    }
  }

  async function handleWithdraw(offerId: string) {
    const result = await withdrawOffer(offerId)
    if (result.success) {
      toast.success("Offer withdrawn.")
      await loadOffers()
      router.refresh()
    } else {
      toast.error(result.error ?? "Failed to withdraw offer")
    }
  }

  const ownerName = listing.owner.displayName ?? listing.owner.email
  const ownerInitials = ownerName.slice(0, 2).toUpperCase()

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{ maxWidth: 1080, width: "calc(100vw - 48px)" }}
        showCloseButton={false}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: "480px 1fr",
            minHeight: 640,
            maxHeight: "calc(100vh - 96px)",
          }}
        >
          {/* ── Left pane: dark stage ── */}
          <div
            className="flex flex-col overflow-y-auto"
            style={{
              padding: "36px 32px 32px",
              background: `radial-gradient(ellipse at 50% 38%, color-mix(in srgb, ${color} 30%, #0a0a0c) 0%, #0a0a0c 65%), #0a0a0c`,
              color: "#fafafa",
              position: "relative",
            }}
          >
            {/* Fine grain texture */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.015) 3px 4px)",
                pointerEvents: "none",
              }}
            />

            {/* Top meta bar */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 8,
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                Listing № {listing.holdingId.slice(-5).toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {listing.card.game === "yugioh" ? "YU-GI-OH" : listing.card.game.toUpperCase()}
              </div>
            </div>

            {/* Card art centered */}
            <div
              style={{
                flex: 1,
                display: "grid",
                placeItems: "center",
                padding: "20px 0",
                position: "relative",
              }}
            >
              <div style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.5))" }}>
                <CardArt card={listing.card} size="xl" />
              </div>
            </div>

            {/* Card identity */}
            <div style={{ marginTop: 24, position: "relative" }}>
              <div
                className="serif"
                style={{ fontSize: 34, lineHeight: 1.05, letterSpacing: "-0.022em", color: "#fff" }}
              >
                {listing.card.name}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  marginTop: 8,
                  color: "rgba(255,255,255,0.55)",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {listing.card.setName} · № {listing.card.collectorNumber} · {listing.card.rarity}
              </div>

              {/* Condition + finish badges */}
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <div
                  style={{
                    padding: "3px 9px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 999,
                    fontSize: 10,
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {listing.condition}
                </div>
                {listing.card.finish && listing.card.finish !== "nonfoil" && (
                  <div
                    style={{
                      padding: "3px 9px",
                      border: "1px solid rgba(255,200,80,0.4)",
                      borderRadius: 999,
                      fontSize: 10,
                      color: "rgb(255,200,80)",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {listing.card.finish}
                  </div>
                )}
              </div>

              {/* Trade notes */}
              {listing.tradeNotes && (
                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 18,
                    borderTop: "1px solid rgba(255,255,255,0.12)",
                    fontSize: 16,
                    lineHeight: 1.5,
                    color: "rgba(255,255,255,0.78)",
                    fontStyle: "italic",
                    fontFamily: "var(--font-serif)",
                  }}
                >
                  &ldquo;{listing.tradeNotes}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* ── Right pane: offer thread ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: "var(--bg)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "22px 28px 18px",
                borderBottom: "1px solid var(--rule)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <Eyebrow>{isOwn ? "Your listing" : "Offer thread"}</Eyebrow>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
                    {offers.length === 0
                      ? "No offers yet"
                      : `${offers.length} offer${offers.length !== 1 ? "s" : ""}`}
                  </h2>
                  {pendingCount > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--ink-3)",
                        letterSpacing: "0.06em",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {pendingCount} pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Price panel */}
            <div
              style={{
                padding: "16px 28px",
                borderBottom: "1px solid var(--rule)",
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                {/* Ask */}
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-3)",
                    }}
                  >
                    Ask
                  </div>
                  <div
                    className="serif"
                    style={{
                      fontSize: 26,
                      lineHeight: 1,
                      marginTop: 4,
                      color: isTradeOnly ? "var(--signal-green)" : "var(--ink)",
                    }}
                  >
                    {askDisplay}
                  </div>
                </div>

                {/* Market */}
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-3)",
                    }}
                  >
                    Market
                  </div>
                  <div
                    className="serif"
                    style={{ fontSize: 26, lineHeight: 1, marginTop: 4, color: "var(--ink-2)" }}
                  >
                    {listing.card.marketPrice != null
                      ? formatUsdCents(listing.card.marketPrice)
                      : "—"}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--ink-3)",
                      letterSpacing: "0.08em",
                      marginTop: 4,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    30-DAY MEDIAN
                  </div>
                </div>

                {/* Owner */}
                <div
                  style={{
                    borderLeft: "1px solid var(--rule)",
                    paddingLeft: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "var(--bg-sunk)",
                      border: "1px solid var(--rule)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--ink-2)",
                      fontFamily: "var(--font-mono)",
                      flexShrink: 0,
                    }}
                  >
                    {ownerInitials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                      {ownerName}
                      {isOwn && (
                        <span style={{ color: "var(--ink-3)", fontWeight: 400 }}> · you</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Offers list */}
            <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 120,
                    color: "var(--ink-3)",
                    fontSize: 13,
                  }}
                >
                  Loading offers…
                </div>
              ) : offers.length === 0 ? (
                <div style={{ padding: "50px 24px 40px", textAlign: "center" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      margin: "0 auto 18px",
                      borderRadius: "50%",
                      background: "var(--bg-sunk)",
                      border: "1px solid var(--rule)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--ink-3)",
                    }}
                  >
                    <Inbox size={22} />
                  </div>
                  <div className="serif" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>
                    {isOwn ? (
                      <>
                        The binder is <em>quiet</em>.
                      </>
                    ) : (
                      <>
                        Be the <em>first</em>.
                      </>
                    )}
                  </div>
                  <p
                    style={{
                      maxWidth: 340,
                      margin: "8px auto 0",
                      fontSize: 13,
                      color: "var(--ink-3)",
                    }}
                  >
                    {isOwn
                      ? "Your listing is live. Offers from other collectors will land here."
                      : `No one has offered yet. Send a cash, card, or mixed offer to ${listing.owner.displayName?.split(" ")[0] ?? "the owner"}.`}
                  </p>
                  {!isOwn && (
                    <div style={{ marginTop: 20 }}>
                      <Button onClick={onMakeOffer}>
                        <Handshake />
                        Open the offer composer
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {offers.map((offer) => {
                    const viewAs = isOwn
                      ? "owner"
                      : offer.offerUser.id === currentUserId
                        ? "mine"
                        : "other"
                    return (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        listing={listing}
                        viewAs={viewAs}
                        onAccept={() => handleAccept(offer.id)}
                        onDecline={() => handleDecline(offer.id)}
                        onCounter={() => alert("Counter-offer wizard lands in Phase 5.")}
                        onWithdraw={() => handleWithdraw(offer.id)}
                        onRevise={() => alert("Offer revision wizard lands in Phase 5.")}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* Action bar */}
            <div
              style={{
                padding: "14px 22px",
                borderTop: "1px solid var(--rule)",
                background: "var(--bg-sunk)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {isOwn ? (
                <>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 11.5,
                      color: "var(--ink-3)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Info size={12} /> Edit or unlist from your Collection.
                  </div>
                  <Button variant="ghost" onClick={() => alert("Edit listing lands in Phase 6.")}>
                    <Pencil />
                    Edit listing
                  </Button>
                </>
              ) : myOffer ? (
                <>
                  <div style={{ flex: 1, fontSize: 12, color: "var(--ink)" }}>
                    You have an active offer —{" "}
                    <span style={{ color: "var(--ink-3)" }}>revise it below.</span>
                  </div>
                  <Button variant="ghost" onClick={() => handleWithdraw(myOffer.id)}>
                    Withdraw
                  </Button>
                  <Button onClick={onMakeOffer}>
                    <Pencil />
                    Revise offer
                  </Button>
                </>
              ) : (
                <>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 11.5,
                      color: "var(--ink-3)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Shield size={12} style={{ color: "var(--signal-green)" }} />
                    Escrow-protected · both sides ship before release.
                  </div>
                  <Button variant="outline">
                    <MessageSquare />
                    Message
                  </Button>
                  <Button onClick={onMakeOffer}>
                    <Handshake />
                    Make an offer
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
