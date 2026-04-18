"use client"

import { useState } from "react"
import { addInventoryItemAction } from "@/app/actions/inventory"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { AdminModal } from "@/components/admin/AdminModal"

export function AddStockBtn({ cardId, cardName }: { cardId: string; cardName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(0)
  const [condition, setCondition] = useState("NM")
  const [finish, setFinish] = useState("nonfoil")

  function handleClose() {
    if (loading) return
    setIsOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await addInventoryItemAction({
      cardId,
      condition,
      finish,
      quantity: Number(qty),
      price: Math.round(Number(price) * 100),
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
        <Plus className="w-3 h-3" /> Stock
      </button>

      <AdminModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Add to Inventory"
        subtitle={cardName}
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
                Finish
              </label>
              <select
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                className="w-full h-8 px-2 text-sm bg-muted/40 border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="nonfoil">Non-Foil</option>
                <option value="foil">Foil</option>
                <option value="etched">Etched</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-label font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Price ($)
              </label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full h-8 pl-5 pr-2 text-sm bg-muted/40 border border-border rounded-md text-foreground font-mono focus:outline-none focus:border-primary/50 transition-colors text-right"
                />
              </div>
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
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  )
}
