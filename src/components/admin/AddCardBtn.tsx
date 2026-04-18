"use client"

import { useState } from "react"
import { createHolding } from "@/app/actions/holding"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { AdminModal } from "@/components/admin/AdminModal"
import type { CardDTO } from "@/lib/dtos"

export function AddCardBtn({ card }: { card: CardDTO }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [qty, setQty] = useState(1)
  const [condition, setCondition] = useState("NM")

  function handleClose() {
    if (loading) return
    setIsOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await createHolding({
      cardId: card.id,
      quantity: Number(qty),
      condition,
    })
    setLoading(false)
    setIsOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        className="flex items-center gap-1 px-2.5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md transition-colors"
      >
        <Plus className="w-3 h-3" /> Add
      </button>

      <AdminModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Add to Collection"
        subtitle={card.name}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full h-8 px-2 text-sm bg-muted/40 border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="NM">Near Mint</option>
                <option value="LP">Light Play</option>
                <option value="MP">Mod Play</option>
                <option value="HP">Heavy Play</option>
                <option value="DMG">Damaged</option>
              </select>
            </div>
            <div>
              <label className="block text-label font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full h-8 px-2 text-sm bg-muted/40 border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 transition-colors text-center"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-8 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-8 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {loading ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  )
}
