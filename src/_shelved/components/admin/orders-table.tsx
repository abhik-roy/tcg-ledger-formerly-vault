"use client"

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useDebounce } from "@/lib/hooks"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Eye,
  CheckCircle2,
  Truck,
  AlertCircle,
  Clock,
  PackageCheck,
  Archive,
  Inbox,
  CreditCard,
  Search,
  X,
  UserRound,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
} from "lucide-react"
import { OrderDetailsModal } from "./OrderDetailsModal"
import { FulfillOrderModal } from "./FulfillOrderModal"
import { BulkFulfillModal } from "./BulkFulfillModal"
import { cancelOrderAction } from "@/app/actions/order"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

interface OrdersTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[]
  initialDateFrom?: string
  initialDateTo?: string
  initialFulfillment?: string
  initialPayment?: string
  currentPage?: number
  totalPages?: number
  total?: number
}

export function OrdersTable({
  orders,
  initialDateFrom,
  initialDateTo,
  initialFulfillment,
  initialPayment,
  currentPage = 1,
  totalPages = 1,
  total,
}: OrdersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const canFulfill = isAdmin || (session?.user?.permissions?.ordersFulfill ?? false)

  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [viewOrder, setViewOrder] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fulfillOrder, setFulfillOrder] = useState<any>(null)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebounce(searchInput, 400)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)

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

  // Clear selection on tab change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab])

  // Clear selection when URL params change
  const paramsString = searchParams.toString()
  useEffect(() => {
    setSelectedIds(new Set())
  }, [paramsString])

  const safeOrders = Array.isArray(orders) ? orders : []

  const pendingOrders = safeOrders.filter((o) => o.status === "PENDING" || o.status === "PAID")
  const completedOrders = safeOrders.filter(
    (o) => o.status === "COMPLETED" || o.status === "CANCELLED"
  )
  const tabOrders = activeTab === "pending" ? pendingOrders : completedOrders

  const displayedOrders = useMemo(() => {
    if (!search.trim()) return tabOrders
    const q = search.toLowerCase()
    return tabOrders.filter(
      (o) => o.customerEmail?.toLowerCase().includes(q) || o.id?.toLowerCase().includes(q)
    )
  }, [tabOrders, search])

  // Fulfillable orders in current view (for header checkbox)
  const fulfillableIds = useMemo(
    () =>
      displayedOrders.filter((o) => o.status === "PENDING" || o.status === "PAID").map((o) => o.id),
    [displayedOrders]
  )

  function handleTabChange(tab: "pending" | "completed") {
    setActiveTab(tab)
    setSearchInput("")
    setExpandedRows(new Set())
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (fulfillableIds.length === 0) return
    const allSelected = fulfillableIds.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(fulfillableIds))
    }
  }

  // Header checkbox state
  const headerCheckState: boolean | "indeterminate" = useMemo(() => {
    if (fulfillableIds.length === 0) return false
    const selectedCount = fulfillableIds.filter((id) => selectedIds.has(id)).length
    if (selectedCount === 0) return false
    if (selectedCount === fulfillableIds.length) return true
    return "indeterminate"
  }, [fulfillableIds, selectedIds])

  // --- URL param helpers ---
  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/admin/orders?${params.toString()}`)
  }

  function clearAllFilters() {
    router.push("/admin/orders")
  }

  const hasActiveFilters =
    (initialFulfillment && initialFulfillment !== "") ||
    (initialPayment && initialPayment !== "") ||
    // Check if dates differ from defaults
    searchParams.has("dateFrom") ||
    searchParams.has("dateTo")

  // Selected orders for bulk modal
  const selectedOrders = useMemo(
    () => safeOrders.filter((o) => selectedIds.has(o.id)),
    [safeOrders, selectedIds]
  )

  return (
    <>
      <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* -- Toolbar -- */}
        <div className="h-12 px-4 border-b border-border bg-card flex items-center gap-2 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email or order ID…"
              className="w-full h-8 pl-8 pr-7 bg-muted/40 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <span className="ml-auto text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{displayedOrders.length}</span>
            {total !== undefined && total > displayedOrders.length ? (
              <span> of {total}</span>
            ) : null}{" "}
            order{displayedOrders.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* -- Filter bar -- */}
        <div className="px-4 h-10 border-b border-border bg-card flex items-center gap-2 shrink-0 overflow-x-auto">
          <label className="text-xs text-muted-foreground shrink-0">From</label>
          <input
            type="date"
            value={initialDateFrom || ""}
            onChange={(e) => updateParam("dateFrom", e.target.value)}
            className="h-7 px-2 text-xs rounded-md border border-border bg-background text-foreground"
          />
          <label className="text-xs text-muted-foreground shrink-0">To</label>
          <input
            type="date"
            value={initialDateTo || ""}
            onChange={(e) => updateParam("dateTo", e.target.value)}
            className="h-7 px-2 text-xs rounded-md border border-border bg-background text-foreground"
          />

          <Select
            value={initialFulfillment || undefined}
            onValueChange={(v) => updateParam("fulfillment", v === "ALL" ? "" : v)}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs px-2">
              <SelectValue placeholder="Fulfillment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PICKUP">Pickup</SelectItem>
              <SelectItem value="SHIPPING">Shipping</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={initialPayment || undefined}
            onValueChange={(v) => updateParam("payment", v === "ALL" ? "" : v)}
          >
            <SelectTrigger className="h-7 w-[110px] text-xs px-2">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="STRIPE">Stripe</SelectItem>
              <SelectItem value="IN_STORE">In-Store</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1"
            >
              <FilterX className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>

        {/* -- Tabs -- */}
        <div className="px-4 h-10 border-b border-border bg-card flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleTabChange("pending")}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium border transition-colors ${
              activeTab === "pending"
                ? "bg-primary/10 border-primary/25 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Pending Fulfillment
            <span
              className={`ml-1 min-w-[18px] h-[18px] px-1 rounded-full text-caption font-bold flex items-center justify-center ${
                activeTab === "pending"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {pendingOrders.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("completed")}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium border transition-colors ${
              activeTab === "completed"
                ? "bg-success/10 border-success/20 text-success dark:text-success"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Completed History
            <span
              className={`ml-1 min-w-[18px] h-[18px] px-1 rounded-full text-caption font-bold flex items-center justify-center ${
                activeTab === "completed"
                  ? "bg-success/15 text-success dark:text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {completedOrders.length}
            </span>
          </button>
        </div>

        {/* -- Table -- */}
        <div className="flex-1 overflow-y-auto relative flex flex-col">
          {displayedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mb-3">
                {activeTab === "pending" ? (
                  <Inbox className="w-4 h-4 text-muted-foreground/40" />
                ) : (
                  <Archive className="w-4 h-4 text-muted-foreground/40" />
                )}
              </div>
              <p className="text-sm font-medium text-foreground">
                {search
                  ? `No orders match "${search}"`
                  : activeTab === "pending"
                    ? "No pending orders -- all caught up!"
                    : "No completed orders yet"}
              </p>
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div ref={scrollRef} className="overflow-x-auto" onScroll={checkScroll}>
              <table className="w-full text-sm text-left min-w-[820px]">
                <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                  <tr>
                    {/* Checkbox column */}
                    <th className="w-[44px] px-3 py-3">
                      <Checkbox
                        checked={headerCheckState}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all fulfillable orders"
                      />
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">
                      Order
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Customer
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[110px]">
                      Date
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[70px]">
                      Age
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[90px]">
                      Total
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[110px] hidden lg:table-cell">
                      Payment
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[130px] hidden md:table-cell">
                      Fulfillment
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[90px] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedOrders.map((order) => {
                    const isExpanded = expandedRows.has(order.id)
                    const isSelected = selectedIds.has(order.id)
                    const isFulfillable = order.status === "PENDING" || order.status === "PAID"

                    // Age computation
                    const nowMs = new Date().getTime()
                    const ageMs = nowMs - new Date(order.createdAt).getTime()
                    const ageDays = Math.floor(ageMs / 86400000)
                    const ageHours = Math.floor(ageMs / 3600000)
                    const ageLabel = ageDays < 1 ? `${ageHours}h` : `${ageDays}d`

                    let ageClasses = "text-xs tabular-nums text-muted-foreground"
                    if (isFulfillable) {
                      if (ageDays >= 8) {
                        ageClasses =
                          "text-xs tabular-nums text-destructive bg-destructive/10 border border-destructive/30 rounded px-1.5 py-0.5"
                      } else if (ageDays >= 4) {
                        ageClasses =
                          "text-xs tabular-nums text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5"
                      }
                    }

                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className={`hover:bg-muted/30 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}
                          onClick={() => {
                            if (window.innerWidth < 1024) toggleRow(order.id)
                          }}
                        >
                          {/* Checkbox */}
                          <td className="w-[44px] px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(order.id)}
                              disabled={!isFulfillable}
                              className={!isFulfillable ? "opacity-40" : ""}
                              aria-label={`Select order ${order.id.slice(-6)}`}
                            />
                          </td>

                          <td
                            className="px-5 py-3 font-mono text-xs text-muted-foreground"
                            title={order.id}
                          >
                            <div className="flex items-center gap-1">
                              #{order.id.slice(-6).toUpperCase()}
                              <ChevronDown
                                className={`w-3 h-3 text-muted-foreground/40 shrink-0 lg:hidden transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              />
                            </div>
                          </td>

                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="min-w-0 max-w-[180px]">
                                <div
                                  className="font-medium text-foreground truncate text-sm"
                                  title={order.customerEmail}
                                >
                                  {order.customerEmail}
                                </div>
                                <div className="text-label text-muted-foreground/60">
                                  {order.items?.length || 0} item
                                  {order.items?.length !== 1 ? "s" : ""}
                                </div>
                              </div>
                              <Link
                                href={`/admin/customers?q=${encodeURIComponent(order.customerEmail)}`}
                                className="ml-1 p-1 text-muted-foreground/30 hover:text-primary hover:bg-primary/10 rounded transition-all opacity-0 group-hover:opacity-100 shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
                                title="View customer profile"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <UserRound className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>

                          <td className="px-5 py-3 text-muted-foreground text-xs">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>

                          {/* Age column */}
                          <td className="px-5 py-3">
                            <span className={ageClasses}>{ageLabel}</span>
                          </td>

                          <td className="px-5 py-3 font-bold text-foreground tabular-nums">
                            ${(order.totalAmount / 100).toFixed(2)}
                          </td>

                          <td className="px-5 py-3 hidden lg:table-cell">
                            <PaymentStatusBadge status={order.status} />
                          </td>

                          <td className="px-5 py-3 hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              {order.fulfillment === "PICKUP" ? (
                                <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded text-label font-medium bg-warning/10 text-warning border border-warning/30 dark:bg-warning/10 dark:text-warning dark:border-warning/20">
                                  Pickup
                                </span>
                              ) : (
                                <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded text-label font-medium bg-info/10 text-info border border-info/30 dark:bg-info/10 dark:text-info dark:border-info/20">
                                  <Truck className="w-3 h-3" /> Ship
                                </span>
                              )}
                              {order.status === "COMPLETED" && (
                                <span className="text-caption text-success dark:text-success flex items-center gap-1 font-medium">
                                  <CheckCircle2 className="w-3 h-3" /> Fulfilled
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-3 text-right">
                            <div
                              className="flex items-center justify-end gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setViewOrder(order)}
                                className="p-1.5 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded-md transition-all focus-visible:ring-2 focus-visible:ring-ring"
                                title="View details"
                                aria-label="Row actions"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {canFulfill &&
                                order.status !== "COMPLETED" &&
                                order.status !== "CANCELLED" && (
                                  <button
                                    onClick={() => setFulfillOrder(order)}
                                    className="p-1.5 text-muted-foreground/50 hover:text-success hover:bg-success/10 dark:hover:text-success rounded-md transition-all focus-visible:ring-2 focus-visible:ring-ring"
                                    title="Fulfill order"
                                  >
                                    <PackageCheck className="w-4 h-4" />
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable detail row for mobile */}
                        {isExpanded && (
                          <tr key={`${order.id}-detail`} className="lg:hidden bg-muted/10">
                            <td colSpan={9} className="px-5 py-3">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                    Payment
                                  </span>
                                  <PaymentStatusBadge status={order.status} />
                                </div>
                                <div className="hidden max-md:block">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                    Fulfillment
                                  </span>
                                  <div className="flex flex-col gap-1">
                                    {order.fulfillment === "PICKUP" ? (
                                      <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded text-label font-medium bg-warning/10 text-warning border border-warning/30">
                                        Pickup
                                      </span>
                                    ) : (
                                      <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded text-label font-medium bg-info/10 text-info border border-info/30">
                                        <Truck className="w-3 h-3" /> Ship
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              {/* Right-edge fade indicator */}
              {canScroll && (
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-background" />
              )}
            </div>
          )}
        </div>

        {/* -- Pagination footer -- */}
        {totalPages > 1 && (
          <div className="h-11 border-t border-border bg-card flex items-center justify-between px-4 shrink-0">
            <span className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
              <span className="font-semibold text-foreground">{totalPages}</span>
              {total !== undefined ? <span className="ml-1">({total} total)</span> : null}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateParam("page", String(currentPage - 1))}
                disabled={currentPage <= 1}
                className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateParam("page", String(currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating action bar */}
      {selectedIds.size > 0 && canFulfill && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-sm:left-4 max-sm:right-4 max-sm:translate-x-0 bg-card border border-border rounded-xl shadow-2xl px-5 h-12 flex items-center gap-4">
          <span className="text-sm text-foreground">
            <span className="font-bold">{selectedIds.size}</span> orders selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => setBulkModalOpen(true)}
            className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            Bulk Fulfill
          </button>
        </div>
      )}

      <OrderDetailsModal
        order={viewOrder}
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
        onCancelOrder={async (id, reason) => {
          const result = await cancelOrderAction(id, reason)
          if (result.success) router.refresh()
          return result
        }}
      />
      <FulfillOrderModal
        order={fulfillOrder}
        isOpen={!!fulfillOrder}
        onClose={() => setFulfillOrder(null)}
        onSuccess={() => router.refresh()}
      />
      <BulkFulfillModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedIds={Array.from(selectedIds)}
        selectedOrders={selectedOrders}
        onSuccess={() => {
          setSelectedIds(new Set())
          router.refresh()
        }}
      />
    </>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-label font-medium bg-warning/10 text-warning border border-warning/30 dark:bg-warning/10 dark:text-warning dark:border-warning/20">
        <Clock className="w-3 h-3" /> Pending
      </span>
    )
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-label font-medium bg-destructive/10 text-destructive border border-destructive/30 dark:bg-destructive/10 dark:text-destructive dark:border-destructive/20">
        <AlertCircle className="w-3 h-3" /> Cancelled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-label font-medium bg-success/10 text-success border border-success/30 dark:bg-success/10 dark:text-success dark:border-success/20">
      <CreditCard className="w-3 h-3" /> Paid
    </span>
  )
}
