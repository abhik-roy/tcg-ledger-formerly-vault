"use client"

import { useState } from "react"
import { Package, User, Truck, Printer, XCircle, AlertTriangle, Loader2, Check } from "lucide-react"
import { AdminModal } from "@/components/admin/AdminModal"

export function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  onCancelOrder,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any
  isOpen: boolean
  onClose: () => void
  /** Optional: called when the user confirms cancellation. Receives the order id and optional reason. */
  onCancelOrder?: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [view, setView] = useState<"details" | "confirm-cancel">("details")
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  if (!isOpen || !order) return null

  function handleClose() {
    if (cancelling) return
    setView("details")
    setCancelReason("")
    setCancelError(null)
    setCancelSuccess(false)
    onClose()
  }

  async function handleCancel() {
    if (!onCancelOrder) return
    setCancelling(true)
    setCancelError(null)
    try {
      const result = await onCancelOrder(order.id, cancelReason.trim() || undefined)
      if (result.success) {
        setCancelSuccess(true)
        setTimeout(() => handleClose(), 1200)
      } else {
        setCancelError(result.error ?? "Failed to cancel order. Please try again.")
      }
    } catch {
      setCancelError("Something went wrong. Please check your connection and try again.")
    } finally {
      setCancelling(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Order Details"
      subtitle={`#${order.id.slice(-8).toUpperCase()}`}
    >
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ── Inline: Confirm Cancel ── */}
        {view === "confirm-cancel" &&
          (() => {
            const totalItems =
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              order.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0
            return (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">Cancel this order?</p>
                    <p className="text-xs text-muted-foreground">
                      Order{" "}
                      <span className="font-mono font-semibold">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>{" "}
                      &mdash; {order.customerEmail} &mdash; {totalItems} item
                      {totalItems !== 1 ? "s" : ""} &mdash; ${(order.totalAmount / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cancelling will restore {totalItems} reserved item
                      {totalItems !== 1 ? "s" : ""} to available inventory. This action cannot be
                      undone.
                    </p>
                    {order.stripeSessionId && (
                      <p className="text-xs text-muted-foreground">
                        Note: This will not automatically issue a Stripe refund. Process the refund
                        separately in your Stripe dashboard.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g., Customer request, duplicate order..."
                    maxLength={200}
                    disabled={cancelling}
                    className="w-full h-8 rounded-md border border-border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                </div>

                {cancelSuccess ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <Check className="h-4 w-4" />
                    Order cancelled successfully.
                  </div>
                ) : (
                  <>
                    {cancelError && <p className="text-xs text-destructive">{cancelError}</p>}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setView("details")
                          setCancelError(null)
                          setCancelReason("")
                        }}
                        disabled={cancelling}
                        className="h-8 px-4 text-sm font-medium border border-border hover:bg-muted/50 rounded-md text-foreground transition-colors disabled:opacity-50"
                      >
                        Keep Order
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="h-8 px-4 text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {cancelling ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" /> Cancelling...
                          </>
                        ) : (
                          "Confirm Cancellation"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })()}

        {/* Customer + Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-label font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Customer
              </p>
              <p className="text-sm font-medium text-foreground truncate">{order.customerEmail}</p>
              <span className="inline-block mt-1 text-caption font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground uppercase">
                {order.paymentMethod || "Pay in Store"}
              </span>
            </div>
          </div>

          <div className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
              {order.fulfillment === "PICKUP" ? (
                <Package className="w-4 h-4" />
              ) : (
                <Truck className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-label font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {order.fulfillment === "PICKUP" ? "In-Store Pickup" : "Shipping Address"}
              </p>
              {order.fulfillment === "PICKUP" ? (
                <p className="text-sm text-muted-foreground">No delivery needed</p>
              ) : (
                <div className="text-sm text-foreground/80 leading-snug">
                  <p>{order.addressLine1}</p>
                  {order.addressLine2 && <p>{order.addressLine2}</p>}
                  <p>
                    {order.city}, {order.state} {order.postalCode}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <p className="text-label font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Items ({order.items?.length || 0})
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-label font-bold text-muted-foreground uppercase tracking-wider">
                    Card
                  </th>
                  <th className="px-4 py-2.5 text-label font-bold text-muted-foreground uppercase tracking-wider">
                    Set
                  </th>
                  <th className="px-4 py-2.5 text-label font-bold text-muted-foreground uppercase tracking-wider text-center">
                    Qty
                  </th>
                  <th className="px-4 py-2.5 text-label font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {order.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{item.setName}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground font-medium">
                      ×{item.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground tabular-nums">
                      ${(item.price / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer: actions left, totals right */}
      <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-end justify-between gap-4 shrink-0">
        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {onCancelOrder && (order.status === "PENDING" || order.status === "PAID") && (
            <button
              onClick={() => setView(view === "confirm-cancel" ? "details" : "confirm-cancel")}
              className="h-8 px-3 text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/8 rounded-md transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Order
            </button>
          )}
          <button
            onClick={handlePrint}
            className="h-8 px-3 text-xs font-medium text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground rounded-md transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>

        {/* Totals */}
        <div className="w-52 space-y-1.5 shrink-0">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">${((order.subtotal || 0) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Shipping</span>
            <span className="tabular-nums">${((order.shippingCost || 0) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tax</span>
            <span className="tabular-nums">${((order.tax || 0) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
            <span>Total</span>
            <span className="tabular-nums">${((order.totalAmount || 0) / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </AdminModal>
  )
}
