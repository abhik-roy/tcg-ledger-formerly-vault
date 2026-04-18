"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { ArrowRight, ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CartItemRow } from "@/components/shop/CartItemRow"
import { formatPrice } from "@/lib/format"

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, cartTotal } = useCart()

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Your cart is empty</h2>
        <p className="text-muted-foreground">Looks like you haven&apos;t added any cards yet.</p>
        <Link href="/">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continue Shopping
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen bg-background pb-24 sm:pb-0">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                <CartItemRow
                  item={item}
                  variant="expanded"
                  onQuantityChange={updateQuantity}
                  onRemove={removeFromCart}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* RIGHT: Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-bold text-xl">Order Summary</h3>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Estimate</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Estimate</span>
                  <span>$0.00</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Order Total</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
              </div>

              <Link href="/shop/checkout" className="block w-full">
                <Button className="w-full h-12 text-lg bg-primary hover:bg-primary/90">
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border sm:hidden z-40">
        <Button className="w-full" asChild>
          <Link href="/shop/checkout">Checkout · {formatPrice(cartTotal)}</Link>
        </Button>
      </div>
    </div>
  )
}
