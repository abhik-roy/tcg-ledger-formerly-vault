"use client"

import { useState } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { InventoryItemDTO } from "@/lib/dtos"
import { updateQuickStock } from "@/app/actions/inventory"
import { Loader2, Check, ImageIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface InventoryGridProps {
  data: InventoryItemDTO[]
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
}

export function InventoryGrid({ data, selectedIds, onToggleSelect }: InventoryGridProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2 text-center">
        <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">No items found matching your search.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 p-4">
      {data.map((item) => (
        <GridCard
          key={item.id}
          item={item}
          isSelected={selectedIds.has(item.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  )
}

function GridCard({
  item,
  isSelected,
  onToggleSelect,
}: {
  item: InventoryItemDTO
  isSelected: boolean
  onToggleSelect: (id: number) => void
}) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const perms = session?.user?.permissions
  const canEditQty = isAdmin || (perms?.inventoryUpdateQty ?? false)
  const canEditPrice = isAdmin || (perms?.inventoryUpdatePrices ?? false)

  const [qty, setQty] = useState(item.quantity)
  const [price, setPrice] = useState(item.price)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const isDirty = (qty !== item.quantity && canEditQty) || (price !== item.price && canEditPrice)
  const isZero = qty === 0

  async function handleSave() {
    setLoading(true)
    await updateQuickStock(item.id, qty, price)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden flex flex-col transition-colors ${
        isDirty
          ? "border-primary/40"
          : isSelected
            ? "border-primary/60 ring-1 ring-primary/20"
            : "border-border hover:border-border/80"
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[2.5/3.5] bg-muted/40 shrink-0">
        {item.image ? (
          <Image src={item.image} alt={item.cardName} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="w-7 h-7 text-muted-foreground/15" />
          </div>
        )}

        {/* Selection checkbox */}
        <div className="absolute top-1.5 left-1.5 z-[1]">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(item.id)}
            aria-label={`Select ${item.cardName}`}
            className="bg-background/80 backdrop-blur-sm shadow-sm"
          />
        </div>

        {/* Top badges */}
        <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
          {item.finish !== "nonfoil" && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground uppercase leading-none shadow">
              {item.finish}
            </span>
          )}
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-background/80 text-foreground border border-border/50 backdrop-blur-sm leading-none shadow-sm">
            {item.condition}
          </span>
        </div>

        {/* Out of stock ribbon */}
        {isZero && !isDirty && (
          <div className="absolute inset-x-0 bottom-0 bg-destructive/80 backdrop-blur-sm py-1 text-center pointer-events-none">
            <span className="text-[9px] font-bold text-white uppercase tracking-widest">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info + controls */}
      <div className="p-2.5 flex flex-col gap-2">
        {/* Name */}
        <div className="min-w-0">
          <p
            className="text-label font-semibold text-foreground leading-tight line-clamp-2"
            title={item.cardName}
          >
            {item.cardName}
          </p>
          <p className="text-caption text-muted-foreground leading-tight mt-0.5 line-clamp-1">
            {item.setName}
          </p>
        </div>

        {/* Qty + Price inputs */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Qty
            </p>
            <input
              type="number"
              value={qty}
              min={0}
              disabled={!canEditQty}
              onChange={(e) => setQty(Number(e.target.value))}
              className={`w-full h-7 px-2 text-xs font-medium rounded-md border outline-none transition-colors tabular-nums disabled:opacity-40 disabled:cursor-not-allowed ${
                isZero
                  ? "bg-destructive/8 text-destructive border-destructive/25 focus:border-destructive/50"
                  : "bg-muted/40 text-foreground border-border focus:border-primary/50 focus:bg-card"
              }`}
            />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Price
            </p>
            <input
              type="number"
              step="0.01"
              value={(price / 100).toFixed(2)}
              disabled={!canEditPrice}
              onChange={(e) => setPrice(Math.round(Number(e.target.value) * 100))}
              className="w-full h-7 px-2 text-xs font-medium rounded-md border border-border bg-muted/40 text-foreground outline-none focus:border-primary/50 focus:bg-card transition-colors tabular-nums disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleSave}
          disabled={!isDirty || loading}
          className={`w-full h-7 rounded-md text-label font-semibold flex items-center justify-center gap-1 transition-all ${
            saved
              ? "bg-success/10 text-success border border-success/20"
              : isDirty
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground/30 cursor-default"
          }`}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-3 h-3" /> Saved
            </>
          ) : isDirty ? (
            "Save"
          ) : (
            <span className="text-caption">
              ${(price / 100).toFixed(2)} · {qty} in stock
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
