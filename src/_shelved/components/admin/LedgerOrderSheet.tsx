"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { Receipt, Package, CreditCard, Banknote, ArrowRight, User2 } from "lucide-react"
import { format } from "date-fns"
import { getOrderForLedgerEntry, type LedgerOrderDetail } from "@/app/actions/inventory"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface LedgerOrderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardName: string
  logTime: Date | string
  userSource: string
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning border-warning/20",
  PAID: "bg-info/10 text-info border-info/20",
  COMPLETED: "bg-success/10 text-success dark:text-success border-success/20",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
}

const FULFILLMENT_LABEL: Record<string, string> = {
  PICKUP: "In-store pickup",
  SHIPPING: "Shipped",
}

export function LedgerOrderSheet({
  open,
  onOpenChange,
  cardName,
  logTime,
  userSource,
}: LedgerOrderSheetProps) {
  const [order, setOrder] = useState<LedgerOrderDetail | null | "not-found">(null)
  const [isPending, startTransition] = useTransition()
  const [prevOpen, setPrevOpen] = useState(false)

  // Reset order state when sheet closes (derive from prop change, not effect)
  if (prevOpen && !open) {
    setPrevOpen(false)
    setOrder(null)
  }
  if (!prevOpen && open) {
    setPrevOpen(true)
  }

  useEffect(() => {
    if (!open) return
    startTransition(async () => {
      const result = await getOrderForLedgerEntry(cardName, logTime, userSource)
      setOrder(result ?? "not-found")
    })
  }, [open, cardName, logTime, userSource])

  const isLoading = isPending || order === null
  const isWalkIn = order && order !== "not-found" && order.customerEmail === "walkin@pos.local"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0 flex flex-row items-center gap-2.5 space-y-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Receipt className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="text-sm">Order Detail</SheetTitle>
            <p className="text-label text-muted-foreground leading-tight truncate max-w-[280px]">
              {cardName}
            </p>
          </div>
        </SheetHeader>

        {/* Body */}
        <ScrollArea className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs">Looking up order...</p>
            </div>
          ) : order === "not-found" ? (
            <div className="py-14 px-6 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-1">
                <Package className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">No order found</p>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                This stock change may have occurred outside the 5-minute lookup window, or was
                manually adjusted.
              </p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Order meta */}
              <div className="bg-muted/30 border border-border rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-caption text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                      Order
                    </p>
                    <p className="text-xs font-mono text-foreground font-semibold">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <span
                    className={`text-caption font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[order.status] ?? "bg-muted/50 text-muted-foreground border-border"}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-caption text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                      Customer
                    </p>
                    {isWalkIn ? (
                      <p className="text-xs text-muted-foreground">Walk-in (POS)</p>
                    ) : (
                      <Link
                        href={`/admin/customers?q=${encodeURIComponent(order.customerEmail)}`}
                        className="text-xs text-primary hover:underline"
                        title={order.customerEmail}
                      >
                        {order.customerEmail}
                      </Link>
                    )}
                  </div>
                  <div>
                    <p className="text-caption text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                      Date
                    </p>
                    <p className="text-xs text-foreground">
                      {format(new Date(order.createdAt), "MMM d, yyyy \u00B7 h:mm a")}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                      Payment
                    </p>
                    <div className="flex items-center gap-1">
                      {order.paymentMethod === "CASH" ? (
                        <Banknote className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <CreditCard className="w-3 h-3 text-muted-foreground" />
                      )}
                      <p className="text-xs text-foreground">{order.paymentMethod}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-caption text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                      Fulfillment
                    </p>
                    <p className="text-xs text-foreground">
                      {FULFILLMENT_LABEL[order.fulfillment] ?? order.fulfillment}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                  Items ({order.items.length})
                </p>
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                  {order.items.map((item) => (
                    <div key={item.id} className="px-3.5 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-caption text-muted-foreground">
                          {item.setName} &middot; {item.condition}
                          {item.finish !== "nonfoil" && (
                            <span className="ml-1 text-primary font-medium capitalize">
                              {item.finish}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-foreground tabular-nums">
                          ${((item.price * item.quantity) / 100).toFixed(2)}
                        </p>
                        <p className="text-caption text-muted-foreground">
                          {item.quantity} &times; ${(item.price / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-muted-foreground">Order total</span>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  ${(order.totalAmount / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {order && order !== "not-found" && (
          <SheetFooter className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between flex-row">
            {isWalkIn ? (
              <span />
            ) : (
              <Link
                href={`/admin/customers?q=${encodeURIComponent(order.customerEmail)}`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <User2 className="w-3 h-3" /> View Customer
              </Link>
            )}
            <Link
              href={`/admin/orders?q=${order.id.slice(0, 8)}`}
              className="inline-flex items-center gap-1 border border-border rounded-md px-3 h-8 text-xs text-foreground hover:bg-muted/50 transition-colors"
            >
              Go to Full Order <ArrowRight className="w-3 h-3" />
            </Link>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
