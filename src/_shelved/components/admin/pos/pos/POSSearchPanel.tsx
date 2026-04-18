"use client"

import { Search, X, Package } from "lucide-react"
import { type POSInventoryItem } from "@/app/actions/pos"
import { type CartItem } from "./POSClient"

interface POSSearchPanelProps {
  products: POSInventoryItem[]
  search: string
  onSearchChange: (val: string) => void
  onAddToCart: (item: POSInventoryItem) => void
  cartItems: CartItem[]
  loading: boolean
}

function conditionLabel(c: string) {
  return c?.toUpperCase() || "NM"
}

function finishLabel(f: string) {
  if (!f || f === "nonfoil") return null
  return f.replace(/_/g, " ")
}

function formatPrice(cents: number) {
  return "$" + (cents / 100).toFixed(2)
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-muted/50" />
      <div className="p-2 space-y-1.5">
        <div className="h-2.5 bg-muted/70 rounded w-3/4" />
        <div className="h-2 bg-muted/50 rounded w-1/2" />
        <div className="h-3 bg-muted/60 rounded w-1/3 mt-1" />
      </div>
    </div>
  )
}

export function POSSearchPanel({
  products,
  search,
  onSearchChange,
  onAddToCart,
  cartItems,
  loading,
}: POSSearchPanelProps) {
  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden">
      {/* Search bar */}
      <div className="h-12 border-b border-border flex items-center px-3 gap-2 shrink-0">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search cards by name..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoFocus
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Package className="w-10 h-10 opacity-30" />
            <p className="text-sm">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map((item) => {
              const cartEntry = cartItems.find((c) => c.id === item.id)
              const cartQty = cartEntry?.cartQty ?? 0
              const isMaxed = cartQty >= item.quantity
              const finish = finishLabel(item.finish)

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!isMaxed) onAddToCart(item)
                  }}
                  className={[
                    "bg-card border border-border rounded-lg overflow-hidden transition-all group relative",
                    isMaxed
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:border-primary/50 hover:shadow-sm",
                  ].join(" ")}
                >
                  {/* Image */}
                  <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Cart count badge */}
                    {cartQty > 0 && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-caption font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                        {cartQty}
                      </div>
                    )}

                    {/* Max overlay */}
                    {isMaxed && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <span className="text-xs font-bold text-foreground bg-card border border-border px-2 py-0.5 rounded">
                          MAX
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <p className="text-xs font-medium truncate text-foreground leading-tight">
                      {item.name}
                    </p>
                    <p className="text-caption text-muted-foreground truncate mt-0.5">
                      {item.setName}
                    </p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1 py-px">
                        {conditionLabel(item.condition)}
                      </span>
                      {finish && (
                        <span className="text-[9px] uppercase tracking-wide text-primary border border-primary/25 bg-primary/10 rounded px-1 py-px">
                          {finish}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-bold text-foreground">
                        {formatPrice(item.price)}
                      </span>
                      <span className="text-caption text-muted-foreground">
                        {item.quantity} left
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
