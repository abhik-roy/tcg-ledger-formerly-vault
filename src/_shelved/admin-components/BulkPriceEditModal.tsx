"use client"

import { useState } from "react"
import { InventoryItemDTO } from "@/lib/dtos"
import { bulkUpdatePriceAction } from "@/app/actions/inventory"
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

type PriceMode = "set" | "adjust_fixed" | "adjust_pct"

interface BulkPriceEditModalProps {
  open: boolean
  onClose: () => void
  selectedIds: number[]
  selectedItems: InventoryItemDTO[]
  onSuccess: () => void
}

const PREVIEW_LIMIT = 10

export function BulkPriceEditModal({
  open,
  onClose,
  selectedIds,
  selectedItems,
  onSuccess,
}: BulkPriceEditModalProps) {
  const [mode, setMode] = useState<PriceMode>("set")
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)

  const numericValue = parseFloat(value) || 0

  function computeNewPrice(currentCents: number): number {
    switch (mode) {
      case "set":
        return Math.round(numericValue * 100)
      case "adjust_fixed":
        return Math.max(0, currentCents + Math.round(numericValue * 100))
      case "adjust_pct":
        return Math.max(0, Math.round(currentCents * (1 + numericValue / 100)))
    }
  }

  function getActionValue(): number {
    switch (mode) {
      case "set":
        return Math.round(numericValue * 100)
      case "adjust_fixed":
        return Math.round(numericValue * 100)
      case "adjust_pct":
        // Send basis points: 10% = 1000
        return Math.round(numericValue * 100)
    }
  }

  const previewItems = selectedItems.slice(0, PREVIEW_LIMIT)
  const overflowCount = selectedItems.length - PREVIEW_LIMIT

  async function handleApply() {
    setLoading(true)
    try {
      const result = await bulkUpdatePriceAction(selectedIds, mode, getActionValue())
      if (result.success) {
        toast.success(`Updated prices for ${result.updated} item${result.updated === 1 ? "" : "s"}`)
        onSuccess()
        handleClose()
      } else {
        toast.error(result.error || "Failed to update prices")
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

  const modes: { value: PriceMode; label: string }[] = [
    { value: "set", label: "Set to" },
    { value: "adjust_fixed", label: "Adjust by $" },
    { value: "adjust_pct", label: "Adjust by %" },
  ]

  const inputLabel =
    mode === "set" ? "New price ($)" : mode === "adjust_fixed" ? "Amount ($)" : "Percentage (%)"

  const inputPlaceholder = mode === "set" ? "0.00" : mode === "adjust_fixed" ? "+/- 0.00" : "+/- 10"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Price</DialogTitle>
          <DialogDescription>
            Update pricing for {selectedIds.length} selected item
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
            {inputLabel}
          </label>
          <input
            type="number"
            step={mode === "adjust_pct" ? "1" : "0.01"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={inputPlaceholder}
            className="w-full h-9 px-3 bg-muted/40 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors tabular-nums"
          />
          {mode === "adjust_fixed" && (
            <p className="text-xs text-muted-foreground mt-1">
              Use negative values to decrease prices.
            </p>
          )}
          {mode === "adjust_pct" && (
            <p className="text-xs text-muted-foreground mt-1">
              Use negative values to decrease prices (e.g. -10 for 10% off).
            </p>
          )}
        </div>

        {/* Preview table */}
        {value !== "" && numericValue !== 0 && (
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
                  const newPrice = computeNewPrice(item.price)
                  const diff = newPrice - item.price
                  return (
                    <tr key={item.id}>
                      <td
                        className="px-3 py-2 text-foreground truncate max-w-[200px]"
                        title={item.cardName}
                      >
                        {item.cardName}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                        ${(item.price / 100).toFixed(2)}
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
                          ${(newPrice / 100).toFixed(2)}
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
          <Button onClick={handleApply} disabled={loading || !value || numericValue === 0}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply to {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
