"use client"

import { ShoppingCart, X, Minus, Plus } from "lucide-react"
import { type CartItem } from "./POSClient"

interface POSCartPanelProps {
  cartItems: CartItem[]
  onUpdateQty: (id: number, qty: number) => void
  onRemove: (id: number) => void
  onClearAll: () => void
  onCheckout: () => void
  subtotal: number
}

function formatPrice(cents: number) {
  return "$" + (cents / 100).toFixed(2)
}

export function POSCartPanel({
  cartItems,
  onUpdateQty,
  onRemove,
  onClearAll,
  onCheckout,
  subtotal,
}: POSCartPanelProps) {
  const totalQty = cartItems.reduce((s, c) => s + c.cartQty, 0)

  return (
    <div className="w-[380px] border-l border-border flex flex-col h-full bg-card shrink-0">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center px-4 gap-2 shrink-0">
        <span className="font-semibold text-sm text-foreground">Cart</span>
        {totalQty > 0 && (
          <span className="bg-primary text-primary-foreground text-caption font-bold px-1.5 py-0.5 rounded-full">
            {totalQty}
          </span>
        )}
        {cartItems.length > 0 && (
          <button
            onClick={onClearAll}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <ShoppingCart className="w-10 h-10 opacity-25" />
            <p className="text-sm">Your cart is empty</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 p-2 bg-background rounded-lg border border-border"
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded bg-muted/30 shrink-0 overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">{item.name}</p>
                  <p className="text-caption text-muted-foreground truncate">
                    {item.setName} &bull; {item.condition}
                  </p>
                </div>

                {/* Qty controls + price + remove */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onUpdateQty(item.id, item.cartQty - 1)}
                    className="h-6 w-6 border border-border rounded flex items-center justify-center hover:bg-muted/50 transition-colors text-foreground"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-medium w-5 text-center tabular-nums text-foreground">
                    {item.cartQty}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.id, item.cartQty + 1)}
                    disabled={item.cartQty >= item.quantity}
                    className="h-6 w-6 border border-border rounded flex items-center justify-center hover:bg-muted/50 transition-colors text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-semibold text-foreground w-14 text-right tabular-nums">
                    {formatPrice(item.price * item.cartQty)}
                  </span>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card p-4 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-sm font-bold text-foreground tabular-nums">
            {formatPrice(subtotal)}
          </span>
        </div>
        <button
          onClick={onCheckout}
          disabled={cartItems.length === 0}
          className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Complete Sale
          <span className="text-primary-foreground/70">&rarr;</span>
        </button>
      </div>
    </div>
  )
}
