import { SlidersHorizontal, ChevronDown, X, Check, LayoutGrid, List } from "lucide-react"

const SORT_OPTIONS = [
  { label: "Newest", value: "date-desc" },
  { label: "Oldest", value: "date-asc" },
  { label: "Price: Low -> High", value: "price-asc" },
  { label: "Price: High -> Low", value: "price-desc" },
  { label: "Name: A-Z", value: "name-asc" },
]

interface ActiveFilter {
  key: string
  value: string
}

interface ShopToolbarProps {
  filtersOpen: boolean
  onToggleFilters: () => void
  activeFilters: ActiveFilter[]
  onRemoveFilter: (key: string, value: string) => void
  totalItems: number
  currentSort: string
  sortOpen: boolean
  onToggleSort: () => void
  onSort: (value: string) => void
  viewMode: "grid" | "list"
  onViewModeChange: (mode: "grid" | "list") => void
}

export function ShopToolbar({
  filtersOpen,
  onToggleFilters,
  activeFilters,
  onRemoveFilter,
  totalItems,
  currentSort,
  sortOpen,
  onToggleSort,
  onSort,
  viewMode,
  onViewModeChange,
}: ShopToolbarProps) {
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? "Newest"

  return (
    <div className="px-4 h-11 flex items-center gap-2">
      {/* Filter toggle */}
      <button
        onClick={onToggleFilters}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors shrink-0 ${
          filtersOpen || activeFilters.length > 0
            ? "bg-primary/10 border-primary/30 text-primary"
            : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">Filters</span>
        {activeFilters.length > 0 && (
          <span className="w-4 h-4 bg-primary text-primary-foreground rounded-full text-[9px] font-bold flex items-center justify-center">
            {activeFilters.length}
          </span>
        )}
      </button>

      {/* Active filter chips -- desktop only */}
      {activeFilters.length > 0 && (
        <div className="hidden sm:flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
          {activeFilters.slice(0, 3).map((f) => (
            <button
              key={`${f.key}-${f.value}`}
              onClick={() => onRemoveFilter(f.key, f.value)}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/20 shrink-0 transition-colors"
            >
              <span className="truncate max-w-[80px]">{f.value}</span>
              <X className="w-2.5 h-2.5 shrink-0" />
            </button>
          ))}
          {activeFilters.length > 3 && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              +{activeFilters.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Item count */}
      <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">
        {totalItems.toLocaleString()} cards
      </span>

      {/* Sort */}
      <div className="relative shrink-0">
        <button
          onClick={onToggleSort}
          className="flex items-center gap-1 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="hidden sm:inline text-muted-foreground">Sort:</span>
          <span className="font-medium text-foreground">{currentSortLabel}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
        </button>
        {sortOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={onToggleSort} />
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSort(opt.value)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors ${
                    currentSort === opt.value
                      ? "text-primary font-medium bg-primary/5"
                      : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                  {currentSort === opt.value && <Check className="w-3 h-3 shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* View mode toggle */}
      <div className="flex bg-muted/50 rounded-md p-0.5 border border-border shrink-0">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`p-1.5 rounded transition-all ${
            viewMode === "grid"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Grid view"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`p-1.5 rounded transition-all ${
            viewMode === "list"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="List view"
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
