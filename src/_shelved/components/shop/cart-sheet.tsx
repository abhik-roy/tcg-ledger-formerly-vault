"use client"

import { ShoppingBag, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CartItemRow } from "@/components/shop/CartItemRow"

export function CartSheet() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    cartTotal,
    cartCount,
    isOpen,
    closeCart,
    openCart,
  } = useCart()

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openCart() : closeCart())}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingBag className="h-5 w-5 text-foreground/80" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md flex flex-col p-6 h-full bg-card">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">My Collection ({cartCount})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <p className="text-muted-foreground font-medium">Your cart is empty</p>
            <SheetClose asChild>
              <Button variant="outline">Continue Browsing</Button>
            </SheetClose>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mr-4 pr-4">
              <div className="space-y-6">
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    variant="compact"
                    onQuantityChange={(id, delta) => updateQuantity(id, delta)}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>
            </ScrollArea>

            <div className="pt-6 space-y-4 mt-auto">
              <Separator />
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">${(cartTotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-muted-foreground">Calculated at checkout</span>
                </div>
              </div>
              <SheetClose asChild>
                <Link href="/shop/checkout" className="w-full flex">
                  <Button className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90">
                    Checkout <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </SheetClose>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
