"use client"

import { formatDistanceToNow } from "date-fns"
import { Check, X, Repeat2, Undo2, Pencil, ArrowLeftRight, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardArt, StatusPill } from "@/components/ui/graphite"
import { computeFairness } from "@/lib/graphite/fairness"
import { formatUsdCents } from "@/lib/graphite/format-ask"
import type { TradeOfferDTO, TradeBinderItemDTO } from "@/lib/dtos"

interface OfferCardProps {
  offer: TradeOfferDTO
  listing: TradeBinderItemDTO
  viewAs: "owner" | "mine" | "other"
  onAccept?: () => void
  onDecline?: () => void
  onCounter?: () => void
  onWithdraw?: () => void
  onRevise?: () => void
}

function getInitials(name: string | null | undefined, email: string): string {
  const source = name ?? email
  return source.slice(0, 2).toUpperCase()
}

export function OfferCard({
  offer,
  listing,
  viewAs,
  onAccept,
  onDecline,
  onCounter,
  onWithdraw,
  onRevise,
}: OfferCardProps) {
  const askCents =
    listing.askType === "trade_only"
      ? (listing.card.marketPrice ?? 0)
      : (listing.askPrice ?? listing.askValue ?? 0)

  const offerTotal =
    offer.cashAmount +
    offer.offeredCards.reduce((s, oc) => s + (oc.marketValue ?? 0) * oc.quantity, 0)

  const fairness = computeFairness(offerTotal, askCents)

  const toneColor = {
    fair: "var(--signal-green)",
    under: "var(--signal-amber)",
    low: "var(--accent-hot)",
    "slight-over": "var(--accent-cool)",
    over: "var(--accent-cool)",
  }[fairness.tone]

  const initials = getInitials(offer.offerUser.displayName, offer.offerUser.email)
  const displayName = offer.offerUser.displayName ?? offer.offerUser.email
  const relTime = formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true })

  const borderColor =
    viewAs === "mine" ? "color-mix(in srgb, var(--accent-hot) 35%, transparent)" : "var(--rule)"

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      {/* Header strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--bg-sunk)",
            border: "1px solid var(--rule)",
            display: "grid",
            placeItems: "center",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--ink-2)",
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
            {displayName}
            {viewAs === "mine" && (
              <span style={{ color: "var(--ink-3)", fontWeight: 400 }}> · you</span>
            )}
          </div>
          <div
            style={{
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
              marginTop: 1,
              fontFamily: "var(--font-mono)",
            }}
          >
            {relTime}
          </div>
        </div>

        <StatusPill status={offer.status} />
      </div>

      {/* Trade diagram */}
      <div
        style={{
          padding: 14,
          display: "grid",
          gridTemplateColumns: "1fr 36px 1fr",
          gap: 10,
          alignItems: "stretch",
        }}
      >
        {/* They offer */}
        <div
          style={{
            padding: 12,
            background: "var(--bg)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--rule)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            They offer
          </div>

          {offer.cashAmount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                background: "var(--surface)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--rule)",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 4,
                  background: "color-mix(in srgb, var(--signal-green) 15%, transparent)",
                  color: "var(--signal-green)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <DollarSign size={13} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>
                  {formatUsdCents(offer.cashAmount)}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--ink-3)",
                    letterSpacing: "0.04em",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Cash · escrow
                </div>
              </div>
            </div>
          )}

          {offer.offeredCards.map((oc) => (
            <div
              key={oc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                background: "var(--surface)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--rule)",
              }}
            >
              <CardArt card={oc.card} size="xs" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: "var(--ink)",
                  }}
                >
                  {oc.quantity > 1 && (
                    <span style={{ color: "var(--accent-hot)" }}>{oc.quantity}× </span>
                  )}
                  {oc.card.name}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--ink-3)",
                    letterSpacing: "0.04em",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {oc.card.set} · {oc.condition} ·{" "}
                  {oc.marketValue != null ? formatUsdCents(oc.marketValue * oc.quantity) : "—"}
                </div>
              </div>
            </div>
          ))}

          {offer.cashAmount === 0 && offer.offeredCards.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--ink-4)", fontStyle: "italic", padding: 6 }}>
              —
            </div>
          )}

          <div
            style={{
              marginTop: 4,
              paddingTop: 8,
              borderTop: "1px dashed var(--rule)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              Value
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
              {formatUsdCents(offerTotal)}
            </span>
          </div>
        </div>

        {/* Swap arrow */}
        <div style={{ display: "grid", placeItems: "center" }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--bg)",
              border: "1px solid var(--rule)",
              display: "grid",
              placeItems: "center",
              color: "var(--ink-2)",
            }}
          >
            <ArrowLeftRight size={13} />
          </div>
        </div>

        {/* For your card */}
        <div
          style={{
            padding: 12,
            background: "var(--bg)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--rule)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            For your {listing.card.name}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              background: "var(--surface)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--rule)",
            }}
          >
            <CardArt card={listing.card} size="xs" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "var(--ink)",
                }}
              >
                {listing.card.name}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--ink-3)",
                  letterSpacing: "0.04em",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {listing.card.set} · {listing.condition}
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              marginTop: 4,
              paddingTop: 8,
              borderTop: "1px dashed var(--rule)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              Market
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
              {listing.card.marketPrice != null ? formatUsdCents(listing.card.marketPrice) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Fairness delta bar */}
      <div
        style={{
          margin: "0 14px 14px",
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
          background: `color-mix(in srgb, ${toneColor} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${toneColor} 25%, transparent)`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 12, color: toneColor, fontWeight: 500 }}>{fairness.label}</span>
        <span
          style={{
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
            fontFamily: "var(--font-mono)",
            marginLeft: "auto",
          }}
        >
          Δ {fairness.delta >= 0 ? "+" : ""}
          {formatUsdCents(fairness.delta)}
        </span>
      </div>

      {/* Message quote */}
      {offer.message && (
        <div
          style={{
            margin: "0 14px 14px",
            padding: "10px 12px",
            background: "var(--bg-sunk)",
            borderRadius: "var(--radius-sm)",
            borderLeft: "2px solid var(--ink-3)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--ink-2)",
              fontStyle: "italic",
              fontFamily: "var(--font-serif)",
            }}
          >
            &ldquo;{offer.message}&rdquo;
          </div>
        </div>
      )}

      {/* Action bar */}
      {offer.status === "pending" && viewAs === "owner" && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 14px",
            borderTop: "1px solid var(--rule)",
            background: "var(--bg-sunk)",
          }}
        >
          <Button variant="ghost" size="sm" onClick={onDecline}>
            <X />
            Decline
          </Button>
          <Button variant="outline" size="sm" onClick={onCounter}>
            <Repeat2 />
            Counter
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="success" size="sm" onClick={onAccept}>
            <Check />
            Accept trade
          </Button>
        </div>
      )}

      {offer.status === "pending" && viewAs === "mine" && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 14px",
            borderTop: "1px solid var(--rule)",
            alignItems: "center",
            background: "var(--bg-sunk)",
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 11.5,
              color: "var(--ink-3)",
            }}
          >
            Awaiting reply…
          </span>
          <Button variant="ghost" size="sm" onClick={onWithdraw}>
            <Undo2 />
            Withdraw
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onRevise) onRevise()
              else alert("Offer revision wizard lands in Phase 5.")
            }}
          >
            <Pencil />
            Revise
          </Button>
        </div>
      )}
    </div>
  )
}
