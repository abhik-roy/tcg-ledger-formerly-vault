"use client"

import type { TradeBinderItemDTO } from "@/lib/dtos"
import { CardArt, Eyebrow } from "@/components/ui/graphite"
import { formatAsk, formatUsdCents } from "@/lib/graphite/format-ask"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const GAME_COLORS: Record<string, string> = {
  magic: "var(--game-magic)",
  pokemon: "var(--game-pokemon)",
  yugioh: "var(--game-yugioh)",
  lorcana: "var(--game-lorcana)",
}

interface Props {
  listing: TradeBinderItemDTO
  onOpen: () => void
  onCreateListing: () => void
}

export function FeatureStrip({ listing, onOpen, onCreateListing }: Props) {
  const { card, owner, offerCount, condition, askType, askValue, askPrice } = listing
  const ask = formatAsk(askType, askPrice ?? askValue, card.marketPrice)
  const color = GAME_COLORS[card.game.toLowerCase()] ?? "var(--ink-3)"
  const ownerLabel = owner.displayName ?? owner.email.split("@")[0]

  return (
    <section
      className="px-8 pt-7 pb-9"
      style={{
        borderBottom: "1px solid var(--rule)",
        background: `linear-gradient(90deg, var(--bg) 0%, color-mix(in srgb, ${color} 4%, var(--bg)) 100%)`,
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-center">
        <div className="grid place-items-center relative">
          <div
            className="absolute"
            style={{
              inset: "8% 15%",
              background: `radial-gradient(ellipse at center, color-mix(in srgb, ${color} 30%, transparent), transparent 70%)`,
              filter: "blur(40px)",
            }}
          />
          <button
            onClick={onOpen}
            className="bg-transparent cursor-pointer"
            aria-label={`Open listing ${card.name}`}
          >
            <CardArt card={card} size="xl" />
          </button>
        </div>
        <div>
          <Eyebrow className="mb-3" style={{ color } as React.CSSProperties}>
            Today&apos;s headline listing
          </Eyebrow>
          <div className="display-lg serif" style={{ marginBottom: 6 }}>
            {card.name}
          </div>
          <div
            className="font-mono mb-5"
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--ink-3)",
              textTransform: "uppercase",
            }}
          >
            {card.setName} · № {card.collectorNumber} · {card.rarity.toUpperCase()}
          </div>

          <div
            className="grid gap-8 mb-5"
            style={{
              gridTemplateColumns: "repeat(3, max-content)",
              padding: "16px 0",
              borderTop: "1px solid var(--rule)",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <FeatureStat label="Ask" value={ask ?? "—"} accent />
            <FeatureStat
              label="Market"
              value={card.marketPrice != null ? formatUsdCents(card.marketPrice) : "—"}
            />
            <FeatureStat label="Condition" value={condition} />
          </div>

          <div className="flex items-center gap-3.5 mb-6">
            <div
              className="shrink-0 rounded-full flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                background: "var(--surface)",
                border: "1px solid var(--rule-strong)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-2)",
              }}
            >
              {ownerLabel.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 600 }}>Listed by {ownerLabel}</div>
            </div>
            {offerCount > 0 && (
              <div className="text-right">
                <div
                  className="font-mono"
                  style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "var(--ink-3)" }}
                >
                  PENDING
                </div>
                <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>
                  {offerCount}{" "}
                  <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    offer{offerCount > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5">
            <Button variant="ink" onClick={onOpen}>
              Open listing
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={onCreateListing}>
              List your own
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div
        className="serif"
        style={{
          fontSize: 32,
          marginTop: 4,
          color: accent ? "var(--accent-hot)" : "var(--ink)",
          letterSpacing: "-0.025em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  )
}
