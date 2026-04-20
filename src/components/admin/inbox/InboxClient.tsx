"use client"

import { useState } from "react"
import type { TradeOfferDTO } from "@/lib/dtos"
import { Eyebrow } from "@/components/ui/graphite"
import { InboxRow } from "./InboxRow"
import { InboxEmpty } from "./InboxEmpty"
import { LedgerStat } from "./LedgerStat"

interface Props {
  incoming: TradeOfferDTO[]
  outgoing: TradeOfferDTO[]
  currentUserId: string
}

type Tab = "incoming" | "sent" | "settled"

export function InboxClient({ incoming, outgoing, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("incoming")

  const pendingIn = incoming.filter((o) => o.status === "pending")
  const pendingOut = outgoing.filter((o) => o.status === "pending")
  const settled = [...incoming, ...outgoing]
    .filter((o) => o.status !== "pending")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const acceptedCount = [...incoming, ...outgoing].filter((o) => o.status === "accepted").length

  const tabs = [
    {
      id: "incoming" as const,
      label: "Incoming",
      count: pendingIn.length,
      data: [...pendingIn, ...incoming.filter((o) => o.status !== "pending")],
    },
    {
      id: "sent" as const,
      label: "Sent",
      count: pendingOut.length,
      data: outgoing.filter(
        (o) => o.status === "pending" || o.status === "declined" || o.status === "withdrawn"
      ),
    },
    { id: "settled" as const, label: "Settled", count: settled.length, data: settled },
  ]
  const active = tabs.find((t) => t.id === tab)!

  return (
    <div className="px-12 pt-8 pb-20 max-w-[1280px] mx-auto" style={{ color: "var(--ink)" }}>
      {/* Masthead */}
      <div className="mb-7 pb-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <Eyebrow className="mb-2.5">Ledger · Offers in flight</Eyebrow>
        <h1
          className="m-0"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 54,
            fontWeight: 400,
            letterSpacing: "-0.025em",
            lineHeight: 0.95,
          }}
        >
          The <span className="serif-italic">ledger</span>.
        </h1>
        <div className="flex gap-10 mt-5">
          <LedgerStat n={pendingIn.length} label="incoming pending" accent={pendingIn.length > 0} />
          <LedgerStat n={pendingOut.length} label="sent, awaiting reply" />
          <LedgerStat n={acceptedCount} label="trades closed" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: "1px solid var(--rule)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="relative flex items-center gap-2 uppercase"
            style={{
              padding: "10px 18px",
              color: tab === t.id ? "var(--ink)" : "var(--ink-3)",
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className="font-mono font-medium"
                style={{
                  fontSize: 9.5,
                  padding: "2px 6px",
                  borderRadius: 3,
                  background: tab === t.id ? "var(--accent-hot)" : "var(--rule)",
                  color: tab === t.id ? "var(--accent-hot-ink)" : "var(--ink-3)",
                  letterSpacing: "0.04em",
                }}
              >
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <div
                className="absolute left-0 right-0"
                style={{
                  bottom: -1,
                  height: 2,
                  background: "var(--ink)",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {active.data.length === 0 ? (
        <InboxEmpty tab={tab} />
      ) : (
        <div className="flex flex-col">
          {active.data.map((offer, i) => (
            <InboxRow
              key={offer.id}
              offer={offer}
              idx={i}
              direction={
                tab === "incoming"
                  ? "in"
                  : tab === "sent"
                    ? "out"
                    : offer.offerUser.id === currentUserId
                      ? "out"
                      : "in"
              }
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
