"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Store,
  Truck,
  Mail,
  Clock,
  MapPin,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OrderConfirmationDTO } from "@/lib/types"

interface OrderSuccessViewProps {
  order: OrderConfirmationDTO
  isLoggedIn?: boolean
}

export default function OrderSuccessView({ order, isLoggedIn }: OrderSuccessViewProps) {
  const [copied, setCopied] = useState(false)

  const isPickup = order.fulfillment === "PICKUP"

  const handleCopyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available — silent fail
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-sm border border-border w-full max-w-2xl animate-in zoom-in duration-300">
        {/* Header */}
        <div className="text-center pt-10 pb-6 px-6">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-5 text-success">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Order Confirmed!</h1>
          <p className="text-sm text-muted-foreground">
            Thank you for your purchase. Your order has been received.
          </p>
        </div>

        {/* Order ID */}
        <div className="mx-6 mb-5">
          <div className="bg-muted/40 rounded-lg p-4 border border-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground/60 uppercase font-bold tracking-wider mb-1">
                Order Reference
              </p>
              <p className="text-sm font-mono text-foreground truncate">{order.id}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 w-9 h-9"
              onClick={handleCopyOrderId}
              aria-label="Copy order ID"
              title="Copy order ID"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Email Notice */}
        <div className="mx-6 mb-5">
          <div className="bg-info/5 border border-info/20 rounded-lg p-3.5 flex items-start gap-3">
            <Mail className="w-4 h-4 text-info mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-foreground font-medium">
                Confirmation email sent to{" "}
                <span className="font-semibold">{order.customerEmail}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Don&apos;t see it? Check your spam or junk folder.
              </p>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="mx-6 mb-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Items Ordered
          </h3>
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3.5 bg-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {item.setName}
                    {item.condition && (
                      <span className="ml-1.5 text-muted-foreground/60">· {item.condition}</span>
                    )}
                    {item.finish && item.finish !== "nonfoil" && (
                      <span className="ml-1.5 text-muted-foreground/60">· {item.finish}</span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">
                    ${((item.price * item.quantity) / 100).toFixed(2)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} x ${(item.price / 100).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="mx-6 mb-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-semibold text-foreground">
                ${(order.subtotal / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span
                className={`font-semibold ${order.shippingCost === 0 ? "text-success" : "text-foreground"}`}
              >
                {order.shippingCost === 0 ? "FREE" : `$${(order.shippingCost / 100).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="font-semibold text-foreground">${(order.tax / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-3 mt-3 border-t border-border">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  USD
                </span>
                <span className="text-2xl font-black text-foreground tracking-tight">
                  ${(order.totalAmount / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fulfillment Info */}
        <div className="mx-6 mb-6">
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            {isPickup ? (
              <div className="flex items-start gap-3">
                <Store className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">In-Store Pickup</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Ready in approximately 2 hours</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Pay at the counter when you pick up
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Truck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Standard Shipping</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Estimated delivery: 3-5 business days
                    </p>
                  </div>
                  {(order.addressLine1 || order.city) && (
                    <div className="flex items-start gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        {[order.addressLine1, order.city, order.postalCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="px-6 pb-8 flex flex-col gap-3">
          <Button className="w-full h-12 font-bold text-sm" asChild>
            <Link href="/shop">
              Continue Shopping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          {isLoggedIn && (
            <Button variant="outline" className="w-full h-12 font-semibold text-sm" asChild>
              <Link href="/shop/profile">
                <User className="w-4 h-4 mr-2" />
                View Order History
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
