"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ChevronDown, Check, Search, X } from "lucide-react"

interface FilterOption {
  label: string
  value: string
}

interface InventoryFilterProps {
  title: string
  paramKey: string
  options: FilterOption[]
  searchable?: boolean // NEW: Turn on search bar
  width?: string // NEW: Custom width (e.g. "w-72")
}

export function InventoryFilter({
  title,
  paramKey,
  options,
  searchable = false,
  width = "w-48", // Default width
}: InventoryFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // State
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  // Get currently selected values from URL (e.g. "Khans,Fate Reforged")
  const currentParam = searchParams.get(paramKey)
  const selectedValues = currentParam ? currentParam.split(",") : []

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter the options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options
    return options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [options, searchQuery])

  // Handle Toggle Selection
  const toggleOption = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    let newValues = [...selectedValues]

    if (newValues.includes(value)) {
      newValues = newValues.filter((v) => v !== value)
    } else {
      newValues.push(value)
    }

    if (newValues.length > 0) {
      params.set(paramKey, newValues.join(","))
    } else {
      params.delete(paramKey)
    }

    // Reset page to 1 when filtering
    params.set("page", "1")
    router.replace(`${pathname}?${params.toString()}`)
  }

  // Handle Clear All
  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation()
    const params = new URLSearchParams(searchParams.toString())
    params.delete(paramKey)
    params.set("page", "1")
    router.replace(`${pathname}?${params.toString()}`)
    setIsOpen(false)
  }

  const hasSelection = selectedValues.length > 0

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger pill */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) setSearchQuery("")
        }}
        className={`
          flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-all
          ${
            hasSelection
              ? "bg-primary/10 border-primary/25 text-primary hover:bg-primary/15"
              : "bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border"
          }
        `}
      >
        {title}
        {hasSelection && (
          <span className="flex items-center justify-center bg-primary text-primary-foreground text-[9px] w-3.5 h-3.5 rounded-full font-bold leading-none">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
        {hasSelection && (
          <div
            role="button"
            onClick={clearFilter}
            className="ml-0.5 p-0.5 rounded hover:bg-primary/20 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-1 ${width} bg-popover border border-border rounded-lg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[280px]`}
        >
          {searchable && (
            <div className="p-1.5 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder={`Search ${title.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-7 pl-7 pr-2 text-xs bg-muted/40 border border-border rounded focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={`
                      w-full text-left px-2.5 py-1.5 text-xs rounded flex items-center justify-between gap-2 transition-colors
                      ${
                        isSelected
                          ? "bg-primary/8 text-primary font-medium"
                          : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"
                      }
                    `}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="w-3 h-3 shrink-0 text-primary" />}
                  </button>
                )
              })
            ) : (
              <p className="px-3 py-3 text-center text-label text-muted-foreground/50">
                No results
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
