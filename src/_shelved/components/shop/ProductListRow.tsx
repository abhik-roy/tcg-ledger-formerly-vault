import Image from "next/image"
import { Plus } from "lucide-react"
import { InventoryItemDTO } from "@/lib/dtos"
import { formatPrice } from "@/lib/format"

interface ProductListRowProps {
  item: InventoryItemDTO
  getHighRes: (url?: string | null) => string | null
  onView: () => void
  onAdd: () => void
}

export function ProductListRow({ item, getHighRes, onView, onAdd }: ProductListRowProps) {
  const outOfStock = item.quantity === 0
  const lowStock = item.quantity > 0 && item.quantity < 4

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3.5 border-b border-white/10 last:border-0 hover:bg-white/8 transition-colors ${outOfStock ? "opacity-50" : ""}`}
    >
      {/* Image thumbnail */}
      <button
        onClick={onView}
        className="relative w-10 h-14 bg-white/10 rounded overflow-hidden shrink-0"
        aria-label={`View ${item.cardName}`}
      >
        {item.image && (
          <Image
            src={getHighRes(item.image) || item.image}
            alt={item.cardName}
            fill
            className="object-contain"
            unoptimized
          />
        )}
      </button>

      {/* Card info */}
      <div className="flex-1 min-w-0">
        <button onClick={onView} className="text-left w-full">
          <p className="text-sm font-medium text-primary-foreground truncate leading-snug">
            {item.cardName}
          </p>
          <p className="text-xs text-primary-foreground/60 truncate leading-snug mt-0.5">
            {item.setName}
          </p>
        </button>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-white/10 text-primary-foreground/80 rounded">
            {item.condition}
          </span>
          {item.finish && item.finish !== "nonfoil" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-yellow-400/15 text-yellow-200 rounded">
              {item.finish}
            </span>
          )}
          {lowStock && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-orange-400/15 text-orange-200 rounded">
              {item.quantity} left
            </span>
          )}
        </div>
      </div>

      {/* Price + action */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-bold text-primary-foreground tabular-nums">
          {formatPrice(item.price)}
        </span>
        {outOfStock ? (
          <span className="text-xs text-primary-foreground/40">Out of stock</span>
        ) : (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 h-8 px-3 bg-white text-primary rounded-lg text-xs font-semibold hover:bg-white/90 active:bg-white/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        )}
      </div>
    </div>
  )
}
