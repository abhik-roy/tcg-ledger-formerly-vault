"use client"

import { useState } from "react"
import { Loader2, PackageCheck, Truck } from "lucide-react"
import { bulkFulfillAction } from "@/app/actions/order"
import { AdminModal } from "@/components/admin/AdminModal"
import { toast } from "sonner"

interface BulkFulfillModalProps {
  open: boolean
  onClose: () => void
  selectedIds: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedOrders: any[]
  onSuccess: () => void
}

export function BulkFulfillModal({
  open,
  onClose,
  selectedIds,
  selectedOrders,
  onSuccess,
}: BulkFulfillModalProps) {
  const [loading, setLoading] = useState(false)

  if (!open || selectedIds.length === 0) return null

  const hasShipping = selectedOrders.some((o) => o.fulfillment === "SHIPPING")
  const allPickup = selectedOrders.every((o) => o.fulfillment === "PICKUP")

  function handleClose() {
    if (loading) return
    onClose()
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      const result = await bulkFulfillAction(selectedIds)
      if (result.success) {
        const succeededCount = result.succeeded?.length ?? selectedIds.length
        toast.success(`Fulfilled ${succeededCount} orders`)
        if (result.failed && result.failed.length > 0) {
          toast.error(`Failed: ${result.failed.length} orders`)
        }
        onSuccess()
        onClose()
      } else {
        toast.error(result.error || "Failed to fulfill orders")
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminModal
      isOpen={open}
      onClose={handleClose}
      title="Bulk Fulfill Orders"
      subtitle={`${selectedIds.length} orders`}
      icon={<PackageCheck className="w-4 h-4" />}
      maxWidth="max-w-md"
    >
      {/* Body */}
      <div className="p-5 space-y-4">
        <p className="text-sm text-foreground/80">
          You are about to fulfill <span className="font-semibold">{selectedIds.length}</span>{" "}
          orders.
        </p>

        {/* Scrollable order list */}
        <div className="max-h-[240px] overflow-y-auto border border-border rounded-lg divide-y divide-border">
          {selectedOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-muted-foreground">
                  #{order.id.slice(-6).toUpperCase()}
                </span>
                <span className="text-foreground/70 truncate text-xs">{order.customerEmail}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {order.fulfillment === "SHIPPING" ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-label font-medium bg-info/10 text-info border border-info/30">
                    <Truck className="w-3 h-3" /> Ship
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-label font-medium bg-warning/10 text-warning border border-warning/30">
                    Pickup
                  </span>
                )}
                <span className="text-xs font-medium text-foreground tabular-nums">
                  ${(order.totalAmount / 100).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Contextual note */}
        {hasShipping && (
          <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2">
            Shipping orders will be marked fulfilled without tracking numbers.
          </p>
        )}
        {allPickup && (
          <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2">
            All orders are pickup and will be marked as collected.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
        <button
          onClick={handleClose}
          disabled={loading}
          className="h-8 px-4 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 rounded-md transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="h-8 px-4 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 min-w-[150px] justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Fulfilling...
            </>
          ) : (
            <>
              <PackageCheck className="w-3.5 h-3.5" />
              Fulfill {selectedIds.length} Orders
            </>
          )}
        </button>
      </div>
    </AdminModal>
  )
}
