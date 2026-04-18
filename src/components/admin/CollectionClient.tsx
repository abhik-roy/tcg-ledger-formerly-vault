"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { HoldingDTO } from "@/lib/dtos"
import { updateHolding, deleteHolding, toggleTradeListingAction } from "@/app/actions/holding"
import { Search, Download, Trash2, Pencil, ImageIcon, Loader2, X, Check } from "lucide-react"
import { toast } from "sonner"

interface CollectionClientProps {
  holdings: HoldingDTO[]
}

export function CollectionClient({ holdings }: CollectionClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [gameFilter, setGameFilter] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState(1)
  const [editCondition, setEditCondition] = useState("NM")
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    let result = holdings
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (h) => h.card.name.toLowerCase().includes(q) || h.card.setName.toLowerCase().includes(q)
      )
    }
    if (gameFilter) {
      result = result.filter((h) => h.card.game.toLowerCase().includes(gameFilter.toLowerCase()))
    }
    return result
  }, [holdings, search, gameFilter])

  const totalValue = useMemo(
    () => holdings.reduce((sum, h) => sum + (h.card.marketPrice ?? 0) * h.quantity, 0),
    [holdings]
  )

  const games = useMemo(() => {
    const s = new Set(holdings.map((h) => h.card.game))
    return Array.from(s).sort()
  }, [holdings])

  function startEdit(h: HoldingDTO) {
    setEditingId(h.id)
    setEditQty(h.quantity)
    setEditCondition(h.condition)
  }

  async function saveEdit(holdingId: string) {
    setSaving(true)
    const res = await updateHolding(holdingId, {
      quantity: editQty,
      condition: editCondition,
    })
    setSaving(false)
    if (res.success) {
      toast.success("Updated")
      setEditingId(null)
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  async function handleDelete(holdingId: string) {
    if (!confirm("Delete this holding?")) return
    const res = await deleteHolding(holdingId)
    if (res.success) {
      toast.success("Deleted")
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  // Ask price state per holding
  const [askTypes, setAskTypes] = useState<Map<string, string | null>>(() => {
    const map = new Map<string, string | null>()
    for (const h of holdings) {
      if (h.listedForTrade) map.set(h.id, h.askType ?? null)
    }
    return map
  })
  const [askValues, setAskValues] = useState<Map<string, number | null>>(() => {
    const map = new Map<string, number | null>()
    for (const h of holdings) {
      if (h.listedForTrade) map.set(h.id, h.askValue ?? null)
    }
    return map
  })

  async function handleToggleTrade(
    h: HoldingDTO,
    qty?: number,
    askType?: string | null,
    askValue?: number | null
  ) {
    // If qty provided, use it. Otherwise toggle: if listed, unlist (0); if not, list all.
    const newQty = qty !== undefined ? qty : h.listedForTrade ? 0 : h.quantity
    const at = askType !== undefined ? askType : (askTypes.get(h.id) ?? null)
    const av = askValue !== undefined ? askValue : (askValues.get(h.id) ?? null)
    const res = await toggleTradeListingAction(h.id, newQty, undefined, at, av)
    if (res.success) {
      toast.success(newQty > 0 ? `Listed ${newQty} for trade` : "Removed from trade binder")
      if (newQty > 0) {
        setAskTypes((prev) => new Map(prev).set(h.id, at))
        setAskValues((prev) => new Map(prev).set(h.id, av))
      }
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  function handleAskTypeChange(h: HoldingDTO, newType: string) {
    const at = newType === "" ? null : newType
    setAskTypes((prev) => new Map(prev).set(h.id, at))
    // Clear value when switching to no-ask or trade-only
    if (!at || at === "trade_only") {
      setAskValues((prev) => new Map(prev).set(h.id, null))
      handleToggleTrade(h, h.listedQuantity, at, null)
    }
  }

  function handleAskValueChange(h: HoldingDTO, val: number | null) {
    setAskValues((prev) => new Map(prev).set(h.id, val))
  }

  function commitAskValue(h: HoldingDTO) {
    const at = askTypes.get(h.id) ?? null
    const av = askValues.get(h.id) ?? null
    handleToggleTrade(h, h.listedQuantity, at, av)
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Stats bar — horizontally scrollable on mobile */}
      <div className="px-4 sm:px-5 h-14 border-b border-border bg-card flex items-center gap-4 sm:gap-6 shrink-0 overflow-x-auto">
        <div className="flex flex-col gap-0.5 shrink-0">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            Holdings
          </span>
          <span className="text-base font-bold text-foreground tabular-nums">
            {holdings.length.toLocaleString()}
          </span>
        </div>
        <div className="h-8 w-px bg-border shrink-0" />
        <div className="flex flex-col gap-0.5 shrink-0">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            Total Value
          </span>
          <span className="text-base font-bold text-foreground tabular-nums">
            $
            {(totalValue / 100).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 sm:px-5 py-2 sm:h-12 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-card shrink-0">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards..."
            className="w-full h-10 sm:h-8 pl-8 pr-3 bg-muted/40 border border-border rounded-md text-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          {games.length > 1 && (
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="h-10 sm:h-8 px-2 rounded-md text-xs font-medium border border-border bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <option value="">All Games</option>
              {games.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => (window.location.href = "/api/collection/export")}
            className="h-10 sm:h-7 px-2.5 rounded-md text-xs font-medium border border-border bg-muted/40 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 min-w-[44px]"
            title="Export CSV"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Content — table on desktop, card list on mobile */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-foreground">No holdings found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add cards to start your collection.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: card-per-row layout */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((h) => (
                <div key={h.id} className="px-4 py-3 flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="w-10 h-14 relative bg-muted rounded border border-border shrink-0 overflow-hidden">
                    {h.card.imageSmall ? (
                      <Image
                        src={h.card.imageSmall}
                        alt={h.card.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-3 h-3 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{h.card.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-caption bg-muted border border-border px-1.5 py-0.5 rounded text-foreground/70 font-medium uppercase tracking-wide">
                        {h.card.set}
                      </span>
                      <span className="text-caption text-muted-foreground">{h.condition}</span>
                      <span className="text-caption text-muted-foreground">x{h.quantity}</span>
                    </div>
                    {h.card.marketPrice != null && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
                        ${(h.card.marketPrice / 100).toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {editingId === h.id ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          value={editQty}
                          onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                          className="h-9 w-14 text-center text-sm border border-border rounded bg-muted/40"
                        />
                        <button
                          onClick={() => saveEdit(h.id)}
                          disabled={saving}
                          className="w-11 h-11 rounded-md flex items-center justify-center text-success hover:bg-success/10 transition-colors"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="w-11 h-11 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(h)}
                          className="w-11 h-11 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="w-11 h-11 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table layout */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Card
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                        Qty
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                        Cond
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">
                        Price
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px] hidden lg:table-cell">
                        Trade
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px] text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((h) => (
                      <tr key={h.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-11 relative bg-muted rounded border border-border shrink-0 overflow-hidden">
                              {h.card.imageSmall ? (
                                <Image
                                  src={h.card.imageSmall}
                                  alt={h.card.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-3 h-3 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {h.card.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-caption bg-muted border border-border px-1.5 py-0.5 rounded text-foreground/70 font-medium uppercase tracking-wide">
                                  {h.card.set}
                                </span>
                                <span className="text-caption text-muted-foreground">
                                  {h.card.game}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {editingId === h.id ? (
                            <input
                              type="number"
                              min="0"
                              value={editQty}
                              onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                              className="h-8 w-16 text-center text-sm border border-border rounded bg-muted/40"
                            />
                          ) : (
                            h.quantity
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingId === h.id ? (
                            <select
                              value={editCondition}
                              onChange={(e) => setEditCondition(e.target.value)}
                              className="h-8 px-1 text-xs border border-border rounded bg-muted/40"
                            >
                              {["NM", "LP", "MP", "HP", "DMG"].map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs">{h.condition}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {h.card.marketPrice != null
                            ? `$${(h.card.marketPrice / 100).toFixed(2)}`
                            : "\u2014"}
                        </td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <div className="flex flex-col gap-1.5">
                            {h.listedForTrade ? (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max={h.quantity}
                                    defaultValue={h.listedQuantity}
                                    onBlur={(e) => {
                                      const val = parseInt(e.target.value) || 0
                                      if (val !== h.listedQuantity) handleToggleTrade(h, val)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                                    }}
                                    className="w-12 h-7 text-center text-xs border border-primary/30 rounded bg-primary/5 text-primary tabular-nums"
                                  />
                                  <span className="text-caption text-muted-foreground">
                                    /{h.quantity}
                                  </span>
                                </div>
                                <select
                                  value={askTypes.get(h.id) ?? ""}
                                  onChange={(e) => handleAskTypeChange(h, e.target.value)}
                                  className="h-7 px-1 text-[10px] border border-border rounded bg-muted/40 text-muted-foreground w-full max-w-[120px]"
                                >
                                  <option value="">No ask</option>
                                  <option value="custom">Custom $</option>
                                  <option value="percent">% of Market</option>
                                  <option value="trade_only">Trade Only</option>
                                </select>
                                {(askTypes.get(h.id) === "custom" ||
                                  askTypes.get(h.id) === "percent") && (
                                  <input
                                    type="number"
                                    min="0"
                                    step={askTypes.get(h.id) === "custom" ? "0.01" : "1"}
                                    value={
                                      askValues.get(h.id) != null
                                        ? askTypes.get(h.id) === "custom"
                                          ? ((askValues.get(h.id) ?? 0) / 100).toFixed(2)
                                          : (askValues.get(h.id) ?? "")
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const raw = parseFloat(e.target.value)
                                      if (isNaN(raw)) {
                                        handleAskValueChange(h, null)
                                      } else {
                                        handleAskValueChange(
                                          h,
                                          askTypes.get(h.id) === "custom"
                                            ? Math.round(raw * 100)
                                            : raw
                                        )
                                      }
                                    }}
                                    onBlur={() => commitAskValue(h)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                                    }}
                                    placeholder={askTypes.get(h.id) === "custom" ? "$0.00" : "100"}
                                    className="w-20 h-7 text-center text-[10px] border border-border rounded bg-muted/40 tabular-nums"
                                  />
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => handleToggleTrade(h)}
                                className="text-xs px-2 py-1 rounded-full border font-medium min-h-[32px] bg-muted/50 text-muted-foreground border-border hover:border-primary/30 hover:text-primary transition-colors"
                              >
                                List
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {editingId === h.id ? (
                              <>
                                <button
                                  onClick={() => saveEdit(h.id)}
                                  disabled={saving}
                                  className="w-8 h-8 rounded-md flex items-center justify-center text-success hover:bg-success/10 transition-colors"
                                >
                                  {saving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(h)}
                                  className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(h.id)}
                                  className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
