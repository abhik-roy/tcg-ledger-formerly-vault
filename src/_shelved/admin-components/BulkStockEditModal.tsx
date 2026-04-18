"use client"

import { useState } from "react"
import { InventoryItemDTO } from "@/lib/dtos"
import { bulkUpdateStockAction } from "@/app/actions/inventory"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

type StockMode = "set" | "adjust"

interface BulkStockEditModalProps {
  open: boolean
  onClose: () => void
  selectedIds: number[]
  selectedItems: InventoryItemDTO[]
  onSuccess: () => void
}

const PREVIEW_LIMIT = 10

export function BulkStockEditModal({
  open,
  onClose,
  selectedIds,
  selectedItems,
  onSuccess,
}: BulkStockEditModalProps) {
  const [mode, setMode] = useState<StockMode>("set")
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)

  const numericValue = parseInt(value, 10)
  const isValid = value !== "" && !isNaN(numericValue)

  function computeNewQty(currentQty: number): number {
    if (!isValid) return currentQty
    if (mode === "set") return Math.max(0, numericValue)
    return Math.max(0, currentQty + numericValue)
  }

  const previewItems = selectedItems.slice(0, PREVIEW_LIMIT)
  const overflowCount = selectedItems.length - PREVIEW_LIMIT

  async function handleApply() {
    if (!isValid) return
    setLoading(true)
    try {
      const result = await bulkUpdateStockAction(selectedIds, mode, numericValue)
      if (result.success) {
        toast.success(`Updated stock for ${result.updated} item${result.updated === 1 ? "" : "s"}`)
        onSuccess()
        handleClose()
      } else {
        toast.error(result.error || "Failed to update stock")
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setValue("")
    setMode("set")
    onClose()
  }

  const modes: { value: StockMode; label: string }[] = [
    { value: "set", label: "Set to" },
    { value: "adjust", label: "Adjust by" },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Stock</DialogTitle>
          <DialogDescription>
            Update quantity for {selectedIds.length} selected item
            {selectedIds.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        {/* Mode selector */}
        <div className="bg-muted/40 border border-border rounded-md p-0.5 flex">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`flex-1 h-7 px-2.5 rounded text-xs font-medium transition-colors ${
                mode === m.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            {mode === "set" ? "New quantity" : "Adjustment"}
          </label>
          <input
            type="number"
            step="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === "set" ? "0" : "+/- 0"}
            className="w-full h-9 px-3 bg-muted/40 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors tabular-nums"
          />
          {mode === "adjust" && (
            <p className="text-xs text-muted-foreground mt-1">
              Use negative values to decrease stock. Quantities will not go below 0.
            </p>
          )}
        </div>

        {/* Preview table */}
        {isValid && (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Card
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Current
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    New
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {previewItems.map((item) => {
                  const newQty = computeNewQty(item.quantity)
                  const diff = newQty - item.quantity
                  return (
                    <tr key={item.id}>
                      <td
                        className="px-3 py-2 text-foreground truncate max-w-[200px]"
                        title={item.cardName}
                      >
                        {item.cardName}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span
                          className={
                            diff > 0
                              ? "text-success"
                              : diff < 0
                                ? "text-destructive"
                                : "text-foreground"
                          }
                        >
                          {newQty}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {overflowCount > 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t border-border">
                +{overflowCount} more item{overflowCount === 1 ? "" : "s"}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={loading || !isValid}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply to {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
