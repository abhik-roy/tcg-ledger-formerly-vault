"use client"

import { useState } from "react"
import type { TradeBinderItemDTO } from "@/lib/dtos"
import { CardArt } from "@/components/ui/graphite"
import { formatAsk, formatUsdCents } from "@/lib/graphite/format-ask"

const CONDITION_TONES: Record<string, string> = {
  NM: "var(--signal-green)",
  LP: "var(--accent-cool)",
  MP: "var(--signal-amber)",
  HP: "var(--accent-hot)",
}

interface Props {
  listing: TradeBinderItemDTO
  currentUserId: string
  index: number
  onClick: () => void
}

export function ListingCard({ listing, currentUserId, index, onClick }: Props) {
  const { card, owner, condition, askType, askValue, askPrice, offerCount, myOffer } = listing
  const isOwn = owner.id === currentUserId
  const ask = formatAsk(askType, askPrice ?? askValue, card.marketPrice)
  const conditionTone = CONDITION_TONES[condition] ?? "var(--ink-3)"
  const ownerLabel = owner.displayName ?? owner.email.split("@")[0]
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col text-left cursor-pointer relative transition-colors duration-200"
      style={{
        background: hover ? "var(--surface)" : "var(--bg)",
        borderRight: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        padding: "20px 18px 18px",
        minHeight: 360,
      }}
    >
      {/* Plate number + game */}
      <div className="flex items-baseline justify-between mb-3.5">
        <span
          className="font-mono"
          style={{ fontSize: 9.5, color: "var(--ink-4)", letterSpacing: "0.14em" }}
        >
          № {String(index + 1).padStart(3, "0")}
        </span>
        <span
          className="font-mono font-medium uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: "0.14em",
            color: `var(--game-${card.game.toLowerCase()}, var(--ink-3))`,
          }}
        >
          {card.game === "yugioh" ? "Yu-Gi-Oh" : card.game}
        </span>
      </div>

      {/* Art */}
      <div
        className="grid place-items-center mb-4 transition-transform"
        style={{
          transform: hover ? "translateY(-4px)" : "translateY(0)",
          transitionDuration: "400ms",
          transitionTimingFunction: "cubic-bezier(.2,.85,.25,1.05)",
        }}
      >
        <CardArt card={card} size="md" />
      </div>

      {/* Title */}
      <div
        className="clamp-1"
        style={{
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: "-0.015em",
          fontFamily: "var(--font-display)",
          lineHeight: 1.1,
        }}
      >
        {card.name}
      </div>
      <div
        className="font-mono uppercase mt-1"
        style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em" }}
      >
        {card.set} · № {card.collectorNumber} ·{" "}
        <span style={{ color: conditionTone }}>{condition}</span>
      </div>

      {/* Price stack */}
      <div
        className="mt-3.5 pt-3 flex items-baseline justify-between gap-2"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        <div>
          <div className="stat-label" style={{ fontSize: 9 }}>
            Ask
          </div>
          <div
            className="serif"
            style={{
              fontSize: 22,
              lineHeight: 1,
              marginTop: 3,
              color: askType === "trade_only" ? "var(--signal-green)" : "var(--ink)",
            }}
          >
            {ask ?? "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="stat-label" style={{ fontSize: 9 }}>
            Market
          </div>
          <div className="price" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 5 }}>
            {card.marketPrice != null ? formatUsdCents(card.marketPrice) : "—"}
          </div>
        </div>
      </div>

      {/* Owner footer */}
      <div className="flex items-center gap-2 mt-auto pt-3.5">
        <div
          className="shrink-0 rounded-full flex items-center justify-center"
          style={{
            width: 22,
            height: 22,
            background: "var(--surface)",
            border: "1px solid var(--rule-strong)",
            fontSize: 9,
            fontWeight: 600,
            color: "var(--ink-2)",
          }}
        >
          {ownerLabel.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="truncate"
            style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-2)" }}
          >
            {ownerLabel}
          </div>
        </div>
        {offerCount > 0 && (
          <span
            className="font-mono"
            style={{
              fontSize: 9,
              padding: "2px 6px",
              letterSpacing: "0.08em",
              background: "var(--ink)",
              color: "var(--bg)",
              borderRadius: 2,
            }}
          >
            {offerCount}●
          </span>
        )}
        {myOffer && myOffer.status === "pending" && (
          <span
            className="font-mono"
            style={{
              fontSize: 9,
              padding: "2px 6px",
              letterSpacing: "0.08em",
              border: "1px solid var(--accent-hot)",
              color: "var(--accent-hot)",
              borderRadius: 2,
            }}
          >
            SENT
          </span>
        )}
        {isOwn && (
          <span
            className="font-mono"
            style={{
              fontSize: 9,
              padding: "2px 6px",
              letterSpacing: "0.08em",
              background: "var(--ink)",
              color: "var(--bg)",
              borderRadius: 2,
            }}
          >
            YOU
          </span>
        )}
      </div>
    </button>
  )
}
