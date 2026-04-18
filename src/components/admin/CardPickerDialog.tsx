"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Image from "next/image"
import type { HoldingDTO } from "@/lib/dtos"
import { Search, ImageIcon, X, Plus } from "lucide-react"

export type PickedCard = {
  holdingId: string
  quantity: number
  card: HoldingDTO["card"]
  condition: string
}

interface CardPickerDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (cards: PickedCard[]) => void
  holdings: HoldingDTO[]
}

export function CardPickerDialog({ open, onClose, onSelect, holdings }: CardPickerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Map<string, number>>(new Map())

  // Open/close dialog via ref
  useEffect(() => {
    if (open) {
      setSearch("")
      setSelected(new Map())
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [open])

  const tradeListed = useMemo(
    () => holdings.filter((h) => h.listedForTrade && h.listedQuantity > 0),
    [holdings]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return tradeListed
    const q = search.toLowerCase()
    return tradeListed.filter(
      (h) => h.card.name.toLowerCase().includes(q) || h.card.setName.toLowerCase().includes(q)
    )
  }, [tradeListed, search])

  function toggleSelect(holdingId: string) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(holdingId)) {
        next.delete(holdingId)
      } else {
        next.set(holdingId, 1)
      }
      return next
    })
  }

  function setQty(holdingId: string, qty: number) {
    setSelected((prev) => {
      const next = new Map(prev)
      next.set(holdingId, Math.max(1, qty))
      return next
    })
  }

  function handleAdd() {
    const cards: PickedCard[] = []
    for (const [holdingId, quantity] of selected) {
      const h = holdings.find((h) => h.id === holdingId)
      if (h) {
        cards.push({
          holdingId,
          quantity: Math.min(quantity, h.listedQuantity),
          card: h.card,
          condition: h.condition,
        })
      }
    }
    onSelect(cards)
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 bg-card border border-border rounded-lg p-0 w-[90vw] max-w-lg shadow-xl"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
      onClose={onClose}
    >
      <div className="p-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Pick Cards to Offer</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your trade-listed cards..."
            className="w-full h-10 pl-8 pr-3 bg-muted/40 border border-border rounded-md text-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border min-h-0">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No trade-listed cards found.
            </p>
          ) : (
            filtered.map((h) => {
              const isSelected = selected.has(h.id)
              return (
                <div
                  key={h.id}
                  className={`flex items-center gap-3 py-2 px-1 cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                  onClick={() => toggleSelect(h.id)}
                >
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
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{h.card.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-caption text-muted-foreground">{h.card.set}</span>
                      <span className="text-caption text-muted-foreground">{h.condition}</span>
                      {h.card.marketPrice != null && (
                        <span className="text-caption text-muted-foreground font-mono">
                          ${(h.card.marketPrice / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min="1"
                        max={h.listedQuantity}
                        value={selected.get(h.id) ?? 1}
                        onChange={(e) => setQty(h.id, parseInt(e.target.value) || 1)}
                        className="w-12 h-7 text-center text-xs border border-primary/30 rounded bg-primary/5 text-primary tabular-nums"
                      />
                      <span className="text-caption text-muted-foreground">
                        /{h.listedQuantity}
                      </span>
                    </div>
                  )}
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {isSelected && <Plus className="w-3 h-3 rotate-45" />}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <Plus className="w-3 h-3" />
            Add{" "}
            {selected.size > 0
              ? `${selected.size} card${selected.size > 1 ? "s" : ""}`
              : "selected"}
          </button>
        </div>
      </div>
    </dialog>
  )
}
