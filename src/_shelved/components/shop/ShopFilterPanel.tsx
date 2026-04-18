import { X, Search } from "lucide-react"
import { FILTER_OPTIONS } from "@/lib/constants"

interface ActiveFilter {
  key: string
  value: string
}

interface ShopFilterPanelProps {
  activeFilters: ActiveFilter[]
  onFilter: (key: string, value: string) => void
  onClearAll: () => void
  onClose: () => void
  isFilterActive: (key: string, value: string) => boolean
  filteredSets: { label: string; value: string }[]
  setFilterQuery: string
  onSetFilterQueryChange: (query: string) => void
}

export function ShopFilterPanel({
  activeFilters,
  onFilter,
  onClearAll,
  onClose,
  isFilterActive,
  filteredSets,
  setFilterQuery,
  onSetFilterQueryChange,
}: ShopFilterPanelProps) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-full left-0 right-0 z-20 bg-card border-b border-border shadow-xl max-h-[65vh] overflow-y-auto">
        {/* Panel header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Filters
          </span>
          <div className="flex items-center gap-3">
            {activeFilters.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear all ({activeFilters.length})
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active chips */}
        {activeFilters.length > 0 && (
          <div className="px-4 py-2.5 flex flex-wrap gap-1.5 border-b border-border bg-muted/20">
            {activeFilters.map((f) => (
              <button
                key={`${f.key}-${f.value}`}
                onClick={() => onFilter(f.key, f.value)}
                className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/20 transition-colors"
              >
                {f.value} <X className="w-2.5 h-2.5" />
              </button>
            ))}
          </div>
        )}

        {/* Filter sections -- responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {/* Game */}
          <FilterGroup
            title="Game"
            options={FILTER_OPTIONS.games}
            paramKey="game"
            isActive={isFilterActive}
            onFilter={onFilter}
          />
          {/* Condition */}
          <FilterGroup
            title="Condition"
            options={FILTER_OPTIONS.conditions}
            paramKey="condition"
            isActive={isFilterActive}
            onFilter={onFilter}
          />
          {/* Rarity */}
          <FilterGroup
            title="Rarity"
            options={FILTER_OPTIONS.rarities}
            paramKey="rarity"
            isActive={isFilterActive}
            onFilter={onFilter}
          />
          {/* Set */}
          <div className="px-4 py-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
              Set
            </h3>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
              <input
                type="text"
                value={setFilterQuery}
                onChange={(e) => onSetFilterQueryChange(e.target.value)}
                placeholder="Search sets..."
                className="w-full h-7 pl-6 pr-2 text-[11px] bg-muted/40 border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
              />
              {setFilterQuery && (
                <button
                  onClick={() => onSetFilterQueryChange("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredSets.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 py-1">No sets found</p>
              ) : (
                filteredSets.map((opt) => {
                  const active = isFilterActive("set", opt.value)
                  return (
                    <FilterOption
                      key={opt.value}
                      label={opt.label}
                      active={active}
                      onClick={() => onFilter("set", opt.value)}
                    />
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// -- Filter helpers --

function FilterGroup({
  title,
  options,
  paramKey,
  isActive,
  onFilter,
}: {
  title: string
  options: { label: string; value: string }[]
  paramKey: string
  isActive: (key: string, value: string) => boolean
  onFilter: (key: string, value: string) => void
}) {
  return (
    <div className="px-4 py-3">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
        {title}
      </h3>
      <div className="space-y-1">
        {options.map((opt) => (
          <FilterOption
            key={opt.value}
            label={opt.label}
            active={isActive(paramKey, opt.value)}
            onClick={() => onFilter(paramKey, opt.value)}
          />
        ))}
      </div>
    </div>
  )
}

function FilterOption({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 w-full py-0.5 group">
      <div
        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
          active
            ? "bg-primary border-primary"
            : "border-border bg-card group-hover:border-primary/40"
        }`}
      >
        {active && (
          <svg className="w-2 h-2 text-primary-foreground" viewBox="0 0 8 8" fill="none">
            <path
              d="M1.5 4l2 2L6.5 2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span
        className={`text-xs leading-none text-left ${
          active
            ? "text-foreground font-medium"
            : "text-muted-foreground group-hover:text-foreground/80"
        }`}
      >
        {label}
      </span>
    </button>
  )
}
