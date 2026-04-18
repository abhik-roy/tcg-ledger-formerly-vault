"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { CustomersTable } from "@/components/admin/CustomersTable"
import { CustomerDetailPanel } from "@/components/admin/CustomerDetailPanel"
import type { CustomerWithStats, CustomerOverviewStats } from "@/app/actions/customers"

interface CustomersClientProps {
  initialData: CustomerWithStats[]
  total: number
  totalPages: number
  currentPage: number
  stats: CustomerOverviewStats
}

export function CustomersClient({
  initialData,
  total,
  totalPages,
  currentPage,
  stats,
}: CustomersClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.get("q") || ""
  const [searchValue, setSearchValue] = useState(currentSearch)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchValue !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString())
        if (searchValue) params.set("q", searchValue)
        else params.delete("q")
        params.set("page", "1")
        router.push(`${pathname}?${params.toString()}`)
      }
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchValue]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const startItem = total > 0 ? (currentPage - 1) * 25 + 1 : 0
  const endItem = Math.min(currentPage * 25, total)

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Stats bar ───────────────────────────────────────────────── */}
      <div className="px-5 h-14 border-b border-border bg-card flex items-center gap-8 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            Total Customers
          </span>
          <span className="text-lg font-bold text-foreground tabular-nums leading-none">
            {stats.totalCustomers.toLocaleString()}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            Total Revenue
          </span>
          <span className="text-lg font-bold text-success tabular-nums leading-none">
            $
            {(stats.totalRevenue / 100).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
            Avg Order Value
          </span>
          <span className="text-lg font-bold text-warning tabular-nums leading-none">
            ${(stats.avgOrderValue / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="px-4 h-12 border-b border-border bg-card flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full h-8 pl-8 pr-3 bg-muted/40 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{total.toLocaleString()}</span> customers
        </span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <CustomersTable
          customers={initialData}
          onSelectCustomer={setSelectedCustomer}
          selectedCustomerId={selectedCustomer?.id}
        />
      </div>

      {/* ── Pagination ──────────────────────────────────────────────── */}
      <div className="px-5 h-11 border-t border-border flex items-center justify-between bg-card text-xs text-muted-foreground shrink-0">
        <span>
          Showing{" "}
          <span className="font-semibold text-foreground">
            {startItem}–{endItem}
          </span>{" "}
          of <span className="font-semibold text-foreground">{total}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-2.5 h-7 border border-border rounded-md hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="px-2 text-foreground font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-2.5 h-7 border border-border rounded-md hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Detail panel ────────────────────────────────────────────── */}
      {selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  )
}
