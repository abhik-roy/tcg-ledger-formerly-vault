"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { InventoryItemDTO } from "@/lib/dtos"
import { useCart } from "@/context/cart-context"
import { ShopHeader } from "@/components/shop/header"
import { QuickViewModal } from "@/components/shop/QuickViewModal"
import { LandingContent } from "@/components/shop/LandingContent"
import { ProductCard } from "@/components/shop/ProductCard"
import { ProductListRow } from "@/components/shop/ProductListRow"
import { ShopToolbar } from "@/components/shop/ShopToolbar"
import { ShopPagination } from "@/components/shop/ShopPagination"
import { ShopFilterPanel } from "@/components/shop/ShopFilterPanel"
import { toast } from "sonner"
import { SlidersHorizontal, X, Search } from "lucide-react"

const VIEW_MODE_KEY = "tcg-view-mode"

interface ShopClientProps {
  initialData: InventoryItemDTO[]
  availableSets: { label: string; value: string }[]
  totalPages: number
  currentPage: number
  totalItems: number
  currentSort: string
}

export function ShopClient({
  initialData,
  availableSets,
  totalPages,
  currentPage,
  totalItems,
  currentSort,
}: ShopClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, addToCart } = useCart()

  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid"
    return (localStorage.getItem(VIEW_MODE_KEY) as "grid" | "list") || "grid"
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [quickViewItem, setQuickViewItem] = useState<InventoryItemDTO | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [setFilterQuery, setSetFilterQuery] = useState("")
  // Drives the clip-path unroll: false = clipped (nothing visible), true = fully revealed
  const [unrolled, setUnrolled] = useState(false)
  const rafRef = useRef<number | null>(null)

  // Derived early so the unroll useEffect can reference isLanding
  const activeFilters = ["game", "condition", "rarity", "set"].flatMap((key) => {
    const val = searchParams.get(key)
    if (!val) return []
    return val.split(",").map((v) => ({ key, value: v }))
  })
  const isLanding =
    !searchParams.get("q") && activeFilters.length === 0 && !searchParams.get("browse")

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode)
  }, [viewMode])

  // When switching to results view, paint one frame with the clip hidden then animate open
  useEffect(() => {
    if (!isLanding) {
      setUnrolled(false)
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setUnrolled(true))
      })
    } else {
      setUnrolled(false)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLanding])

  const getHighRes = useCallback((url?: string | null): string | null => {
    if (!url) return null
    if (url.includes("scryfall.io"))
      return url.replace("/small/", "/large/").replace("/normal/", "/large/")
    return url
  }, [])

  // -- URL helpers --

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.set("page", "1")
    router.replace(`?${params.toString()}`)
  }

  function handleFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    const current = params.get(key)?.split(",").filter(Boolean) || []
    if (current.includes(value)) {
      const next = current.filter((v) => v !== value)
      next.length ? params.set(key, next.join(",")) : params.delete(key)
    } else {
      params.set(key, [...current, value].join(","))
    }
    params.delete("browse")
    params.set("page", "1")
    router.replace(`?${params.toString()}`)
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`?${params.toString()}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleSort(value: string) {
    updateParam("sort", value)
    setSortOpen(false)
  }

  function submitSearch() {
    const params = new URLSearchParams(searchParams.toString())
    if (searchQuery) params.set("q", searchQuery)
    else params.delete("q")
    params.delete("browse")
    params.set("page", "1")
    router.replace(`?${params.toString()}`)
  }

  function clearSearch() {
    setSearchQuery("")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("q")
    params.set("page", "1")
    router.replace(`?${params.toString()}`)
  }

  function clearAllFilters() {
    const params = new URLSearchParams()
    const q = searchParams.get("q")
    if (q) params.set("q", q)
    router.replace(`?${params.toString()}`)
  }

  function handleGameSelect(game: string) {
    const params = new URLSearchParams()
    params.set("game", game)
    params.set("page", "1")
    router.replace(`?${params.toString()}`)
  }

  function browseAll() {
    const params = new URLSearchParams()
    params.set("browse", "1")
    params.set("sort", currentSort)
    router.replace(`?${params.toString()}`)
  }

  function safeAddToCart(item: InventoryItemDTO): boolean {
    const inCart = items.find((i) => i.id === item.id)?.cartQuantity || 0
    if (inCart >= item.quantity) {
      if (inCart === item.quantity && inCart > 0) {
        toast.error(`You have the maximum available (${item.quantity}) in your cart`)
      } else {
        toast.error(
          `Only ${item.quantity} left in stock${inCart > 0 ? ` (${inCart} already in your cart)` : ""}`
        )
      }
      return false
    }
    addToCart(item)
    toast.success(`Added ${item.cardName} to cart`)
    return true
  }

  function handleModalAdd(item: InventoryItemDTO) {
    if (safeAddToCart(item)) setQuickViewItem(null)
  }

  // -- Filter sections for the floating panel --

  const filteredSets = useMemo(() => {
    if (!setFilterQuery.trim()) return availableSets
    const q = setFilterQuery.toLowerCase()
    return availableSets.filter(
      (s) => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
    )
  }, [availableSets, setFilterQuery])

  function isFilterActive(key: string, value: string) {
    return (searchParams.get(key) || "").split(",").filter(Boolean).includes(value)
  }

  // -- Render --

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Sticky top nav */}
      <ShopHeader />

      {/* Hero banner — instantly fills the viewport on results, content unrolls inside */}
      <div
        className="relative bg-gradient-to-br from-primary via-primary to-primary/80 flex flex-col"
        style={{ minHeight: !isLanding ? "calc(100vh - 3.5rem)" : undefined }}
      >
        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--primary-foreground)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Search area — shrinks after a search */}
        <div
          className={`relative px-4 sm:px-6 transition-[padding] duration-500 ${
            isLanding ? "py-10 sm:py-16" : "py-5 sm:py-7"
          }`}
        >
          {/* Landing tagline */}
          {isLanding && (
            <div className="text-center mb-7">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-primary-foreground leading-tight">
                Find Your Card
              </h1>
              <p className="text-primary-foreground/70 mt-2 text-sm sm:text-base max-w-md mx-auto">
                Browse thousands of singles across MTG, Pokemon, and more
              </p>
            </div>
          )}

          {/* Floating search bar */}
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center bg-background rounded-2xl shadow-2xl shadow-black/30 ring-1 ring-black/10 overflow-hidden">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                placeholder="Search cards, sets, games..."
                className="flex-1 h-12 sm:h-13 px-3 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm sm:text-base"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="p-2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={submitSearch}
                className="h-12 sm:h-13 px-5 sm:px-6 bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:bg-primary/80 transition-colors shrink-0"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Results — unroll from top to bottom inside the expanded purple background */}
        {!isLanding && (
          <div
            className="flex-1 flex flex-col"
            style={{
              clipPath: unrolled ? "inset(0 0 0 0)" : "inset(0 0 100% 0)",
              transition: "clip-path 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Results toolbar — sticky below top nav */}
            <div className="sticky top-14 z-30 bg-card/95 backdrop-blur-sm border-b border-border relative">
              <ShopToolbar
                filtersOpen={filtersOpen}
                onToggleFilters={() => setFiltersOpen((v) => !v)}
                activeFilters={activeFilters}
                onRemoveFilter={handleFilter}
                totalItems={totalItems}
                currentSort={currentSort}
                sortOpen={sortOpen}
                onToggleSort={() => setSortOpen((v) => !v)}
                onSort={handleSort}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />

              {/* Floating filter panel */}
              {filtersOpen && (
                <ShopFilterPanel
                  activeFilters={activeFilters}
                  onFilter={handleFilter}
                  onClearAll={clearAllFilters}
                  onClose={() => setFiltersOpen(false)}
                  isFilterActive={isFilterActive}
                  filteredSets={filteredSets}
                  setFilterQuery={setFilterQuery}
                  onSetFilterQueryChange={setSetFilterQuery}
                />
              )}
            </div>

            {/* Cards laid on top of the purple background */}
            <div className="flex-1 p-4">
              {initialData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mb-4">
                    <SlidersHorizontal className="w-5 h-5 text-primary-foreground/60" />
                  </div>
                  <p className="font-semibold text-primary-foreground">
                    No cards match your filters
                  </p>
                  <p className="text-sm text-primary-foreground/70 mt-1 mb-5">
                    Try adjusting your search or filters
                  </p>
                  {(activeFilters.length > 0 || searchParams.get("q")) && (
                    <button
                      onClick={() => {
                        clearAllFilters()
                        clearSearch()
                      }}
                      className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground underline underline-offset-2 transition-colors"
                    >
                      Clear everything
                    </button>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {initialData.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      getHighRes={getHighRes}
                      onClick={() => setQuickViewItem(item)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden">
                  {initialData.map((item) => (
                    <ProductListRow
                      key={item.id}
                      item={item}
                      getHighRes={getHighRes}
                      onView={() => setQuickViewItem(item)}
                      onAdd={() => safeAddToCart(item)}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              <ShopPagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        )}
      </div>

      {/* Landing content — below the banner on the default page */}
      {isLanding && <LandingContent onGameSelect={handleGameSelect} onBrowseAll={browseAll} />}

      <QuickViewModal
        item={quickViewItem}
        open={quickViewItem !== null}
        onClose={() => setQuickViewItem(null)}
        onAdd={handleModalAdd}
        getHighRes={getHighRes}
      />
    </div>
  )
}
