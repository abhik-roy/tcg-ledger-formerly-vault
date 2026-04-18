"use client"

import { useEffect, useState, Suspense, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCart } from "@/context/cart-context"
import { Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createOrderFromSession } from "@/app/actions/stripe"
import OrderSuccessView from "@/components/shop/OrderSuccessView"
import type { OrderConfirmationDTO } from "@/lib/types"

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const { clearCart } = useCart()
  const { status: authStatus } = useSession()

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [order, setOrder] = useState<OrderConfirmationDTO | null>(null)
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    async function finalizeOrder() {
      if (!sessionId) {
        setStatus("success")
        return
      }

      const result = await createOrderFromSession(sessionId)

      if (result.success) {
        if ("order" in result && result.order) {
          setOrder(result.order)
        }
        setStatus("success")
        clearCart()
      } else {
        console.error(result.error)
        setStatus("error")
      }
    }

    finalizeOrder()
  }, [sessionId, clearCart])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center animate-pulse space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">
          Verifying payment & securing inventory...
        </p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card p-12 rounded-xl shadow-xl text-center max-w-lg w-full border border-destructive/20">
          <h1 className="text-2xl font-bold text-destructive mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">
            We received your payment, but couldn&apos;t update the order system automatically.
            Please contact support with your session ID.
          </p>
          <div className="bg-muted/40 rounded-lg p-4 mb-6 text-left border border-border">
            <p className="text-xs text-muted-foreground/60 uppercase font-bold tracking-wider mb-1">
              Session ID
            </p>
            <p className="text-sm font-mono text-muted-foreground break-all">{sessionId}</p>
          </div>
          <Button className="w-full py-4 font-bold" asChild>
            <Link href="/shop">
              Return to Shop
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // If we have the full order DTO, render the rich success view
  if (order) {
    return <OrderSuccessView order={order} isLoggedIn={authStatus === "authenticated"} />
  }

  // Fallback for edge cases where order DTO is not available
  // (e.g., navigating to /success without a session_id)
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="bg-card p-12 rounded-xl shadow-sm text-center max-w-lg w-full border border-border animate-in zoom-in duration-300">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6 text-success">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for your purchase. A confirmation email has been sent.
        </p>
        <Button className="w-full h-12 font-bold text-sm" asChild>
          <Link href="/shop">
            Continue Shopping
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
