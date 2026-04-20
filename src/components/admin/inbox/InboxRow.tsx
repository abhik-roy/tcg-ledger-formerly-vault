"use client"

import { useRouter } from "next/navigation"
import type { TradeOfferDTO } from "@/lib/dtos"
import { CardArt, ConditionChip } from "@/components/ui/graphite"
import { Button } from "@/components/ui/button"
import { formatUsdCents } from "@/lib/graphite/format-ask"
import { ArrowRight, Repeat2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Props {
  offer: TradeOfferDTO
  idx: number
  direction: "in" | "out"
  currentUserId: string
}

const STATUS_TONES: Record<string, { c: string; label: string }> = {
  pending: { c: "var(--signal-amber)", label: "Pending" },
  accepted: { c: "var(--signal-green)", label: "Accepted" },
  declined: { c: "var(--ink-3)", label: "Declined" },
  withdrawn: { c: "var(--ink-3)", label: "Withdrawn" },
  voided: { c: "var(--ink-3)", label: "Voided" },
}

export function InboxRow({ offer, idx, direction }: Props) {
  const router = useRouter()

  const otherParty =
    direction === "in"
      ? offer.offerUser
      : (offer.listingOwner ?? { displayName: null, email: "unknown" })
  const otherName = otherParty.displayName ?? otherParty.email.split("@")[0]

  const cashPart = offer.cashAmount
  const cardsValue = offer.offeredCardsValue
  const offerTotal = cashPart + cardsValue
  const askValue = offer.askPrice ?? offer.card.marketPrice ?? 0
  const deltaPct = askValue > 0 ? ((offerTotal - askValue) / askValue) * 100 : 0
  const cardCount = offer.offeredCards.reduce((s, c) => s + c.quantity, 0)

  const tone = STATUS_TONES[offer.status] ?? { c: "var(--ink-3)", label: offer.status }

  const handleOpen = () => {
    router.push(`/admin/trade-binder?listing=${offer.holdingId}`)
  }

  return (
    <div
      className="grid items-center gap-5 py-4"
      style={{
        gridTemplateColumns: "52px 1fr auto auto",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div
        className="font-mono pl-1"
        style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em" }}
      >
        {String(idx + 1).padStart(2, "0")}
      </div>

      <div className="flex gap-3.5 items-center min-w-0">
        <CardArt card={offer.card} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5 mb-1">
            <span
              className="serif truncate"
              style={{ fontSize: 18, letterSpacing: "-0.01em", maxWidth: 280 }}
            >
              {offer.card.name}
            </span>
            <ConditionChip condition={offer.cardCondition} />
          </div>
          <div
            className="flex items-center gap-2.5 flex-wrap"
            style={{ fontSize: 11, color: "var(--ink-3)" }}
          >
            <span>
              {direction === "in" ? <>{otherName} offered you</> : <>you offered {otherName}</>}
            </span>
            <span>·</span>
            <span className="font-mono" style={{ letterSpacing: "0.04em" }}>
              {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Economics */}
      <div className="flex items-baseline gap-4">
        <div className="flex flex-col items-end">
          <span
            className="font-mono uppercase mb-0.5"
            style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em" }}
          >
            Composition
          </span>
          <div className="flex items-center gap-2" style={{ fontSize: 12 }}>
            {cashPart > 0 && <span className="price">{formatUsdCents(cashPart)}</span>}
            {cashPart > 0 && cardCount > 0 && <span style={{ color: "var(--ink-3)" }}>+</span>}
            {cardCount > 0 && (
              <span className="price">
                {cardCount} card{cardCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span
            className="font-mono uppercase mb-0.5"
            style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em" }}
          >
            vs ask
          </span>
          <span
            className="serif"
            style={{
              fontSize: 20,
              letterSpacing: "-0.02em",
              color:
                Math.abs(deltaPct) < 5
                  ? "var(--signal-green)"
                  : deltaPct < -10
                    ? "var(--accent-hot)"
                    : deltaPct > 15
                      ? "var(--accent-cool)"
                      : "var(--ink)",
            }}
          >
            {deltaPct >= 0 ? "+" : ""}
            {deltaPct.toFixed(1)}
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>%</span>
          </span>
        </div>
        <span
          className="inline-flex items-center font-mono uppercase"
          style={{
            fontSize: 9.5,
            padding: "2px 8px",
            borderRadius: 999,
            letterSpacing: "0.08em",
            color: tone.c,
            background: `color-mix(in srgb, ${tone.c} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${tone.c} 35%, transparent)`,
          }}
        >
          {tone.label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        {offer.status === "pending" && direction === "in" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleOpen()
            }}
          >
            <Repeat2 className="w-3.5 h-3.5 mr-1" />
            Review
          </Button>
        )}
        <Button
          variant={offer.status === "pending" && direction === "in" ? "default" : "ghost"}
          size="sm"
          onClick={handleOpen}
        >
          {offer.status === "pending" ? "Review" : "Open"}
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  )
}
