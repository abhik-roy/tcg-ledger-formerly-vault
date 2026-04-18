"use client"

import { DollarSign, Package, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkPrice: () => void
  onBulkStock: () => void
  onBulkDelete: () => void
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkPrice,
  onBulkStock,
  onBulkDelete,
}: BulkActionBarProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] z-50 flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl shadow-xl transition-all duration-200 ${
        selectedCount > 0
          ? "translate-y-0 opacity-100"
          : "translate-y-[200%] opacity-0 pointer-events-none"
      }`}
    >
      <span className="text-sm font-medium text-foreground tabular-nums whitespace-nowrap">
        {selectedCount} selected
      </span>

      <div className="h-5 w-px bg-border" />

      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={onBulkPrice} className="gap-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          Edit Price
        </Button>
        <Button size="sm" variant="outline" onClick={onBulkStock} className="gap-1.5">
          <Package className="w-3.5 h-3.5" />
          Edit Stock
        </Button>
        <Button size="sm" variant="destructive" onClick={onBulkDelete} className="gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </div>

      <div className="h-5 w-px bg-border" />

      <button
        onClick={onClearSelection}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
