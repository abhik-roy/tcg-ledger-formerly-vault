"use client"

import Link from "next/link"
import { Layers } from "lucide-react"
import { CartSheet } from "@/components/shop/cart-sheet"
import UserMenu from "@/components/shop/UserMenu"

export function ShopHeader() {
  return (
    <header className="h-14 bg-card/95 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between shrink-0 z-40 sticky top-0 border-b border-border">
      <Link href="/shop" className="flex items-center gap-2.5 group">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-primary-foreground transition-transform group-hover:scale-105 shadow-sm shadow-primary/20">
          <Layers className="w-5 h-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground hidden sm:block">
          TCG Vault
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <UserMenu />
        <CartSheet />
      </div>
    </header>
  )
}
