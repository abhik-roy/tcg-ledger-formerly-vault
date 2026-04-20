"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Shield, Search, ArrowLeft, Send, ArrowRight, Plus, Check, X, Loader2 } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CardArt, Eyebrow } from "@/components/ui/graphite"
import { computeFairness } from "@/lib/graphite/fairness"
import { formatUsdCents, formatAsk } from "@/lib/graphite/format-ask"
import { makeOffer } from "@/app/actions/trade-offer"
import type { TradeBinderItemDTO, HoldingDTO } from "@/lib/dtos"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MakeOfferWizardProps {
  listing: TradeBinderItemDTO
  currentUserId: string
  myHoldings: HoldingDTO[]
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

// ---------------------------------------------------------------------------
// StepDots
// ---------------------------------------------------------------------------

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i + 1 === step ? 22 : 6,
            height: 4,
            borderRadius: 2,
            background: i + 1 <= step ? "var(--accent-hot)" : "var(--rule-strong)",
            transition: "all 0.25s cubic-bezier(.2,.85,.25,1.05)",
          }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SideSummary (step 2)
// ---------------------------------------------------------------------------

interface SideSummaryCard {
  card: HoldingDTO["card"]
  qty: number
  condition: string
}

interface SideSummaryProps {
  title: string
  displayName: string
  cashCents: number
  cards: SideSummaryCard[]
  totalCents: number
  flip?: boolean
}

function SideSummary({ title, displayName, cashCents, cards, totalCents, flip }: SideSummaryProps) {
  const initials = displayName.slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        padding: 16,
        background: "var(--bg-sunk)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius)",
        textAlign: flip ? "right" : "left",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Eyebrow>{title}</Eyebrow>

      {/* User row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "10px 0 12px",
          flexDirection: flip ? "row-reverse" : "row",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--bg-sunk)",
            border: "1px solid var(--rule)",
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ink-2)",
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ textAlign: flip ? "right" : "left" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{displayName}</div>
        </div>
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {cashCents > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 8,
              background: "var(--surface)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--rule)",
              flexDirection: flip ? "row-reverse" : "row",
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
              <span style={{ fontSize: 13, fontWeight: 700 }}>$</span>
            </div>
            <div style={{ flex: 1, textAlign: flip ? "right" : "left" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatUsdCents(cashCents)}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--ink-3)",
                  letterSpacing: "0.04em",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Escrow cash
              </div>
            </div>
          </div>
        )}
        {cards.map((ci, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 8,
              background: "var(--surface)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--rule)",
              flexDirection: flip ? "row-reverse" : "row",
            }}
          >
            <CardArt card={ci.card} size="xs" />
            <div style={{ flex: 1, minWidth: 0, textAlign: flip ? "right" : "left" }}>
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
                {ci.qty > 1 && `${ci.qty}× `}
                {ci.card.name}
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  color: "var(--ink-3)",
                  letterSpacing: "0.04em",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {ci.card.setName} · {ci.condition}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px dashed var(--rule-strong)",
          display: "flex",
          justifyContent: "space-between",
          flexDirection: flip ? "row-reverse" : "row",
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
          }}
        >
          Total
        </span>
        <span
          className="serif"
          style={{ fontSize: 18, letterSpacing: "-0.02em", color: "var(--ink)" }}
        >
          {formatUsdCents(totalCents)}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tone color map
// ---------------------------------------------------------------------------

const TONE_COLORS: Record<string, string> = {
  fair: "var(--signal-green)",
  under: "var(--signal-amber)",
  low: "var(--accent-hot)",
  "slight-over": "var(--accent-cool)",
  over: "var(--accent-cool)",
}

// ---------------------------------------------------------------------------
// MakeOfferWizard
// ---------------------------------------------------------------------------

export function MakeOfferWizard({
  listing,
  currentUserId,
  myHoldings,
  open,
  onClose,
  onSuccess,
}: MakeOfferWizardProps) {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2>(1)
  const [cashDollars, setCashDollars] = useState<string>("")
  const [selectedCards, setSelectedCards] = useState<Array<{ holdingId: string; qty: number }>>([])
  const [message, setMessage] = useState<string>("")
  const [holdingSearch, setHoldingSearch] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1)
      setCashDollars("")
      setSelectedCards([])
      setMessage("")
      setHoldingSearch("")
      setSubmitting(false)
    }
  }, [open])

  // ── Derived values ────────────────────────────────────────────────────────

  const cashCents = Math.round((parseFloat(cashDollars) || 0) * 100)

  const askCents =
    listing.askType === "trade_only"
      ? (listing.card.marketPrice ?? 0)
      : (listing.askPrice ?? listing.askValue ?? 0)

  const myPickable = myHoldings.filter((h) => h.id !== listing.holdingId)

  const filteredHoldings = myPickable.filter((h) => {
    if (!holdingSearch.trim()) return true
    const q = holdingSearch.toLowerCase()
    return h.card.name.toLowerCase().includes(q) || h.card.setName.toLowerCase().includes(q)
  })

  const cardsValue = selectedCards.reduce((sum, sc) => {
    const h = myHoldings.find((hh) => hh.id === sc.holdingId)
    return sum + (h?.card.marketPrice ?? 0) * sc.qty
  }, 0)

  const offerTotal = cashCents + cardsValue

  const fairness = computeFairness(offerTotal, askCents)
  const canSubmit = cashCents > 0 || selectedCards.length > 0

  // ── Card picker handlers ──────────────────────────────────────────────────

  const addHolding = (h: HoldingDTO) => {
    setSelectedCards((prev) => {
      const existing = prev.find((p) => p.holdingId === h.id)
      if (existing) {
        return prev.map((p) =>
          p.holdingId === h.id ? { ...p, qty: Math.min(p.qty + 1, h.quantity) } : p
        )
      }
      return [...prev, { holdingId: h.id, qty: 1 }]
    })
  }

  const removeHolding = (hId: string) => {
    setSelectedCards((prev) => prev.filter((p) => p.holdingId !== hId))
  }

  const setQty = (hId: string, qty: number) => {
    const h = myHoldings.find((hh) => hh.id === hId)
    if (!h) return
    const clamped = Math.max(1, Math.min(qty, h.quantity))
    setSelectedCards((prev) => prev.map((p) => (p.holdingId === hId ? { ...p, qty: clamped } : p)))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true)
    const result = await makeOffer({
      holdingId: listing.holdingId,
      cashAmount: cashCents,
      message: message.trim() || undefined,
      cards: selectedCards.map((sc) => ({ holdingId: sc.holdingId, quantity: sc.qty })),
    })
    setSubmitting(false)

    if (result.success) {
      toast.success("Offer sent")
      onSuccess?.()
      onClose()
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const askDisplay = formatAsk(listing.askType, listing.askValue, listing.card.marketPrice) ?? "—"

  const toneColor = TONE_COLORS[fairness.tone] ?? "var(--ink)"

  const ownerName = listing.owner.displayName ?? listing.owner.email
  const myName = myHoldings[0] ? (myHoldings[0].userId === currentUserId ? "You" : "You") : "You"

  // Step 2 card list for "You send"
  const sendCards: SideSummaryCard[] = selectedCards.map((sc) => {
    const h = myHoldings.find((hh) => hh.id === sc.holdingId)!
    return { card: h.card, qty: sc.qty, condition: h.condition }
  })

  // Step 2 card list for "You receive"
  const receiveCards: SideSummaryCard[] = [
    { card: listing.card, qty: 1, condition: listing.condition },
  ]

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{ maxWidth: 1080, width: "calc(100vw - 48px)" }}
        showCloseButton={false}
      >
        {/* ── Wizard header ── */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--rule)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ flex: 1 }}>
            <Eyebrow>{step === 1 ? "Compose — Step 01 of 02" : "Review — Step 02 of 02"}</Eyebrow>
            <h1 style={{ fontSize: 18, marginTop: 4, color: "var(--ink)" }}>
              Offer on{" "}
              <span
                className="serif"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontStyle: "italic",
                }}
              >
                {listing.card.name}
              </span>
            </h1>
          </div>
          <StepDots step={step} total={2} />
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
            <X size={14} />
          </button>
        </div>

        {/* ── Step 1: Compose ── */}
        {step === 1 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              minHeight: 560,
              maxHeight: "calc(100vh - 200px)",
            }}
          >
            {/* Left column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid var(--rule)",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {/* Cash section */}
              <div
                style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid var(--rule)",
                  flexShrink: 0,
                }}
              >
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  Cash · in escrow
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Input */}
                  <div style={{ position: "relative", flex: 1 }}>
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
                      step="5"
                      value={cashDollars}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === "" || Number(v) >= 0) setCashDollars(v)
                      }}
                      placeholder="0"
                      style={{
                        width: "100%",
                        height: 48,
                        padding: "0 14px 0 32px",
                        background: "var(--surface)",
                        border: "1px solid var(--rule-strong)",
                        borderRadius: "var(--radius)",
                        fontSize: 22,
                        fontWeight: 500,
                        fontFamily: "var(--font-display)",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.02em",
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    />
                  </div>
                  {/* Presets */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 25, 50, 100, 250].map((v) => {
                      const currentVal = parseFloat(cashDollars) || 0
                      const active = currentVal === v && (v > 0 || cashDollars === "")
                      const isNone = v === 0
                      const actualActive = isNone
                        ? cashDollars === "" || cashDollars === "0"
                        : currentVal === v
                      return (
                        <button
                          key={v}
                          onClick={() => {
                            if (isNone) {
                              setCashDollars("")
                            } else {
                              setCashDollars(String(v))
                            }
                          }}
                          style={{
                            height: 48,
                            padding: "0 12px",
                            borderRadius: "var(--radius-sm)",
                            background: actualActive ? "var(--ink)" : "transparent",
                            color: actualActive ? "var(--bg)" : "var(--ink-2)",
                            fontSize: 11,
                            fontWeight: 500,
                            fontFamily: "var(--font-mono)",
                            border: "1px solid " + (actualActive ? "var(--ink)" : "var(--rule)"),
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isNone ? "NONE" : `$${v}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--ink-3)",
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Shield size={11} style={{ color: "var(--signal-green)", flexShrink: 0 }} />
                  Held in escrow, released on confirmed delivery both ways.
                </div>
              </div>

              {/* Picker header */}
              <div
                style={{
                  padding: "16px 24px 10px",
                  borderBottom: "1px solid var(--rule)",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <Eyebrow>Your collection</Eyebrow>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--ink-3)",
                      letterSpacing: "0.06em",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {selectedCards.length === 0
                      ? `${myPickable.length} available`
                      : `${selectedCards.length} added`}
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  <Search
                    size={13}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--ink-3)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    value={holdingSearch}
                    onChange={(e) => setHoldingSearch(e.target.value)}
                    placeholder="Search your binder…"
                    style={{
                      width: "100%",
                      height: 34,
                      padding: "0 12px 0 34px",
                      background: "var(--bg-sunk)",
                      border: "1px solid var(--rule)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      color: "var(--ink)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Card grid */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px 24px 20px",
                }}
              >
                {filteredHoldings.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "var(--ink-3)",
                      fontSize: 12,
                    }}
                  >
                    No matching cards in your binder.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 8,
                    }}
                  >
                    {filteredHoldings.map((h) => {
                      const sel = selectedCards.find((s) => s.holdingId === h.id)
                      return (
                        <button
                          key={h.id}
                          onClick={() => (sel ? removeHolding(h.id) : addHolding(h))}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            padding: 10,
                            background: sel ? "var(--surface)" : "transparent",
                            border: "1px solid " + (sel ? "var(--ink)" : "var(--rule)"),
                            borderRadius: "var(--radius-sm)",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "border-color .12s, background .12s",
                          }}
                        >
                          <CardArt card={h.card} size="xs" />
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
                              {h.card.name}
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
                              {h.card.setName} · {h.condition} · ×{h.quantity}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                marginTop: 2,
                                color: "var(--ink)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {h.card.marketPrice != null
                                ? formatUsdCents(h.card.marketPrice)
                                : "—"}
                            </div>
                          </div>
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              background: sel ? "var(--ink)" : "transparent",
                              color: sel ? "var(--bg)" : "var(--ink-3)",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                              border: "1px solid " + (sel ? "var(--ink)" : "var(--rule-strong)"),
                            }}
                          >
                            {sel ? <Check size={12} /> : <Plus size={12} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column: summary ledger */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-sunk)",
                minHeight: 0,
              }}
            >
              {/* You want */}
              <div
                style={{
                  padding: "18px 20px",
                  borderBottom: "1px solid var(--rule)",
                  flexShrink: 0,
                }}
              >
                <div style={{ marginBottom: 10 }}>
                  <Eyebrow>You want</Eyebrow>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: 10,
                    background: "var(--surface)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--rule)",
                  }}
                >
                  <CardArt card={listing.card} size="xs" />
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
                      {listing.card.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9.5,
                        color: "var(--ink-3)",
                        letterSpacing: "0.04em",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {listing.card.setName} · {listing.condition}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        marginTop: 2,
                        color: "var(--ink-2)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      Ask · {askDisplay}
                    </div>
                  </div>
                </div>
              </div>

              {/* You give */}
              <div
                style={{
                  flex: 1,
                  padding: "16px 20px",
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                <div style={{ marginBottom: 10 }}>
                  <Eyebrow>You give</Eyebrow>
                </div>

                {cashCents === 0 && selectedCards.length === 0 ? (
                  <div
                    style={{
                      padding: "28px 16px",
                      textAlign: "center",
                      border: "1px dashed var(--rule-strong)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--ink-3)",
                      fontSize: 12,
                    }}
                  >
                    <div
                      className="serif"
                      style={{ fontSize: 22, color: "var(--ink-2)", marginBottom: 4 }}
                    >
                      Empty
                    </div>
                    Add cash, cards, or both.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Cash line item */}
                    {cashCents > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: 8,
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
                          <span style={{ fontSize: 13, fontWeight: 700 }}>$</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: 500,
                              color: "var(--ink)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatUsdCents(cashCents)}
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
                        {/* Clear cash */}
                        <button
                          onClick={() => setCashDollars("")}
                          style={{
                            color: "var(--ink-3)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 2,
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}

                    {/* Selected cards */}
                    {selectedCards.map((sc) => {
                      const h = myHoldings.find((hh) => hh.id === sc.holdingId)
                      if (!h) return null
                      return (
                        <div
                          key={sc.holdingId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: 8,
                            background: "var(--surface)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--rule)",
                          }}
                        >
                          <CardArt card={h.card} size="xs" />
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
                              {h.card.name}
                            </div>
                            <div
                              style={{
                                fontSize: 9.5,
                                color: "var(--ink-3)",
                                letterSpacing: "0.04em",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {h.card.setName} · {h.condition} ·{" "}
                              {h.card.marketPrice != null
                                ? formatUsdCents((h.card.marketPrice ?? 0) * sc.qty)
                                : "—"}
                            </div>
                          </div>
                          {/* Qty stepper (only if holding has >1) */}
                          {h.quantity > 1 && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                border: "1px solid var(--rule)",
                                borderRadius: 4,
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              <button
                                onClick={() => setQty(sc.holdingId, sc.qty - 1)}
                                style={{
                                  width: 22,
                                  height: 22,
                                  color: "var(--ink-2)",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  lineHeight: 1,
                                }}
                              >
                                −
                              </button>
                              <span
                                style={{
                                  width: 20,
                                  textAlign: "center",
                                  fontSize: 11,
                                  fontFamily: "var(--font-mono)",
                                  color: "var(--ink)",
                                }}
                              >
                                {sc.qty}
                              </span>
                              <button
                                onClick={() => setQty(sc.holdingId, sc.qty + 1)}
                                style={{
                                  width: 22,
                                  height: 22,
                                  color: "var(--ink-2)",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  lineHeight: 1,
                                }}
                              >
                                +
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => removeHolding(sc.holdingId)}
                            style={{
                              color: "var(--ink-3)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 2,
                            }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Totals + fairness + CTA */}
              <div
                style={{
                  padding: "16px 20px",
                  borderTop: "1px solid var(--rule)",
                  background: "var(--surface)",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--ink-3)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Their ask
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--ink-2)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatUsdCents(askCents)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--ink-3)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Your offer
                  </span>
                  <span
                    className="serif"
                    style={{
                      fontSize: 22,
                      letterSpacing: "-0.02em",
                      color: "var(--ink)",
                    }}
                  >
                    {formatUsdCents(offerTotal)}
                  </span>
                </div>

                {/* Fairness banner */}
                {canSubmit && (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: "var(--radius-sm)",
                      background: `color-mix(in srgb, ${toneColor} 8%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${toneColor} 25%, transparent)`,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: toneColor,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: toneColor }}>
                        {fairness.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--ink-3)",
                          letterSpacing: "0.04em",
                          marginLeft: "auto",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {fairness.delta >= 0 ? "+" : ""}
                        {fairness.deltaPct.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
                      {fairness.body}
                    </div>
                  </div>
                )}

                <Button
                  variant="default"
                  className="w-full"
                  disabled={!canSubmit}
                  onClick={() => setStep(2)}
                >
                  {canSubmit ? (
                    <>
                      Review offer <ArrowRight size={14} className="ml-1.5" />
                    </>
                  ) : (
                    "Add something to trade"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <div style={{ padding: 28, overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
            <div className="eyebrow" style={{ marginBottom: 18, textAlign: "center" }}>
              The exchange
            </div>

            {/* 3-column summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: 16,
                alignItems: "stretch",
              }}
            >
              <SideSummary
                title="You send"
                displayName="You"
                cashCents={cashCents}
                cards={sendCards}
                totalCents={offerTotal}
              />

              {/* Swap icon */}
              <div style={{ display: "grid", placeItems: "center" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "var(--ink)",
                    color: "var(--bg)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {/* swap arrows */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                    <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </div>

              <SideSummary
                title="You receive"
                displayName={ownerName}
                cashCents={0}
                cards={receiveCards}
                totalCents={listing.card.marketPrice ?? 0}
                flip
              />
            </div>

            {/* Message textarea */}
            <div style={{ marginTop: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                A short note (optional)
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Hey ${ownerName.split(" ")[0]} — been hunting this one. Let me know if that works.`}
                style={{
                  width: "100%",
                  minHeight: 80,
                  padding: "12px 14px",
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

            {/* Escrow callout */}
            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-sunk)",
                border: "1px solid var(--rule)",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <Shield
                size={16}
                style={{ color: "var(--signal-green)", flexShrink: 0, marginTop: 1 }}
              />
              <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
                <span style={{ color: "var(--ink)", fontWeight: 600 }}>Ledger escrow.</span> Cards
                and cash
                {cashCents > 0 ? ` (${formatUsdCents(cashCents)})` : ""} are locked when{" "}
                {ownerName.split(" ")[0]} accepts. Both sides ship with tracking within 3 days;
                funds release on confirmed delivery.
              </div>
            </div>

            {/* Action row */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 20,
                alignItems: "center",
              }}
            >
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft size={14} className="mr-1.5" /> Back
              </Button>
              <div style={{ flex: 1 }} />
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="default" disabled={submitting} onClick={handleSubmit}>
                {submitting ? (
                  <>
                    <Loader2 size={14} className="mr-1.5 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send size={14} className="mr-1.5" /> Send offer
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
