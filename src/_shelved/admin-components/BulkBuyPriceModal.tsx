"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BuylistItemDTO } from "@/lib/dtos"
import { bulkUpdateBuyPriceAction } from "@/app/actions/buylist"
import { toast } from "sonner"
import { DollarSign, X, Loader2, ArrowUpDown, Percent } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

type PriceMode = "set" | "adjust_fixed" | "adjust_pct"

interface BulkBuyPriceModalProps {
  open: boolean
  onClose: () => void
  selectedIds: number[]
  selectedItems: BuylistItemDTO[]
  onSuccess: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MODE_OPTIONS: { value: PriceMode; label: string; icon: React.ReactNode }[] = [
  {
    value: "set",
    label: "Set to exact price",
    icon: <DollarSign className="w-3.5 h-3.5" />,
  },
  {
    value: "adjust_fixed",
    label: "Adjust by fixed amount",
    icon: <ArrowUpDown className="w-3.5 h-3.5" />,
  },
  {
    value: "adjust_pct",
    label: "Adjust by percentage",
    icon: <Percent className="w-3.5 h-3.5" />,
  },
]

function computeNewPrice(currentCents: number, mode: PriceMode, rawValue: number): number {
  switch (mode) {
    case "set":
      return Math.max(0, Math.round(rawValue * 100))
    case "adjust_fixed":
      return Math.max(0, currentCents + Math.round(rawValue * 100))
    case "adjust_pct":
      return Math.max(0, Math.round(currentCents * (1 + rawValue / 100)))
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BulkBuyPriceModal({
  open,
  onClose,
  selectedIds,
  selectedItems,
  onSuccess,
}: BulkBuyPriceModalProps) {
  const [mode, setMode] = useState<PriceMode>("set")
  const [inputValue, setInputValue] = useState("")
  const [isPending, startTransition] = useTransition()

  if (!open) return null

  const rawValue = parseFloat(inputValue) || 0
  const hasValue = inputValue.trim() !== "" && !isNaN(parseFloat(inputValue))

  // For the server action, convert based on mode
  function getServerValue(): number {
    switch (mode) {
      case "set":
        return Math.round(rawValue * 100) // dollars -> cents
      case "adjust_fixed":
        return Math.round(rawValue * 100) // dollars -> cents
      case "adjust_pct":
        return rawValue // percentage stays as-is
    }
  }

  function handleSubmit() {
    if (!hasValue) return
    startTransition(async () => {
      const result = await bulkUpdateBuyPriceAction(selectedIds, mode, getServerValue())
      if (result.success) {
        toast.success(`Updated buy price for ${selectedIds.length} item(s)`)
        setInputValue("")
        setMode("set")
        onSuccess()
        onClose()
      } else {
        toast.error(result.error ?? "Failed to update prices")
      }
    })
  }

  function handleClose() {
    if (isPending) return
    setInputValue("")
    setMode("set")
    onClose()
  }

  // Show at most 5 items in preview
  const previewItems = selectedItems.slice(0, 5)
  const remaining = selectedItems.length - previewItems.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Edit Buy Price</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Mode selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mode
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setMode(opt.value)
                    setInputValue("")
                  }}
                  className={`flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-medium border transition-colors ${
                    mode === opt.value
                      ? "bg-primary/10 border-primary/25 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {opt.icon}
                  <span className="hidden sm:inline">
                    {opt.label.split(" ").slice(0, 2).join(" ")}
                  </span>
                  <span className="sm:hidden">
                    {opt.value === "set" ? "Set" : opt.value === "adjust_fixed" ? "Fixed" : "Pct"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Value input */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {mode === "set"
                ? "New Price"
                : mode === "adjust_fixed"
                  ? "Amount (+ or -)"
                  : "Percentage (+ or -)"}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-sm pointer-events-none">
                {mode === "adjust_pct" ? "%" : "$"}
              </span>
              <Input
                type="number"
                step={mode === "adjust_pct" ? "1" : "0.01"}
                placeholder={mode === "adjust_pct" ? "e.g. 10 or -15" : "0.00"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-7 pr-3 h-10 font-mono text-right text-sm focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
            </div>
          </div>

          {/* Preview table */}
          {hasValue && previewItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Preview
              </Label>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                        Card
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">
                        Current Buy
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">
                        New Buy
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewItems.map((item) => {
                      const newPrice = computeNewPrice(item.buyPrice, mode, rawValue)
                      const increased = newPrice > item.buyPrice
                      const decreased = newPrice < item.buyPrice
                      return (
                        <tr key={item.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 text-foreground truncate max-w-[180px]">
                            {item.cardName}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                            {formatCents(item.buyPrice)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-medium tabular-nums ${
                              increased
                                ? "text-success"
                                : decreased
                                  ? "text-destructive"
                                  : "text-foreground"
                            }`}
                          >
                            {formatCents(newPrice)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {remaining > 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t border-border text-center">
                    +{remaining} more item{remaining !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !hasValue}
            className="min-w-[120px]"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Updating...
              </>
            ) : (
              <>
                <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                Update {selectedIds.length} Item{selectedIds.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
