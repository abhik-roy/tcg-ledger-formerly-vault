"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import type { HoldingDTO } from "@/lib/dtos"
import { updateTargets } from "@/app/actions/buylist"
import { Search, Save, Loader2, Target, ImageIcon } from "lucide-react"
import { toast } from "sonner"

interface TargetsClientProps {
  holdings: HoldingDTO[]
}

type LocalItem = HoldingDTO & { _idealQty: number; _maxQty: number; _dirty: boolean }

function toLocal(h: HoldingDTO): LocalItem {
  return { ...h, _idealQty: h.idealQuantity, _maxQty: h.maxQuantity, _dirty: false }
}

export function TargetsClient({ holdings }: TargetsClientProps) {
  const [items, setItems] = useState<LocalItem[]>(() => holdings.map(toLocal))
  const [search, setSearch] = useState("")
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (h) => h.card.name.toLowerCase().includes(q) || h.card.setName.toLowerCase().includes(q)
    )
  }, [items, search])

  function updateField(id: string, field: "_idealQty" | "_maxQty", raw: string) {
    const val = Math.max(0, parseInt(raw) || 0)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: val, _dirty: true } : i)))
  }

  async function handleSave(item: LocalItem) {
    setSavingIds((prev) => new Set(prev).add(item.id))
    const res = await updateTargets(item.id, item._idealQty, item._maxQty)
    setSavingIds((prev) => {
      const s = new Set(prev)
      s.delete(item.id)
      return s
    })
    if (res.success) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, _dirty: false } : i)))
      toast.success(`Saved targets for ${item.card.name}`)
    } else {
      toast.error(res.error)
    }
  }

  const stats = useMemo(() => {
    const total = items.length
    const needMore = items.filter((i) => i.quantity < i._idealQty).length
    const atMax = items.filter((i) => i._maxQty > 0 && i.quantity >= i._maxQty).length
    return { total, needMore, atMax }
  }, [items])

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Stats bar */}
      <div className="px-4 sm:px-5 h-14 border-b border-border bg-card flex items-center gap-4 sm:gap-8 shrink-0 overflow-x-auto">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            Tracked
          </span>
          <span className="text-lg font-bold text-foreground tabular-nums leading-none">
            {stats.total}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            Need More
          </span>
          <span className="text-lg font-bold text-success tabular-nums leading-none">
            {stats.needMore}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            At Max
          </span>
          <span className="text-lg font-bold text-warning tabular-nums leading-none">
            {stats.atMax}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 sm:px-5 py-2 sm:h-12 border-b border-border bg-card flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search card name or set..."
            className="w-full h-10 sm:h-8 pl-8 pr-3 bg-muted/40 border border-border rounded-md text-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[600px]">
          <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Card
              </th>
              <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px] text-center">
                Have
              </th>
              <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px] text-center">
                Ideal
              </th>
              <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px] text-center">
                Max
              </th>
              <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px] text-center hidden sm:table-cell">
                Status
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px] text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Target className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">No targets set</p>
                    <p className="text-xs text-muted-foreground">
                      Set ideal/max quantities on your holdings to track targets.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const isSaving = savingIds.has(item.id)
              const needMore = item.quantity < item._idealQty
              const atMax = item._maxQty > 0 && item.quantity >= item._maxQty
              return (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-11 relative bg-muted rounded border border-border shrink-0 overflow-hidden">
                        {item.card.imageSmall ? (
                          <Image
                            src={item.card.imageSmall}
                            alt={item.card.name}
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
                        <p className="font-semibold text-foreground truncate">{item.card.name}</p>
                        <span className="text-caption bg-muted border border-border px-1.5 py-0.5 rounded text-foreground/70 font-medium uppercase tracking-wide">
                          {item.card.setName}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums font-bold">{item.quantity}</td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item._idealQty}
                      onChange={(e) => updateField(item.id, "_idealQty", e.target.value)}
                      className="h-8 w-16 text-center text-sm border border-border rounded bg-muted/40 focus:bg-card focus:border-primary/50 transition-colors"
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item._maxQty}
                      onChange={(e) => updateField(item.id, "_maxQty", e.target.value)}
                      className="h-8 w-16 text-center text-sm border border-border rounded bg-muted/40 focus:bg-card focus:border-primary/50 transition-colors"
                    />
                  </td>
                  <td className="px-3 py-3 text-center hidden sm:table-cell">
                    {needMore ? (
                      <span className="text-xs font-semibold text-success">Need More</span>
                    ) : atMax ? (
                      <span className="text-xs font-semibold text-warning">At Max</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">OK</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleSave(item)}
                      disabled={isSaving || !item._dirty}
                      className={`h-8 px-3 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ml-auto ${
                        isSaving
                          ? "bg-muted text-muted-foreground/50"
                          : item._dirty
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-card text-foreground/50 border border-border"
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
