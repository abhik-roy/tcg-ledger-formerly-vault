"use client"

import Image from "next/image"
import { InventoryItemDTO } from "@/lib/dtos"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ShoppingCart } from "lucide-react"

interface QuickViewModalProps {
  item: InventoryItemDTO | null
  open: boolean
  onClose: () => void
  onAdd: (item: InventoryItemDTO) => void
  getHighRes: (url?: string | null) => string | null
}

export function QuickViewModal({ item, open, onClose, onAdd, getHighRes }: QuickViewModalProps) {
  if (!item) return null

  const outOfStock = item.quantity === 0
  const lowStock = item.quantity > 0 && item.quantity < 4

  function handleAdd() {
    onAdd(item!)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative aspect-[3/4] sm:w-64 sm:min-w-[256px] bg-muted shrink-0">
            {item.image ? (
              <Image
                src={getHighRes(item.image) || item.image}
                alt={item.cardName}
                fill
                className="object-contain p-4"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs uppercase tracking-widest">
                No image
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col flex-1 p-6 gap-4">
            <DialogHeader className="text-left gap-1">
              <DialogTitle className="text-lg font-semibold leading-snug">
                {item.cardName}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {item.setName}
              </DialogDescription>
            </DialogHeader>

            {/* Attributes */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {item.rarity && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Rarity
                  </span>
                  <p className="font-medium text-foreground">{item.rarity}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  Condition
                </span>
                <p className="font-medium text-foreground">{item.condition}</p>
              </div>
              {item.finish && item.finish !== "nonfoil" && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Finish
                  </span>
                  <p className="font-medium text-foreground capitalize">{item.finish}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  Stock
                </span>
                <p
                  className={`font-medium ${
                    outOfStock ? "text-destructive" : lowStock ? "text-warning" : "text-foreground"
                  }`}
                >
                  {outOfStock
                    ? "Sold out"
                    : lowStock
                      ? `Only ${item.quantity} left`
                      : `${item.quantity} available`}
                </p>
              </div>
            </div>

            {/* Price + Add to Cart */}
            <div className="mt-auto pt-4 flex items-center justify-between border-t border-border">
              <span className="text-2xl font-bold text-foreground tabular-nums">
                ${(item.price / 100).toFixed(2)}
              </span>
              <button
                disabled={outOfStock}
                onClick={handleAdd}
                className="flex items-center gap-2 h-10 px-5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
