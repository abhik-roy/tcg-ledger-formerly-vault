"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, AlertCircle } from "lucide-react"
import { AddStockBtn } from "@/components/admin/AddStockBtn"

// --- THE SHARED DATA CONTRACT ---
export interface ProductProps {
  id: string // <--- Fixed missing ID
  name: string
  set: string
  setName?: string
  rarity: string
  collectorNumber: string
  price: number
  image: string
  stock: number
}

interface ProductCardProps {
  product: ProductProps
  mode?: "shop" | "admin"
  onAdd: (id: string, quantity: number) => void
}

export function ProductCard({ product, mode = "shop", onAdd }: ProductCardProps) {
  const priceDisplay = (product.price / 100).toFixed(2)

  const isOutOfStock = product.stock <= 0
  const showSoldOutUI = isOutOfStock && mode === "shop"

  return (
    <div className="flex flex-row w-full max-w-[600px] overflow-hidden border border-border rounded-lg shadow-sm hover:shadow-md transition-all bg-card h-[180px]">
      {/* LEFT: Image Section */}
      <div className="relative w-[140px] min-w-[140px] bg-muted/50 p-3 flex items-center justify-center">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="140px"
            className={`object-contain p-2 ${showSoldOutUI ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground/70">
            <AlertCircle className="w-8 h-8 mb-1" />
            <span className="text-caption">No Image</span>
          </div>
        )}

        {showSoldOutUI && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5">
            <Badge variant="destructive" className="text-xs">
              SOLD OUT
            </Badge>
          </div>
        )}
      </div>

      {/* RIGHT: Content Section */}
      <div className="flex flex-col flex-1 p-4 justify-between">
        {/* Top: Details */}
        <div className="space-y-1">
          <div className="flex justify-between items-start">
            <h3
              className="font-bold text-lg text-foreground leading-tight line-clamp-1"
              title={product.name}
            >
              {product.name}
            </h3>
            <span className="text-xs font-mono text-muted-foreground/70">
              #{product.collectorNumber}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{product.set}</p>
          <Badge
            variant="secondary"
            className="text-xs font-normal px-2 py-0.5 bg-muted text-foreground/70 w-fit"
          >
            {product.rarity}
          </Badge>
        </div>

        {/* Bottom: Price & Action */}
        <div className="flex items-end justify-between gap-4 mt-2">
          <div>
            <span className="block text-xl font-bold text-foreground">${priceDisplay}</span>
            <span
              className={`text-xs font-medium ${isOutOfStock ? "text-destructive" : "text-success"}`}
            >
              {isOutOfStock ? "Out of Stock" : `${product.stock} in stock`}
            </span>
          </div>

          {/* Action Buttons */}
          {mode === "admin" ? (
            // ADMIN MODE: Stock Trigger
            <div onClick={(e) => e.stopPropagation()}>
              <AddStockBtn cardId={product.id} cardName={product.name} />
            </div>
          ) : (
            // SHOP MODE: Add to Cart
            <Button
              size="sm"
              className="h-9 px-4"
              disabled={showSoldOutUI}
              onClick={(e) => {
                e.preventDefault()
                onAdd(product.id, 1)
              }}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
