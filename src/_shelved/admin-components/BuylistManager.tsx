"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { BuylistItemDTO, BuylistOverviewStats } from "@/lib/dtos"
import { FILTER_OPTIONS } from "@/lib/constants"
import { InventoryFilter } from "@/components/admin/InventoryFilter"
import { BulkBuyPriceModal } from "@/components/admin/BulkBuyPriceModal"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  PackageX,
  DollarSign,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { updateBuylistItem } from "@/app/actions/buylist"

// ── Types ──────────────────────────────────────────────────────────────────────

type BuyStatus = "BUYING" | "NEAR_LIMIT" | "AT_CAPACITY" | "NOT_SET"

interface LocalItem extends BuylistItemDTO {
  // buyPrice is kept in cents throughout; the UI divides/multiplies by 100
  _buyPriceDisplay: string // controlled string for the dollar input
  _dirty: boolean // true when user has changed values since last save
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "buying", label: "Buying" },
  { key: "near_limit", label: "Near Limit" },
  { key: "not_set", label: "Not Set" },
] as const

const DEBOUNCE_MS = 400

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBuyStatus(item: BuylistItemDTO): BuyStatus {
  const stock = item.currentStock
  const ideal = item.idealQuantity
  const max = item.maxQuantity

  if (ideal === 0) return "NOT_SET"
  if (max > 0 && stock >= max) return "AT_CAPACITY"
  if (max > 0 && stock >= Math.floor(max * 0.8)) return "NEAR_LIMIT"
  return "BUYING"
}

function getHighResImage(url?: string | null): string | null {
  if (!url) return null
  if (url.includes("scryfall.io")) {
    return url.replace("/small/", "/large/").replace("/normal/", "/large/")
  }
  return url
}

function toLocalItem(item: BuylistItemDTO): LocalItem {
  return {
    ...item,
    _buyPriceDisplay: item.buyPrice > 0 ? (item.buyPrice / 100).toFixed(2) : "",
    _dirty: false,
  }
}

function formatVelocity(v: number): string {
  if (v === 0) return "\u2014"
  if (v < 0.5) return "<0.5/wk"
  if (v < 10) return `${v.toFixed(1)}/wk`
  return `${Math.round(v)}/wk`
}

const STATUS_CONFIG: Record<
  BuyStatus,
  { label: string; bar: string; badge: string; text: string }
> = {
  BUYING: {
    label: "Buying",
    bar: "bg-success",
    badge:
      "bg-success/10 text-success border-success/30 dark:bg-success/10 dark:text-success dark:border-success/20",
    text: "text-success",
  },
  NEAR_LIMIT: {
    label: "Near Limit",
    bar: "bg-warning",
    badge:
      "bg-warning/10 text-warning border-warning/30 dark:bg-warning/10 dark:text-warning dark:border-warning/20",
    text: "text-warning",
  },
  AT_CAPACITY: {
    label: "At Capacity",
    bar: "bg-destructive",
    badge:
      "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/10 dark:text-destructive dark:border-destructive/20",
    text: "text-destructive",
  },
  NOT_SET: {
    label: "Not Set",
    bar: "bg-muted",
    badge: "bg-muted/50 text-muted-foreground border-border",
    text: "text-muted-foreground/70",
  },
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface BuylistManagerProps {
  initialData: BuylistItemDTO[]
  totalItems: number
  totalPages: number
  currentPage: number
  availableSets: { label: string; value: string }[]
  stats: BuylistOverviewStats
}

export function BuylistManager({
  initialData,
  totalItems,
  totalPages,
  currentPage,
  availableSets,
  stats,
}: BuylistManagerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const perms = session?.user?.permissions
  const canEditPrice = isAdmin || (perms?.buylistUpdatePrices ?? false)
  const canEditTargets = isAdmin || (perms?.buylistUpdateTargets ?? false)

  // Convert incoming DTOs to local items (with display string for buy price)
  const [items, setItems] = useState<LocalItem[]>(() => initialData.map(toLocalItem))
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false)

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(items.map((i) => i.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [items]
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Auto-clear selection on URL/searchParams change
  useEffect(() => {
    clearSelection()
  }, [searchParams, clearSelection])

  // Sync when server re-renders with new data (page nav, filter change)
  useEffect(() => {
    setItems(initialData.map(toLocalItem))
  }, [initialData])

  // ── URL helpers ────────────────────────────────────────────────────────────

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const p = new URLSearchParams(searchParams.toString())
      for (const [key, val] of Object.entries(updates)) {
        if (val) p.set(key, val)
        else p.delete(key)
      }
      p.set("page", "1")
      router.replace(`${pathname}?${p.toString()}`)
    },
    [searchParams, pathname, router]
  )

  // ── Debounced search ───────────────────────────────────────────────────────

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "")

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      pushParams({ q: value || undefined })
    }, DEBOUNCE_MS)
  }

  const handlePageChange = (newPage: number) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set("page", newPage.toString())
    router.push(`${pathname}?${p.toString()}`)
  }

  // ── Local state mutations ──────────────────────────────────────────────────

  const updateField = (id: number, field: "idealQuantity" | "maxQuantity", raw: string) => {
    const val = Math.max(0, parseInt(raw) || 0)
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val, _dirty: true } : item))
    )
  }

  const updateBuyPriceDisplay = (id: number, raw: string) => {
    // Allow free-form typing (including "5.", "0.", ""); only coerce on save
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, _buyPriceDisplay: raw, _dirty: true } : item))
    )
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async (item: LocalItem) => {
    setSavingIds((prev) => new Set(prev).add(item.id))
    try {
      const buyPriceCents = Math.round(parseFloat(item._buyPriceDisplay || "0") * 100)
      await updateBuylistItem({
        id: item.id,
        idealQuantity: item.idealQuantity,
        maxQuantity: item.maxQuantity,
        buyPrice: buyPriceCents,
      })
      // Mark item as clean and sync buyPrice cents back
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                buyPrice: buyPriceCents,
                _buyPriceDisplay: buyPriceCents > 0 ? (buyPriceCents / 100).toFixed(2) : "",
                _dirty: false,
              }
            : i
        )
      )
      toast.success(`Saved — ${item.cardName}`)
    } catch {
      toast.error("Failed to save changes. Please try again.")
    } finally {
      setSavingIds((prev) => {
        const s = new Set(prev)
        s.delete(item.id)
        return s
      })
    }
  }

  // ── Bulk action helpers ─────────────────────────────────────────────────────

  const handleBulkSuccess = useCallback(() => {
    clearSelection()
    router.refresh()
  }, [clearSelection, router])

  const selectedItems = items.filter((i) => selectedIds.has(i.id))

  // ── Checkbox header state ──────────────────────────────────────────────────

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id))
  const someSelected = items.some((i) => selectedIds.has(i.id)) && !allSelected

  // ── Pagination math ────────────────────────────────────────────────────────

  const startItem = totalItems > 0 ? (currentPage - 1) * 50 + 1 : 0
  const endItem = Math.min(currentPage * 50, totalItems)
  const activeStatus = searchParams.get("status") ?? ""

  // Total columns: checkbox + card + stock health + velocity + buy price + targets + action = 7
  const totalColumns = 7

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── STATS BAR ───────────────────────────────────────────────────── */}
      <div className="px-5 h-14 border-b border-border bg-card flex items-center gap-8 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            On Buylist
          </span>
          <span className="text-lg font-bold text-foreground tabular-nums leading-none">
            {stats.totalOnBuylist.toLocaleString()}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            Needing Restock
          </span>
          <span className="text-lg font-bold text-success dark:text-success tabular-nums leading-none">
            {stats.needingRestock.toLocaleString()}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            At Capacity
          </span>
          <span className="text-lg font-bold text-warning dark:text-warning tabular-nums leading-none">
            {stats.atCapacity.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── TOOLBAR: search + filters ────────────────────────────────────── */}
      <div className="px-5 h-12 border-b border-border bg-card flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search card name or set..."
            className="w-full h-8 pl-8 pr-3 bg-muted/40 border border-border rounded-md text-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
          />
        </div>

        <InventoryFilter title="Game" paramKey="game" options={FILTER_OPTIONS.games} />
        <InventoryFilter title="Rarity" paramKey="rarity" options={FILTER_OPTIONS.rarities} />
        <InventoryFilter
          title="Set"
          paramKey="set"
          options={availableSets}
          searchable
          width="w-[260px]"
        />
      </div>

      {/* ── STATUS TABS ─────────────────────────────────────────────────── */}
      <div className="px-5 h-10 border-b border-border flex items-center justify-between gap-4 bg-card shrink-0">
        <div className="flex items-center gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => pushParams({ status: tab.key || undefined })}
              className={`h-6 px-3 rounded-md text-xs font-medium border transition-colors ${
                activeStatus === tab.key
                  ? "bg-primary/10 border-primary/25 text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-4 text-label text-muted-foreground/70">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.bar}`} />
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────────── */}
      <div className={`flex-1 overflow-y-auto relative ${selectedIds.size > 0 ? "pb-20" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[640px]">
            <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
              <tr>
                <th className="w-[40px] px-3 py-3 bg-muted/50">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => handleToggleAll(checked === true)}
                      aria-label="Select all items on this page"
                    />
                  </div>
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[30%] sticky left-0 z-[5] bg-muted/50">
                  Card
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[22%] hidden md:table-cell">
                  Stock Health
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px] hidden lg:table-cell">
                  Velocity
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[13%]">
                  Buy Price
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[13%] text-center hidden lg:table-cell">
                  Targets
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[10%] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <BuylistRow
                  key={item.id}
                  item={item}
                  saving={savingIds.has(item.id)}
                  isSelected={selectedIds.has(item.id)}
                  canEditPrice={canEditPrice}
                  canEditTargets={canEditTargets}
                  onToggleSelect={handleToggleSelect}
                  onUpdateField={updateField}
                  onUpdateBuyPrice={updateBuyPriceDisplay}
                  onSave={handleSave}
                />
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={totalColumns} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <PackageX className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No cards found</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Adjust your search or filters, or add cards to inventory first.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PAGINATION ──────────────────────────────────────────────────── */}
      <div className="px-5 h-11 border-t border-border flex items-center justify-between bg-card text-xs text-muted-foreground shrink-0">
        <span>
          Showing{" "}
          <span className="font-semibold text-foreground">
            {startItem}–{endItem}
          </span>{" "}
          of <span className="font-semibold text-foreground">{totalItems}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-2.5 h-7 border border-border rounded-md hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="px-2 text-foreground font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-2.5 h-7 border border-border rounded-md hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── FLOATING ACTION BAR ──────────────────────────────────────────── */}
      {selectedIds.size > 0 && canEditPrice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-200">
          <span className="text-sm font-medium text-foreground tabular-nums">
            {selectedIds.size} selected
          </span>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
          <div className="h-5 w-px bg-border" />
          <Button size="sm" onClick={() => setBulkPriceOpen(true)} className="h-8">
            <DollarSign className="w-3.5 h-3.5 mr-1.5" />
            Edit Buy Price
          </Button>
        </div>
      )}

      {/* ── BULK PRICE MODAL ────────────────────────────────────────────── */}
      <BulkBuyPriceModal
        open={bulkPriceOpen}
        onClose={() => setBulkPriceOpen(false)}
        selectedIds={Array.from(selectedIds)}
        selectedItems={selectedItems}
        onSuccess={handleBulkSuccess}
      />
    </div>
  )
}

// ── Row component (extracted to keep parent lean) ──────────────────────────────

function BuylistRow({
  item,
  saving,
  isSelected,
  canEditPrice,
  canEditTargets,
  onToggleSelect,
  onUpdateField,
  onUpdateBuyPrice,
  onSave,
}: {
  item: LocalItem
  saving: boolean
  isSelected: boolean
  canEditPrice: boolean
  canEditTargets: boolean
  onToggleSelect: (id: number) => void
  onUpdateField: (id: number, field: "idealQuantity" | "maxQuantity", raw: string) => void
  onUpdateBuyPrice: (id: number, raw: string) => void
  onSave: (item: LocalItem) => void
}) {
  const status = getBuyStatus(item)
  const cfg = STATUS_CONFIG[status]
  const stock = item.currentStock
  const ideal = item.idealQuantity
  const max = item.maxQuantity

  // Progress bar: how close is current stock to the ideal target?
  const barPct = ideal > 0 ? Math.min((stock / ideal) * 100, 100) : 0

  return (
    <tr className={`hover:bg-muted/30 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}>
      {/* ── Checkbox ────────────────────────────────────────────────────── */}
      <td className="w-[40px] px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(item.id)}
          aria-label={`Select ${item.cardName}`}
        />
      </td>

      {/* ── Card Details ──────────────────────────────────────────────────── */}
      <td
        className={`px-5 py-3 align-middle sticky left-0 z-[5] transition-colors border-r border-border ${isSelected ? "bg-primary/5 group-hover:bg-muted/30" : "bg-background group-hover:bg-muted/30"}`}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-14 relative bg-muted rounded border border-border shrink-0 overflow-hidden">
            {item.image ? (
              <Image
                src={getHighResImage(item.image) ?? item.image}
                alt={item.cardName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate" title={item.cardName}>
              {item.cardName}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-caption bg-muted border border-border px-1.5 py-0.5 rounded text-foreground/70 font-medium uppercase tracking-wide truncate max-w-[120px]">
                {item.setName}
              </span>
              <span className="text-caption text-muted-foreground/70">{item.condition}</span>
              {item.finish?.toLowerCase().includes("foil") && (
                <span className="text-caption bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold">
                  FOIL
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* ── Stock Health -- hidden below 768px ─────────────────────────────── */}
      <td className="px-5 py-3 align-middle hidden md:table-cell">
        <div className="max-w-[200px] space-y-1.5">
          <div className="flex justify-between text-xs">
            <div>
              <span className="text-caption text-muted-foreground/70 uppercase font-semibold block">
                Have
              </span>
              <span
                className={`font-bold ${status === "AT_CAPACITY" ? "text-destructive" : "text-foreground/90"}`}
              >
                {stock}
              </span>
            </div>
            <div className="text-right">
              <span className="text-caption text-muted-foreground/70 uppercase font-semibold block">
                Target
              </span>
              <span className="font-bold text-foreground/90">{ideal > 0 ? ideal : "\u2014"}</span>
            </div>
          </div>

          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
              style={{ width: `${barPct}%` }}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className={`text-caption font-semibold ${cfg.text}`}>{cfg.label}</span>
            {max > 0 && <span className="text-caption text-muted-foreground/70">max {max}</span>}
          </div>

          {/* Targets collapsed into Stock Health cell below 1024px */}
          <div className="lg:hidden mt-2 pt-2 border-t border-border/50 flex gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-caption text-muted-foreground/70 uppercase font-semibold">
                Ideal
              </span>
              <Input
                type="number"
                min="0"
                disabled={!canEditTargets}
                className="h-8 w-full max-w-[60px] text-center text-sm focus:bg-info/5 border-border disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring"
                value={item.idealQuantity}
                onChange={(e) => onUpdateField(item.id, "idealQuantity", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-caption text-muted-foreground/70 uppercase font-semibold">
                Max
              </span>
              <Input
                type="number"
                min="0"
                disabled={!canEditTargets}
                className="h-8 w-full max-w-[60px] text-center text-sm focus:bg-destructive/5 border-border disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring"
                value={item.maxQuantity}
                onChange={(e) => onUpdateField(item.id, "maxQuantity", e.target.value)}
              />
            </div>
          </div>
        </div>
      </td>

      {/* ── Velocity -- hidden below lg ───────────────────────────────────── */}
      <td className="px-3 py-3 align-middle hidden lg:table-cell">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm tabular-nums text-muted-foreground cursor-default">
                {formatVelocity(item.velocityPerWeek ?? 0)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Based on last 30 days of activity</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>

      {/* ── Buy Price ──────────────────────────────────────────────────────── */}
      <td className="px-5 py-3 align-middle">
        <div className="relative w-full min-w-[88px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-xs pointer-events-none">
            $
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={!canEditPrice}
            className="pl-6 pr-2 h-9 font-mono text-right text-sm focus:bg-success/5 border-border disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring"
            value={item._buyPriceDisplay}
            onChange={(e) => onUpdateBuyPrice(item.id, e.target.value)}
          />
        </div>
      </td>

      {/* ── Targets -- hidden below 1024px (collapsed into Stock Health) ──── */}
      <td className="px-5 py-3 align-middle hidden lg:table-cell">
        <div className="flex gap-2 justify-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-caption text-muted-foreground/70 uppercase font-semibold">
              Ideal
            </span>
            <Input
              type="number"
              min="0"
              disabled={!canEditTargets}
              className="h-9 w-full max-w-[60px] text-center text-sm focus:bg-info/5 border-border disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring"
              value={item.idealQuantity}
              onChange={(e) => onUpdateField(item.id, "idealQuantity", e.target.value)}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-caption text-muted-foreground/70 uppercase font-semibold">
              Max
            </span>
            <Input
              type="number"
              min="0"
              disabled={!canEditTargets}
              className="h-9 w-full max-w-[60px] text-center text-sm focus:bg-destructive/5 border-border disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring"
              value={item.maxQuantity}
              onChange={(e) => onUpdateField(item.id, "maxQuantity", e.target.value)}
            />
          </div>
        </div>
      </td>

      {/* ── Save ──────────────────────────────────────────────────────────── */}
      <td className="px-5 py-3 align-middle text-right">
        <Button
          size="sm"
          onClick={() => onSave(item)}
          disabled={saving || (!canEditPrice && !canEditTargets)}
          className={`w-[84px] transition-all focus-visible:ring-2 focus-visible:ring-ring ${
            saving
              ? "bg-muted text-muted-foreground/50 border border-border shadow-none"
              : item._dirty
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "bg-card text-foreground/70 border border-border hover:text-primary hover:border-primary/30 hover:bg-primary/10"
          }`}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {item._dirty ? "Save*" : "Save"}
            </>
          )}
        </Button>
      </td>
    </tr>
  )
}
