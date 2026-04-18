"use client"

import { useState } from "react"
import { InventoryItemDTO } from "@/lib/dtos"
import { bulkDeleteItemsAction } from "@/app/actions/inventory"
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface BulkDeleteConfirmDialogProps {
  open: boolean
  onClose: () => void
  selectedIds: number[]
  selectedItems: InventoryItemDTO[]
  onSuccess: (result: { deleted: number; skipped: number }) => void
}

export function BulkDeleteConfirmDialog({
  open,
  onClose,
  selectedIds,
  selectedItems,
  onSuccess,
}: BulkDeleteConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)

  const isConfirmed = confirmText === "CONFIRM"

  async function handleDelete() {
    if (!isConfirmed) return
    setLoading(true)
    try {
      const result = await bulkDeleteItemsAction(selectedIds)
      if (result.success) {
        const deletedCount = result.deleted ?? 0
        const skippedCount = result.skipped?.length ?? 0
        if (skippedCount > 0) {
          toast.success(
            `Deleted ${deletedCount} item${deletedCount === 1 ? "" : "s"}. Skipped ${skippedCount} (order history).`
          )
        } else {
          toast.success(`Deleted ${deletedCount} item${deletedCount === 1 ? "" : "s"}.`)
        }
        onSuccess({ deleted: deletedCount, skipped: skippedCount })
        handleClose()
      } else {
        toast.error(result.error || "Failed to delete items")
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setConfirmText("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete Items
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning banner */}
          <div className="border border-destructive/30 bg-destructive/5 rounded-md p-3">
            <p className="text-sm text-foreground">
              You are about to delete <span className="font-semibold">{selectedIds.length}</span>{" "}
              inventory item{selectedIds.length === 1 ? "" : "s"}. This cannot be undone.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Items with order history cannot be deleted and will be skipped.
          </p>

          {/* Confirm input */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Type CONFIRM to proceed
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CONFIRM"
              className="w-full h-9 px-3 bg-muted/40 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-destructive/50 focus:bg-card transition-colors"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading || !isConfirmed}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
