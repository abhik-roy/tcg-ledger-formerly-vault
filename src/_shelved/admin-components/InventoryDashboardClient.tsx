"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useDebounce } from "@/lib/hooks"
import { InventoryItemDTO } from "@/lib/dtos"
import { FILTER_OPTIONS } from "@/lib/constants"
import { InventoryFilter } from "@/components/admin/InventoryFilter"
import { InventoryTable } from "@/components/admin/InventoryTable"
import { InventoryGrid } from "@/components/admin/InventoryGrid"
import { BulkActionBar } from "@/components/admin/BulkActionBar"
import { BulkPriceEditModal } from "@/components/admin/BulkPriceEditModal"
import { BulkStockEditModal } from "@/components/admin/BulkStockEditModal"
import { BulkDeleteConfirmDialog } from "@/components/admin/BulkDeleteConfirmDialog"
import {
  Search,
  Upload,
  Download,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Check,
  ChevronDown,
} from "lucide-react"
import Papa from "papaparse"
import { toast } from "sonner"
import { importInventoryAction, getCardLedgerAction, LedgerEntry } from "@/app/actions/inventory"
import { CardHistoryModal } from "@/components/admin/CardHistoryModal"
import { QRCodeModal } from "@/components/admin/QRCodeModal"

interface InventoryDashboardProps {
  initialData: InventoryItemDTO[]
  totalItems: number
  totalValue: number
  lowStockCount: number
  availableSets: { label: string; value: string }[]
  currentPage?: number
  totalPages?: number
}

export function InventoryDashboardClient({
  initialData,
  totalItems,
  totalValue,
  lowStockCount,
  availableSets,
  currentPage = 1,
  totalPages = 1,
}: InventoryDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.get("q") || ""
  const currentSort = searchParams.get("sort") || "date-desc"

  // Debounced search input (400ms) — fires URL navigation after user stops typing
  const [searchInput, setSearchInput] = useState(currentSearch)
  const debouncedSearch = useDebounce(searchInput, 400)
  const isFirstSearchRender = useRef(true)
  const inStockOnly = searchParams.get("stock") === "true"

  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [isImporting, setIsImporting] = useState(false)

  const [isSortOpen, setIsSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // --- STATE: History Modal ---
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedCardName, setSelectedCardName] = useState("")
  const [historyData, setHistoryData] = useState<LedgerEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyHasMore, setHistoryHasMore] = useState(false)

  // --- STATE: QR Code Modal ---
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrCardName, setQrCardName] = useState("")

  // --- STATE: Bulk Selection ---
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false)
  const [bulkStockOpen, setBulkStockOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Clear selection when page/filters change (URL changes)
  const searchParamsString = searchParams.toString()
  const prevParamsRef = useRef(searchParamsString)
  useEffect(() => {
    if (prevParamsRef.current !== searchParamsString) {
      setSelectedIds(new Set())
      prevParamsRef.current = searchParamsString
    }
  }, [searchParamsString])

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleToggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(initialData.map((i) => i.id)) : new Set())
    },
    [initialData]
  )

  const handleRangeSelect = useCallback(
    (fromIndex: number, toIndex: number) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (let i = fromIndex; i <= toIndex; i++) {
          next.add(initialData[i].id)
        }
        return next
      })
    },
    [initialData]
  )

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const selectedItems = initialData.filter((item) => selectedIds.has(item.id))
  const selectedIdArray = Array.from(selectedIds)

  const handleBulkSuccess = useCallback(() => {
    clearSelection()
    router.refresh()
  }, [clearSelection, router])

  // --- HELPER: Force High Res Images (Only for Grid) ---
  const getHighResImage = (url?: string | null) => {
    if (!url) return null
    if (url.includes("scryfall.io")) {
      return url.replace("/small/", "/large/").replace("/normal/", "/large/")
    }
    return url
  }

  // --- PREPARE DATA ---
  const gridData = initialData.map((item) => ({
    ...item,
    image: getHighResImage(item.image),
  }))

  // --- HANDLER: Generate QR ---
  const handleGenerateQR = (cardName: string) => {
    setQrCardName(cardName)
    setQrModalOpen(true)
  }

  // --- HANDLER: View History ---
  const handleViewHistory = async (cardName: string) => {
    setSelectedCardName(cardName)
    setHistoryModalOpen(true)
    setHistoryLoading(true)

    // Fetch fresh data from server action
    const result = await getCardLedgerAction(cardName)
    setHistoryData(result.entries)
    setHistoryHasMore(result.hasMore)
    setHistoryLoading(false)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const csvContent = event.target?.result as string
      const lines = csvContent.split(/\r?\n/)
      const headerIndex = lines.findIndex(
        (line) => line.includes("Card Name") || line.includes("name")
      )
      if (headerIndex === -1) {
        toast.error("Could not find a valid header row (Card Name) in the CSV.")
        setIsImporting(false)
        return
      }
      const cleanCsv = lines.slice(headerIndex).join("\n")
      Papa.parse(cleanCsv, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const res = await importInventoryAction(results.data)
            if (res.success) {
              toast.success(`Imported ${res.successCount} items!`)
              router.refresh()
            } else {
              toast.error(`Import error: ${res.error}`)
            }
          } catch (err) {
            console.error("Import failed:", err)
            toast.error("Database error during import.")
          } finally {
            setIsImporting(false)
            e.target.value = ""
          }
        },
      })
    }
    reader.readAsText(file)
  }

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.set("page", "1")
    router.replace(`${pathname}?${params.toString()}`)
  }

  function handleSearch(term: string) {
    updateParam("q", term || null)
  }

  // Fire URL navigation when debounced search changes (skip the initial render)
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false
      return
    }
    handleSearch(debouncedSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const sortOptions = [
    { label: "Newest Added", value: "date-desc" },
    { label: "Oldest Added", value: "date-asc" },
    { label: "Price: High to Low", value: "price-desc" },
    { label: "Price: Low to High", value: "price-asc" },
    { label: "Name: A-Z", value: "name-asc" },
  ]
  const currentSortLabel = sortOptions.find((o) => o.value === currentSort)?.label || "Sort By"

  const ITEMS_PER_PAGE = 50
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems)

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── STATS BAR ────────────────────────────────────────────────── */}
      <div className="px-5 h-14 border-b border-border bg-card flex items-center gap-6 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            Total SKUs
          </span>
          <span className="text-base font-bold text-foreground tabular-nums">
            {totalItems.toLocaleString()}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            Inventory Value
          </span>
          <span className="text-base font-bold text-foreground tabular-nums">
            $
            {(totalValue / 100).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        {lowStockCount > 0 && (
          <>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col gap-0.5">
              <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                Low Stock
              </span>
              <span className="text-base font-bold text-destructive tabular-nums">
                {lowStockCount.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
      <div className="px-5 h-12 border-b border-border flex items-center justify-between gap-4 bg-card shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search items…"
            className="w-full h-8 pl-8 pr-3 bg-muted/40 border border-border rounded-md text-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label
            className={`h-7 px-2.5 rounded-md text-xs font-medium border border-border bg-muted/40 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer ${isImporting ? "opacity-50 pointer-events-none" : ""}`}
            title="Import CSV"
          >
            <Upload className="w-3 h-3" />
            {isImporting ? "Importing…" : "Import"}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
              disabled={isImporting}
            />
          </label>
          <button
            onClick={() => (window.location.href = "/api/inventory/export")}
            className="h-7 px-2.5 rounded-md text-xs font-medium border border-border bg-muted/40 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            title="Export CSV"
          >
            <Download className="w-3 h-3" />
            Export
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex bg-muted/50 p-0.5 rounded-md border border-border">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-all ${viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition-all ${viewMode === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── FILTER ROW ──────────────────────────────────────────────────── */}
      <div className="px-5 h-10 border-b border-border flex items-center gap-2 bg-card shrink-0">
        <InventoryFilter title="Game" paramKey="game" options={FILTER_OPTIONS.games} />
        <InventoryFilter
          title="Set"
          paramKey="set"
          options={availableSets}
          searchable
          width="w-[280px]"
        />
        <InventoryFilter title="Rarity" paramKey="rarity" options={FILTER_OPTIONS.rarities} />
        <InventoryFilter
          title="Condition"
          paramKey="condition"
          options={FILTER_OPTIONS.conditions}
        />

        <div className="h-4 w-px bg-border mx-1" />

        {/* Sort */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <ArrowUpDown className="w-3 h-3 opacity-50" />
            {currentSortLabel}
            <ChevronDown className="w-3 h-3 opacity-40" />
          </button>
          {isSortOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateParam("sort", option.value)
                    setIsSortOpen(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition-colors
                    ${currentSort === option.value ? "text-primary font-medium bg-primary/5" : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"}`}
                >
                  {option.label}
                  {currentSort === option.value && <Check className="w-3 h-3 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* In Stock toggle */}
        <button
          onClick={() => updateParam("stock", inStockOnly ? null : "true")}
          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors
            ${
              inStockOnly
                ? "bg-primary/10 border-primary/25 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
        >
          {inStockOnly && <Check className="w-3 h-3" />}
          In Stock
        </button>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <div className={`flex-1 overflow-y-auto ${selectedIds.size > 0 ? "pb-20" : ""}`}>
        {viewMode === "list" ? (
          <InventoryTable
            data={initialData}
            onViewHistory={handleViewHistory}
            onGenerateQR={handleGenerateQR}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleAll={handleToggleAll}
            onRangeSelect={handleRangeSelect}
          />
        ) : (
          <InventoryGrid
            data={gridData}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        )}
      </div>

      {/* ── PAGINATION ──────────────────────────────────────────────────── */}
      <div className="px-5 h-11 border-t border-border flex items-center justify-between bg-card text-xs text-muted-foreground shrink-0">
        <span>
          Showing{" "}
          <span className="font-semibold text-foreground">
            {totalItems > 0 ? startItem : 0}–{endItem}
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

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      <CardHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        cardName={selectedCardName}
        data={historyData}
        loading={historyLoading}
        hasMore={historyHasMore}
      />
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        cardName={qrCardName}
      />

      {/* ── BULK ACTIONS ───────────────────────────────────────────────── */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onBulkPrice={() => setBulkPriceOpen(true)}
        onBulkStock={() => setBulkStockOpen(true)}
        onBulkDelete={() => setBulkDeleteOpen(true)}
      />
      <BulkPriceEditModal
        open={bulkPriceOpen}
        onClose={() => setBulkPriceOpen(false)}
        selectedIds={selectedIdArray}
        selectedItems={selectedItems}
        onSuccess={handleBulkSuccess}
      />
      <BulkStockEditModal
        open={bulkStockOpen}
        onClose={() => setBulkStockOpen(false)}
        selectedIds={selectedIdArray}
        selectedItems={selectedItems}
        onSuccess={handleBulkSuccess}
      />
      <BulkDeleteConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        selectedIds={selectedIdArray}
        selectedItems={selectedItems}
        onSuccess={() => handleBulkSuccess()}
      />
    </div>
  )
}
