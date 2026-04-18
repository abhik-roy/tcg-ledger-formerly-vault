"use client"

import { useState } from "react"
import { Loader2, PackageCheck, Truck, Package, Check } from "lucide-react"
import { fulfillOrderAction } from "@/app/actions/order"
import { AdminModal } from "@/components/admin/AdminModal"

interface FulfillModalProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function FulfillOrderModal({ order, isOpen, onClose, onSuccess }: FulfillModalProps) {
  const [tracking, setTracking] = useState("")
  const [carrier, setCarrier] = useState("USPS")
  const [loading, setLoading] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  if (!isOpen || !order) return null

  const isPickup = order.fulfillment === "PICKUP"

  function handleClose() {
    if (loading) return
    setTracking("")
    setCarrier("USPS")
    setSucceeded(false)
    onClose()
  }

  async function handleSubmit() {
    setLoading(true)
    await fulfillOrderAction(order.id, tracking, carrier)
    setLoading(false)
    setSucceeded(true)
    // Show success state briefly, then close
    setTimeout(() => {
      onSuccess()
      handleClose()
    }, 1100)
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Fulfill Order"
      subtitle={`#${order.id.slice(-6).toUpperCase()}`}
      icon={<PackageCheck className="w-4 h-4" />}
      maxWidth="max-w-md"
    >
      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Success state */}
        {succeeded && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center animate-in zoom-in-50 duration-300">
              <Check className="w-6 h-6 text-success" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {isPickup ? "Marked as Picked Up" : "Order Fulfilled"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Closing…</p>
            </div>
          </div>
        )}

        {/* Form — hidden during success */}
        {!succeeded && (
          <>
            {isPickup ? (
              <div className="flex items-start gap-3 p-3 bg-warning/8 border border-warning/20 rounded-lg">
                <Package className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80">
                  This is a <span className="font-semibold">pickup order</span>. Confirming will
                  mark it as collected — no tracking number needed.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-label font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Carrier
                  </label>
                  <div className="flex gap-2">
                    {["USPS", "UPS", "FedEx"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setCarrier(c)}
                        className={`flex-1 h-8 text-xs font-medium rounded-md border transition-colors ${
                          carrier === c
                            ? "bg-primary/10 border-primary/25 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-label font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Tracking Number <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Truck className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
                    <input
                      type="text"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder="e.g. 9400 1000 0000 0000 0000 00"
                      className="w-full h-9 pl-8 pr-3 bg-muted/40 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Required for shipping orders</p>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {!succeeded && (
        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={handleClose}
            disabled={loading}
            className="h-8 px-4 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!isPickup && !tracking.trim())}
            className="h-8 px-4 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 min-w-[130px] justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Fulfilling…
              </>
            ) : isPickup ? (
              "Mark as Picked Up"
            ) : (
              "Complete Order"
            )}
          </button>
        </div>
      )}
    </AdminModal>
  )
}
