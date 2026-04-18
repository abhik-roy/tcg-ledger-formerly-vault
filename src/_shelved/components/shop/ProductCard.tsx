import Image from "next/image"
import { Plus } from "lucide-react"
import { InventoryItemDTO } from "@/lib/dtos"
import { formatPrice } from "@/lib/format"

interface ProductCardProps {
  item: InventoryItemDTO
  getHighRes: (url?: string | null) => string | null
  onClick: () => void
}

export function ProductCard({ item, getHighRes, onClick }: ProductCardProps) {
  const outOfStock = item.quantity === 0
  const lowStock = item.quantity > 0 && item.quantity < 4

  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-card border border-border rounded-xl overflow-hidden flex flex-col group transition-all duration-150 hover:shadow-lg hover:-translate-y-px text-left w-full ${outOfStock ? "opacity-55" : ""}`}
    >
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {item.image ? (
          <Image
            src={getHighRes(item.image) || item.image}
            alt={item.cardName}
            fill
            className="object-contain p-1.5 group-hover:scale-[1.04] transition-transform duration-200"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 text-[9px] uppercase tracking-widest">
            No image
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-end justify-center pb-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-background/90 text-muted-foreground border border-border rounded-full">
              Sold out
            </span>
          </div>
        )}
        {lowStock && (
          <div className="absolute top-1.5 right-1.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/25 rounded">
              {item.quantity} left
            </span>
          </div>
        )}
      </div>

      <div className="p-2.5 flex flex-col gap-0.5 flex-1">
        {item.finish && item.finish !== "nonfoil" && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-warning leading-none">
            {item.finish}
          </span>
        )}
        <p
          className="text-xs font-semibold text-foreground line-clamp-2 leading-snug"
          title={item.cardName}
        >
          {item.cardName}
        </p>
        <p className="text-[10px] text-muted-foreground line-clamp-1 leading-snug">
          {item.setName}
        </p>

        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground tabular-nums">
            {formatPrice(item.price)}
          </span>
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
            aria-hidden="true"
          >
            <Plus className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </button>
  )
}
