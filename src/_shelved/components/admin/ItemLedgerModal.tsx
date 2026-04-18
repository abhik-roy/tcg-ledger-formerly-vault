"use client"

import { format } from "date-fns"
import { History } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { QuantityLogEntry } from "@/app/actions/customers"

interface ItemLedgerModalProps {
  cardName: string
  entries: QuantityLogEntry[]
  isOpen: boolean
  onClose: () => void
}

export function ItemLedgerModal({ cardName, entries, isOpen, onClose }: ItemLedgerModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <History className="w-4 h-4 text-primary" />
            Sale Ledger — {cardName}
          </DialogTitle>
        </DialogHeader>

        {entries.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <p className="text-sm font-medium">No matching ledger entry found.</p>
            <p className="text-xs mt-1 text-muted-foreground/60">
              The sale may have occurred outside the 5-minute match window.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-2 text-left text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-4 py-2 text-left text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {format(new Date(entry.time), "MMM d, yyyy · h:mm a")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-bold text-destructive tabular-nums">
                        {entry.amount} copies
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[160px]">
                      {entry.user}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="border border-border hover:bg-muted/50 h-8 px-4 rounded-md text-xs text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
