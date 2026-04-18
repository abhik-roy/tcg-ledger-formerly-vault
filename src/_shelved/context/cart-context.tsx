"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

// 1. The Clean Interface (Our Target)
export interface CartItem {
  id: number
  cartQuantity: number
  name: string
  setName: string
  price: number
  rarity?: string
  image: string | null
  condition: string
  finish: string
  originalQuantity: number
}

interface CartContextType {
  items: CartItem[]
  isHydrated: boolean
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addToCart: (product: any) => void
  removeFromCart: (id: number) => void
  updateQuantity: (id: number, delta: number) => void
  clearCart: () => void
  cartTotal: number
  cartCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // 2. HYDRATION + MIGRATION LOGIC
  useEffect(() => {
    const saved = localStorage.getItem("tcg-cart")
    if (saved) {
      try {
        const rawItems = JSON.parse(saved)

        // This maps "Old" data to "New" data on the fly
        const cleanItems = rawItems.map((item: any) => ({
          id: item.id,
          cartQuantity: item.cartQuantity || 1,

          // Fallback chain: New Name -> Old Name -> Default
          name: item.name || item.cardName || "Unknown Card",
          setName: item.setName || item.setname || "Unknown Set",
          price: item.price ?? item.storeprice ?? 0,
          image: item.image || item.imagenormal || item.imageNormal || null,
          condition: item.condition || "NM",
          finish: item.finish || "Non-foil",
          originalQuantity: item.originalQuantity || 99,
        }))

        setItems(cleanItems)
      } catch (e) {
        console.error("Failed to parse cart", e)
        // If data is corrupt, reset it to prevent infinite errors
        localStorage.removeItem("tcg-cart")
      }
    }
    setIsHydrated(true)
  }, [])

  // 3. PERSISTENCE LOGIC
  useEffect(() => {
    // Only save if we have successfully hydrated (prevents wiping data on load)
    if (isHydrated) {
      localStorage.setItem("tcg-cart", JSON.stringify(items))
    }
  }, [items, isHydrated])

  // 4. ADD TO CART (Normalization)
  const addToCart = (product: any) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, cartQuantity: Math.min(item.cartQuantity + 1, item.originalQuantity) }
            : item
        )
      }

      const newItem: CartItem = {
        id: product.id,
        cartQuantity: 1,
        name: product.name || product.cardName || "Unknown",
        setName: product.setName || product.setname || "Unknown Set",
        price: product.price ?? product.storeprice ?? 0,
        image: product.image || product.imagenormal || product.imageNormal || null,
        condition: product.condition || "NM",
        finish: product.finish || "Non-foil",
        originalQuantity: product.quantity || 99,
      }

      return [...prev, newItem]
    })
    setIsOpen(true) // Always open cart on add (both new items and quantity increments)
  }

  const removeFromCart = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: number, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.cartQuantity + delta
          return {
            ...item,
            cartQuantity: Math.max(1, Math.min(newQty, item.originalQuantity)),
          }
        }
        return item
      })
    )
  }

  const clearCart = () => setItems([])

  const cartTotal = items.reduce((sum, item) => sum + item.price * item.cartQuantity, 0)
  const cartCount = items.reduce((sum, item) => sum + item.cartQuantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        isHydrated,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within a CartProvider")
  return context
}
