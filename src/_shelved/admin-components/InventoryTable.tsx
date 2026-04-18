"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { InventoryItemDTO } from "@/lib/dtos"
import { StatusBadge } from "./StatusBadge"
import {
  MoreVertical,
  Pencil,
  Image as ImageIcon,
  Check,
  Loader2,
  X,
  History,
  QrCode,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { updateQuickStock } from "@/app/actions/inventory"

interface InventoryTableProps {
  data: InventoryItemDTO[]
  onViewHistory: (cardName: string) => void
  onGenerateQR: (cardName: string) => void
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
  onToggleAll: (checked: boolean) => void
  onRangeSelect: (fromIndex: number, toIndex: number) => void
}

export function InventoryTable({
  data,
  onViewHistory,
  onGenerateQR,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onRangeSelect,
}: InventoryTableProps) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const perms = session?.user?.permissions
  const canEditQty = isAdmin || (perms?.inventoryUpdateQty ?? false)
  const canEditPrice = isAdmin || (perms?.inventoryUpdatePrices ?? false)
  const canEdit = canEditQty || canEditPrice

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)
  const lastClickedIndexRef = useRef<number | null>(null)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScroll(el.scrollWidth > el.clientWidth)
  }, [])

  useEffect(() => {
    checkScroll()
    window.addEventListener("resize", checkScroll)
    return () => window.removeEventListener("resize", checkScroll)
  }, [checkScroll])

  const allChecked = data.length > 0 && data.every((item) => selectedIds.has(item.id))
  const someChecked = data.some((item) => selectedIds.has(item.id))

  const handleRowCheckClick = (index: number, shiftKey: boolean) => {
    if (shiftKey && lastClickedIndexRef.current !== null) {
      const from = Math.min(lastClickedIndexRef.current, index)
      const to = Math.max(lastClickedIndexRef.current, index)
      onRangeSelect(from, to)
    } else {
      onToggleSelect(data[index].id)
    }
    lastClickedIndexRef.current = index
  }

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden relative">
      <div ref={scrollRef} className="overflow-x-auto" onScroll={checkScroll}>
        <table className="table-fixed text-sm text-left min-w-[700px] w-auto">
          <thead className="sticky top-0 z-10 bg-muted/50 border-b border-border">
            <tr>
              <th className="px-5 py-3 w-10">
                <Checkbox
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={(v) => onToggleAll(!!v)}
                  aria-label="Select all items"
                />
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[150px] sticky left-0 z-[5] bg-muted/50">
                Card
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[200px] hidden lg:table-cell">
                Set
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[140px] hidden md:table-cell">
                Condition
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[80px] text-right">
                Qty
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[90px] text-right">
                Price
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[60px] text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted-foreground text-sm">
                  No items found.
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <TableRow
                  key={item.id}
                  item={item}
                  index={index}
                  isSelected={selectedIds.has(item.id)}
                  onCheckClick={handleRowCheckClick}
                  canEditQty={canEditQty}
                  canEditPrice={canEditPrice}
                  canEdit={canEdit}
                  onViewHistory={onViewHistory}
                  onGenerateQR={onGenerateQR}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Right-edge fade indicator */}
      {canScroll && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-background" />
      )}
    </div>
  )
}

function TableRow({
  item,
  index,
  isSelected,
  onCheckClick,
  canEditQty,
  canEditPrice,
  canEdit,
  onViewHistory,
  onGenerateQR,
}: {
  item: InventoryItemDTO
  index: number
  isSelected: boolean
  onCheckClick: (index: number, shiftKey: boolean) => void
  canEditQty: boolean
  canEditPrice: boolean
  canEdit: boolean
  onViewHistory: (cardName: string) => void
  onGenerateQR: (cardName: string) => void
}) {
  const [qty, setQty] = useState(item.quantity)
  const [price, setPrice] = useState(item.price)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleSave() {
    setLoading(true)
    await updateQuickStock(item.id, qty, price)
    setLoading(false)
    setIsEditing(false)
  }

  function handleCancel() {
    setQty(item.quantity)
    setPrice(item.price)
    setIsEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <>
      <tr
        className={`hover:bg-muted/30 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}
        onClick={() => {
          // Only expand on small screens where columns are hidden
          if (window.innerWidth < 1024) setExpanded((prev) => !prev)
        }}
      >
        <td className="px-5 py-3">
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onCheckClick(index, false)}
              onClick={(e) => {
                if (e.shiftKey) {
                  e.preventDefault()
                  onCheckClick(index, true)
                }
              }}
              aria-label={`Select ${item.cardName}`}
            />
          </div>
        </td>

        {/* Card Name — sticky first column */}
        <td
          className={`px-5 py-3 sticky left-0 z-[5] transition-colors border-r border-border ${isSelected ? "bg-primary/5" : "bg-card"} group-hover:bg-muted/30`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-14 bg-muted rounded border border-border relative overflow-hidden shrink-0 flex items-center justify-center">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.cardName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/30" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate" title={item.cardName}>
                {item.cardName}
              </div>
              <div className="text-xs text-muted-foreground truncate">#{item.collectorNumber}</div>
            </div>
            {/* Mobile expand indicator */}
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground/40 shrink-0 lg:hidden transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </td>

        {/* Set — hidden below 1024px */}
        <td className="px-5 py-3 hidden lg:table-cell max-w-0">
          <div className="text-sm text-foreground/80 truncate" title={item.setName}>
            {item.setName}
          </div>
        </td>

        {/* Condition — hidden below 768px */}
        <td className="px-5 py-3 hidden md:table-cell">
          <div className="max-w-[140px] overflow-hidden">
            <StatusBadge status={item.condition} type="condition" />
            {item.finish !== "nonfoil" && (
              <div className="mt-1">
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {item.finish}
                </span>
              </div>
            )}
          </div>
        </td>

        {/* Qty */}
        <td className="px-5 py-3 text-right">
          {isEditing && canEditQty ? (
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-16 h-8 text-right text-sm border border-border rounded-md px-2 bg-muted/40 focus:border-primary/50 focus:outline-none focus:bg-card focus-visible:ring-2 focus-visible:ring-ring transition-colors tabular-nums"
            />
          ) : (
            <span
              className={`text-sm font-medium tabular-nums ${item.quantity === 0 ? "text-destructive" : "text-foreground"}`}
            >
              {item.quantity}
            </span>
          )}
        </td>

        {/* Price */}
        <td className="px-5 py-3 text-right">
          {isEditing && canEditPrice ? (
            <input
              type="number"
              step="0.01"
              value={(price / 100).toFixed(2)}
              onChange={(e) => setPrice(Math.round(Number(e.target.value) * 100))}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-20 h-8 text-right text-sm border border-border rounded-md px-2 bg-muted/40 focus:border-primary/50 focus:outline-none focus:bg-card focus-visible:ring-2 focus-visible:ring-ring transition-colors tabular-nums"
            />
          ) : (
            <span className="text-sm text-foreground/80 tabular-nums">
              ${(item.price / 100).toFixed(2)}
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="px-5 py-3 text-right">
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={loading}
                  className="h-8 w-8 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  onClick={handleSave}
                  disabled={loading}
                  className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Row actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {canEdit && (
                      <DropdownMenuItem
                        onClick={() => setIsEditing(true)}
                        className="gap-2 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Quick Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onViewHistory(item.cardName)}
                      className="gap-2 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" /> View History
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onGenerateQR(item.cardName)}
                      className="gap-2 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Generate QR Codes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Expandable detail row for mobile — shows hidden columns */}
      {expanded && (
        <tr className="lg:hidden bg-muted/10">
          <td colSpan={7} className="px-5 py-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Set
                </span>
                <span className="text-foreground/80">{item.setName}</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Condition
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={item.condition} type="condition" />
                  {item.finish !== "nonfoil" && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {item.finish}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
