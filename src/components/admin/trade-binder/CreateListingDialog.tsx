"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, DollarSign, TrendingUp, Repeat2, Info } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CardArt, Eyebrow, ConditionChip } from "@/components/ui/graphite"
import { formatUsdCents } from "@/lib/graphite/format-ask"
import { updateHolding } from "@/app/actions/holding"
import type { HoldingDTO } from "@/lib/dtos"

interface CreateListingDialogProps {
  open: boolean
  onClose: () => void
  myHoldings: HoldingDTO[]
  prefillHoldingId?: string
  onSuccess?: () => void
}

export function CreateListingDialog({
  open,
  onClose,
  myHoldings,
  prefillHoldingId,
  onSuccess,
}: CreateListingDialogProps) {
  const router = useRouter()

  const [selected, setSelected] = useState<string | undefined>(prefillHoldingId)
  const [askType, setAskType] = useState<"custom" | "percent" | "trade_only">("custom")
  const [cashAsk, setCashAsk] = useState<number>(0)
  const [percent, setPercent] = useState<number>(95)
  const [notes, setNotes] = useState<string>("")
  const [search, setSearch] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  // Derived pool
  const pool = myHoldings.filter((h) => !h.listedForTrade && h.quantity > 0)
  const fallback = pool.length === 0 ? myHoldings : pool
  const filtered = fallback.filter((h) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return h.card.name.toLowerCase().includes(q) || h.card.setName.toLowerCase().includes(q)
  })

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("")
      setAskType("custom")
      setPercent(95)
      setNotes("")
      setSubmitting(false)

      const initialId = prefillHoldingId ?? filtered[0]?.id
      setSelected(initialId)

      const initialHolding = myHoldings.find((h) => h.id === initialId)
      setCashAsk(initialHolding?.card.marketPrice ?? 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Update cashAsk when selected holding changes
  useEffect(() => {
    if (selected) {
      const h = myHoldings.find((h) => h.id === selected)
      setCashAsk(h?.card.marketPrice ?? 0)
    }
  }, [selected, myHoldings])

  const holding = myHoldings.find((h) => h.id === selected)

  const resolvedPercent =
    holding?.card.marketPrice != null
      ? Math.round((holding.card.marketPrice * percent) / 100)
      : null

  async function handleSubmit() {
    if (!holding) return

    const askValue =
      askType === "custom" ? Math.round(cashAsk) : askType === "percent" ? percent : null

    setSubmitting(true)
    const result = await updateHolding(holding.id, {
      listedForTrade: true,
      listedQuantity: 1,
      askType,
      askValue,
      tradeNotes: notes.trim() || null,
    })
    setSubmitting(false)

    if (result.success) {
      toast.success("Listing published to the binder")
      onSuccess?.()
      onClose()
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{ maxWidth: 960, width: "calc(100vw - 48px)" }}
        showCloseButton={false}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--rule)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1 }}>
            <Eyebrow>Edition 01 · New listing</Eyebrow>
            <h1
              style={{
                fontSize: 20,
                marginTop: 4,
                fontFamily: "var(--font-display)",
                fontWeight: 400,
              }}
            >
              Put a card{" "}
              <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>on the shelf</em>
            </h1>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-sm)",
              display: "grid",
              placeItems: "center",
              color: "var(--ink-2)",
              border: "1px solid var(--rule)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Two-pane grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            minHeight: 520,
            maxHeight: "calc(100vh - 200px)",
          }}
        >
          {/* ── Left pane: pick from collection ── */}
          <div
            style={{
              padding: 20,
              borderRight: "1px solid var(--rule)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: "var(--bg-sunk)",
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <Eyebrow>From your collection</Eyebrow>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-3)",
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your binder…"
                style={{
                  width: "100%",
                  height: 34,
                  padding: "0 12px 0 34px",
                  background: "var(--surface)",
                  border: "1px solid var(--rule)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>

            {/* Holding list */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {filtered.length === 0 && (
                <div
                  style={{
                    padding: "32px 0",
                    textAlign: "center",
                    color: "var(--ink-3)",
                    fontSize: 12,
                  }}
                >
                  No cards match your search.
                </div>
              )}
              {filtered.map((h) => {
                const active = selected === h.id
                return (
                  <button
                    key={h.id}
                    onClick={() => setSelected(h.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      background: active ? "var(--surface)" : "transparent",
                      border: "1px solid " + (active ? "var(--ink)" : "transparent"),
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <CardArt card={h.card} size="xs" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "var(--ink)",
                        }}
                      >
                        {h.card.name}
                      </div>
                      <div
                        style={{
                          fontSize: 9.5,
                          color: "var(--ink-3)",
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.04em",
                          marginTop: 2,
                        }}
                      >
                        {h.card.set} · {h.condition} · ×{h.quantity}
                      </div>
                    </div>
                    {h.listedForTrade && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          borderRadius: 999,
                          color: "var(--signal-amber)",
                          background: "color-mix(in srgb, var(--signal-amber) 12%, transparent)",
                          border:
                            "1px solid color-mix(in srgb, var(--signal-amber) 30%, transparent)",
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.05em",
                          flexShrink: 0,
                        }}
                      >
                        Listed
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Right pane: form ── */}
          {holding ? (
            <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div
                style={{
                  padding: 24,
                  overflowY: "auto",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                {/* Card preview */}
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    padding: 16,
                    background: "var(--bg-sunk)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--rule)",
                  }}
                >
                  <CardArt card={holding.card} size="sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 4 }}>
                      <Eyebrow>The card</Eyebrow>
                    </div>
                    <div
                      className="serif"
                      style={{ fontSize: 22, letterSpacing: "-0.02em", lineHeight: 1.1 }}
                    >
                      {holding.card.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--ink-3)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.06em",
                        marginTop: 3,
                        textTransform: "uppercase",
                      }}
                    >
                      {holding.card.setName} · №{holding.card.collectorNumber}
                    </div>
                    <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                      <div>
                        <Eyebrow>Market</Eyebrow>
                        <div className="serif" style={{ fontSize: 15, marginTop: 2 }}>
                          {holding.card.marketPrice != null
                            ? formatUsdCents(holding.card.marketPrice)
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <Eyebrow>Condition</Eyebrow>
                        <div style={{ marginTop: 4 }}>
                          <ConditionChip condition={holding.condition} />
                        </div>
                      </div>
                      <div>
                        <Eyebrow>On hand</Eyebrow>
                        <div className="serif" style={{ fontSize: 15, marginTop: 2 }}>
                          ×{holding.quantity}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ask type picker */}
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <Eyebrow>What are you asking?</Eyebrow>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                    }}
                  >
                    {(
                      [
                        {
                          v: "custom" as const,
                          Icon: DollarSign,
                          title: "Fixed cash",
                          sub: "A specific number",
                        },
                        {
                          v: "percent" as const,
                          Icon: TrendingUp,
                          title: "Market %",
                          sub: "Follows TCG price",
                        },
                        {
                          v: "trade_only" as const,
                          Icon: Repeat2,
                          title: "Trade only",
                          sub: "Cards for cards",
                        },
                      ] as const
                    ).map(({ v, Icon, title, sub }) => (
                      <button
                        key={v}
                        onClick={() => setAskType(v)}
                        style={{
                          padding: 14,
                          borderRadius: "var(--radius-sm)",
                          textAlign: "left",
                          background: askType === v ? "var(--surface)" : "transparent",
                          border: "1px solid " + (askType === v ? "var(--ink)" : "var(--rule)"),
                          cursor: "pointer",
                        }}
                      >
                        <Icon
                          size={16}
                          style={{
                            color: askType === v ? "var(--accent-hot)" : "var(--ink-3)",
                          }}
                        />
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            marginTop: 8,
                            fontFamily: "var(--font-display)",
                            color: "var(--ink)",
                          }}
                        >
                          {title}
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: "var(--ink-3)",
                            marginTop: 2,
                          }}
                        >
                          {sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ask value: custom */}
                {askType === "custom" && (
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <Eyebrow>Cash ask</Eyebrow>
                    </div>
                    <div style={{ position: "relative" }}>
                      <span
                        className="serif"
                        style={{
                          position: "absolute",
                          left: 14,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--ink-3)",
                          fontSize: 22,
                          pointerEvents: "none",
                        }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={cashAsk === 0 ? "" : cashAsk / 100}
                        placeholder="0.00"
                        onChange={(e) => {
                          const raw = parseFloat(e.target.value)
                          setCashAsk(isNaN(raw) ? 0 : Math.max(0, Math.round(raw * 100)))
                        }}
                        style={{
                          width: "100%",
                          height: 52,
                          padding: "0 14px 0 32px",
                          background: "var(--surface)",
                          border: "1px solid var(--rule-strong)",
                          borderRadius: "var(--radius)",
                          fontSize: 24,
                          fontWeight: 500,
                          fontFamily: "var(--font-display)",
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: "-0.02em",
                          color: "var(--ink)",
                          outline: "none",
                        }}
                      />
                    </div>

                    {holding.card.marketPrice == null ? (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--signal-amber)",
                          marginTop: 8,
                          lineHeight: 1.5,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Info size={11} />
                        This card has no market price yet — your ask will be the only signal.
                      </div>
                    ) : cashAsk > 0 ? (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--ink-3)",
                          marginTop: 8,
                          lineHeight: 1.5,
                        }}
                      >
                        Market is{" "}
                        <span style={{ color: "var(--ink-2)" }}>
                          {formatUsdCents(holding.card.marketPrice)}
                        </span>
                        . Your ask is{" "}
                        <span
                          style={{
                            color:
                              cashAsk > holding.card.marketPrice
                                ? "var(--accent-cool)"
                                : cashAsk < holding.card.marketPrice * 0.9
                                  ? "var(--accent-hot)"
                                  : "var(--signal-green)",
                            fontWeight: 600,
                          }}
                        >
                          {((cashAsk / holding.card.marketPrice - 1) * 100).toFixed(1)}%{" "}
                          {cashAsk >= holding.card.marketPrice ? "above" : "below"} market
                        </span>
                        .
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Ask value: percent */}
                {askType === "percent" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Eyebrow>Percent of market</Eyebrow>
                      <span className="serif" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
                        {percent}
                        <span style={{ color: "var(--ink-3)", fontSize: 14 }}>%</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="130"
                      step="1"
                      value={percent}
                      onChange={(e) => setPercent(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--accent-hot)" }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 9.5,
                        color: "var(--ink-3)",
                        marginTop: 4,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      <span>70%</span>
                      <span>MARKET</span>
                      <span>130%</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 10 }}>
                      {resolvedPercent != null ? (
                        <>
                          At current market, your ask is{" "}
                          <span style={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatUsdCents(resolvedPercent)}
                          </span>
                          .
                        </>
                      ) : (
                        <span style={{ color: "var(--ink-3)" }}>
                          No market price — resolved amount unavailable.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Ask value: trade only */}
                {askType === "trade_only" && (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius)",
                      background: "color-mix(in srgb, var(--accent-cool) 8%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--accent-cool) 25%, transparent)",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <Repeat2
                      size={18}
                      style={{ color: "var(--accent-cool)", flexShrink: 0, marginTop: 1 }}
                    />
                    <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>
                      <span style={{ color: "var(--ink)", fontWeight: 600 }}>Trade-only.</span>{" "}
                      Incoming offers must include cards of roughly equivalent market value. You can
                      still decline anything.
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Eyebrow>Wants list · Optional</Eyebrow>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Chasing Scooby-Doo from Lorcana, vintage Charizards, or anything Bloodborne-adjacent…"
                    style={{
                      width: "100%",
                      minHeight: 72,
                      padding: "10px 14px",
                      background: "var(--bg-sunk)",
                      border: "1px solid var(--rule)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                      color: "var(--ink)",
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      lineHeight: 1.5,
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "14px 24px",
                  borderTop: "1px solid var(--rule)",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  background: "var(--surface)",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontSize: 11,
                    color: "var(--ink-3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Info size={11} /> You can edit or retract anytime from your collection.
                </div>
                <Button variant="ghost" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="default" onClick={handleSubmit} disabled={submitting || !selected}>
                  {submitting ? "Publishing…" : "Publish listing"}
                </Button>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: 40,
                display: "grid",
                placeItems: "center",
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              Pick a card to continue.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
