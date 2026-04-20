"use client"

import type { TradeBinderItemDTO } from "@/lib/dtos"
import { Eyebrow } from "@/components/ui/graphite"
import { formatUsdCents } from "@/lib/graphite/format-ask"

interface Props {
  listings: TradeBinderItemDTO[]
  currentUserId: string
}

export function Masthead({ listings, currentUserId }: Props) {
  const stats = {
    total: listings.length,
    totalValue: listings.reduce((s, l) => s + (l.card.marketPrice ?? 0), 0),
    games: new Set(listings.map((l) => l.card.game)).size,
    myListings: listings.filter((l) => l.owner.id === currentUserId).length,
    myOffers: listings.filter((l) => l.myOffer).length,
  }
  const issue = String(new Date().getMonth() + 1).padStart(2, "0")

  return (
    <section className="px-8 pt-9 pb-7" style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 items-end">
        <div>
          <Eyebrow className="mb-3.5">Issue N° {issue} · The Trading Floor</Eyebrow>
          <h1 className="display-xl serif m-0">
            Cards <span className="serif-italic">open</span> for
            <br />
            trade, today.
          </h1>
          <p
            className="mt-4 max-w-[520px] text-[14px] leading-[1.55]"
            style={{ color: "var(--ink-2)" }}
          >
            Browse {stats.total} listings across {stats.games} games. Every card is held in escrow
            the moment an offer is accepted — you trade with people, not strangers.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-0" style={{ borderLeft: "1px solid var(--rule)" }}>
          <MastheadCell label="Open listings" value={stats.total} sub={`${stats.games} games`} />
          <MastheadCell
            label="Total market"
            value={formatUsdCents(stats.totalValue)}
            sub="at mid-price"
          />
          <MastheadCell label="Your offers out" value={stats.myOffers} sub="awaiting reply" />
          <MastheadCell
            label="Your listings live"
            value={stats.myListings}
            sub="in escrow queue"
            last
          />
        </div>
      </div>
    </section>
  )
}

function MastheadCell({
  label,
  value,
  sub,
  last,
}: {
  label: string
  value: string | number
  sub: string
  last?: boolean
}) {
  return (
    <div className="px-4 py-2.5" style={{ borderBottom: last ? "none" : "1px dashed var(--rule)" }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 22, marginTop: 4 }}>
        {value}
      </div>
      <div
        className="font-mono mt-0.5"
        style={{ fontSize: 10, letterSpacing: "0.04em", color: "var(--ink-3)" }}
      >
        {sub}
      </div>
    </div>
  )
}
