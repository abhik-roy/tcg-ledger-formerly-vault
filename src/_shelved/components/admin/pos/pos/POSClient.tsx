"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, LogOut } from "lucide-react"
import { searchPOSInventory, type POSInventoryItem } from "@/app/actions/pos"
import { POSSearchPanel } from "./POSSearchPanel"
import { POSCartPanel } from "./POSCartPanel"
import { POSCheckoutModal } from "./POSCheckoutModal"
import { POSExitModal } from "./POSExitModal"

export type CartItem = POSInventoryItem & { cartQty: number }

interface POSClientProps {
  initialItems: POSInventoryItem[]
}

function useTime() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function POSHeader({ cartCount, onExit }: { cartCount: number; onExit: () => void }) {
  const now = useTime()
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-5 justify-between shrink-0">
      <div className="flex items-center gap-2.5">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <span className="font-bold text-sm text-foreground">Point of Sale</span>
      </div>
      <div className="text-sm text-muted-foreground tabular-nums">
        {dateStr} &nbsp;&mdash;&nbsp; {timeStr}
      </div>
      <div className="flex items-center gap-3">
        {cartCount > 0 && (
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {cartCount}
          </span>
        )}
        <button
          onClick={onExit}
          className="border border-border rounded-md h-8 px-3 text-sm flex items-center gap-1.5 hover:bg-muted/50 transition-colors text-foreground"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit POS
        </button>
      </div>
    </header>
  )
}

export function POSClient({ initialItems }: POSClientProps) {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [products, setProducts] = useState<POSInventoryItem[]>(initialItems)
  const [searchLoading, setSearchLoading] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const results = await searchPOSInventory(search)
        setProducts(results)
      } catch {
        // silently ignore
      } finally {
        setSearchLoading(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const addToCart = useCallback((item: POSInventoryItem) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) {
        if (existing.cartQty >= item.quantity) return prev
        return prev.map((c) => (c.id === item.id ? { ...c, cartQty: c.cartQty + 1 } : c))
      }
      if (item.quantity < 1) return prev
      return [...prev, { ...item, cartQty: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((id: number) => {
    setCartItems((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const updateCartQty = useCallback((id: number, qty: number) => {
    setCartItems((prev) => {
      if (qty <= 0) return prev.filter((c) => c.id !== id)
      return prev.map((c) => {
        if (c.id !== id) return c
        const capped = Math.min(qty, c.quantity)
        return { ...c, cartQty: capped }
      })
    })
  }, [])

  const clearCart = useCallback(() => setCartItems([]), [])

  const subtotal = cartItems.reduce((sum, c) => sum + c.price * c.cartQty, 0)
  const totalQty = cartItems.reduce((sum, c) => sum + c.cartQty, 0)

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <POSHeader cartCount={totalQty} onExit={() => setExitOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <POSSearchPanel
          products={products}
          search={search}
          onSearchChange={setSearch}
          onAddToCart={addToCart}
          cartItems={cartItems}
          loading={searchLoading}
        />
        <POSCartPanel
          cartItems={cartItems}
          onUpdateQty={updateCartQty}
          onRemove={removeFromCart}
          onClearAll={clearCart}
          onCheckout={() => setCheckoutOpen(true)}
          subtotal={subtotal}
        />
      </div>

      {checkoutOpen && (
        <POSCheckoutModal
          cartItems={cartItems}
          subtotal={subtotal}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            clearCart()
            setCheckoutOpen(false)
          }}
        />
      )}

      {exitOpen && (
        <POSExitModal
          onClose={() => setExitOpen(false)}
          onVerified={() => {
            setExitOpen(false)
            router.push("/admin/inventory")
          }}
        />
      )}
    </div>
  )
}
