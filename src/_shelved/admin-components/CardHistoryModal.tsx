"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LedgerTable } from "@/components/admin/LedgerTable"
import { LedgerEntry } from "@/app/actions/inventory"
import { Loader2, History } from "lucide-react"

interface CardHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  cardName: string
  data: LedgerEntry[]
  loading: boolean
  hasMore?: boolean
}

export function CardHistoryModal({
  isOpen,
  onClose,
  cardName,
  data,
  loading,
  hasMore,
}: CardHistoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border bg-muted/30 shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
              <History className="w-4 h-4" />
            </div>
            Activity History: <span className="text-primary truncate">{cardName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Fetching records...</p>
            </div>
          ) : (
            <>
              <LedgerTable data={data} />
              {hasMore && (
                <div className="px-5 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground text-center shrink-0">
                  Showing first 500 entries (last 90 days). Use the full ledger page for older
                  records.
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
