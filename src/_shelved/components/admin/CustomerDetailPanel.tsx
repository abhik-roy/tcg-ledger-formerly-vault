"use client"

import { useState, useEffect } from "react"
import { X, History, Loader2, Clock, AlertCircle, CheckCircle2, Package, Eye } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { getCustomerOrders, getOrderItemLedger } from "@/app/actions/customers"
import { ItemLedgerModal } from "@/components/admin/ItemLedgerModal"
import { OrderDetailsModal } from "@/components/admin/OrderDetailsModal"
import type {
  CustomerWithStats,
  CustomerOrder,
  CustomerOrderItem,
  QuantityLogEntry,
} from "@/app/actions/customers"

function getInitials(c: CustomerWithStats): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email
  return name
    .split(/[@\s]/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-bold bg-warning/10 text-warning border border-warning/20 dark:bg-warning/10 dark:text-warning dark:border-warning/20">
        <Clock className="w-3 h-3" /> Pending
      </span>
    )
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-bold bg-destructive/10 text-destructive border border-destructive/20 dark:bg-destructive/10 dark:text-destructive dark:border-destructive/20">
        <AlertCircle className="w-3 h-3" /> Cancelled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-bold bg-success/10 text-success border border-success/20 dark:bg-success/10 dark:text-success dark:border-success/20">
      <CheckCircle2 className="w-3 h-3" /> Paid
    </span>
  )
}

function LedgerButton({
  item,
  order,
  customer,
  onResult,
}: {
  item: CustomerOrderItem
  order: CustomerOrder
  customer: CustomerWithStats
  onResult: (data: { cardName: string; entries: QuantityLogEntry[] }) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const entries = await getOrderItemLedger(item.name, customer.email, new Date(order.createdAt))
      onResult({ cardName: item.name, entries })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-1.5 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded transition-all"
      title="View ledger entry"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <History className="w-3.5 h-3.5" />
      )}
    </button>
  )
}

interface CustomerDetailPanelProps {
  customer: CustomerWithStats
  onClose: () => void
}

export function CustomerDetailPanel({ customer, onClose }: CustomerDetailPanelProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalOrders, setTotalOrders] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [ledgerModal, setLedgerModal] = useState<{
    cardName: string
    entries: QuantityLogEntry[]
  } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [viewOrder, setViewOrder] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    setOrders([])
    setPage(1)

    getCustomerOrders(customer.id, customer.email, 1, 20)
      .then((result) => {
        if (!cancelled) {
          setOrders(result.orders)
          setTotalOrders(result.total)
          setHasMore(result.hasMore)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [customer.id, customer.email])

  const handleLoadMore = async () => {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const result = await getCustomerOrders(customer.id, customer.email, nextPage, 20)
      setOrders((prev) => [...prev, ...result.orders])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } finally {
      setLoadingMore(false)
    }
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ")

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Panel */}
        <div className="relative w-full max-w-xl bg-card h-full flex flex-col shadow-2xl border-l border-border animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-start justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {getInitials(customer)}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground truncate">
                  {fullName || customer.email}
                </h2>
                <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                <p className="text-label text-muted-foreground/60 mt-0.5">
                  Member since {new Date(customer.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="px-5 py-3 border-b border-border flex gap-6 bg-muted/20 shrink-0">
            <div className="flex flex-col gap-0.5">
              <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                Orders
              </span>
              <span className="text-base font-bold text-foreground tabular-nums">
                {customer.orderCount}
              </span>
            </div>
            <div className="h-8 w-px bg-border self-center" />
            <div className="flex flex-col gap-0.5">
              <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                Lifetime Spend
              </span>
              <span className="text-base font-bold text-foreground tabular-nums">
                ${(customer.lifetimeSpend / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Orders */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-14 bg-muted/50 rounded-lg" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground/60">
                <Package className="w-7 h-7 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No orders yet.</p>
              </div>
            ) : (
              <>
                <div className="text-xs text-muted-foreground mb-2">
                  Showing {orders.length} of {totalOrders} orders
                </div>
                <Accordion type="multiple" className="space-y-1.5">
                  {orders.map((order) => (
                    <AccordionItem
                      key={order.id}
                      value={order.id}
                      className="border border-border rounded-lg overflow-hidden"
                    >
                      {/* Trigger + Eye button as siblings (no nested buttons) */}
                      <div className="flex items-center">
                        <AccordionTrigger className="flex-1 px-4 py-3 hover:bg-muted/40 hover:no-underline [&>svg]:ml-2 [&>svg]:shrink-0">
                          <div className="flex items-center gap-2.5 text-sm w-full text-left min-w-0">
                            <span className="font-mono text-xs text-muted-foreground/60 shrink-0">
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                            <OrderStatusBadge status={order.status} />
                            <span className="font-bold text-foreground ml-auto tabular-nums shrink-0">
                              ${(order.totalAmount / 100).toFixed(2)}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <button
                          onClick={() => setViewOrder(order)}
                          className="mx-2 p-1.5 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 rounded transition-all shrink-0"
                          title="View order details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <AccordionContent className="px-4 pb-3 pt-0">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-caption text-muted-foreground/60 uppercase border-b border-border">
                              <th className="py-2 text-left">Card</th>
                              <th className="py-2 text-left">Set</th>
                              <th className="py-2 text-center">Qty</th>
                              <th className="py-2 text-right">Price</th>
                              <th className="py-2 text-right w-[40px]"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {order.items.map((item) => (
                              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                <td className="py-2 font-medium text-foreground text-xs">
                                  {item.name}
                                </td>
                                <td className="py-2 text-muted-foreground text-xs">
                                  {item.setName}
                                </td>
                                <td className="py-2 text-center text-muted-foreground text-xs">
                                  ×{item.quantity}
                                </td>
                                <td className="py-2 text-right text-foreground text-xs tabular-nums">
                                  ${(item.price / 100).toFixed(2)}
                                </td>
                                <td className="py-2 text-right">
                                  <LedgerButton
                                    item={item}
                                    order={order}
                                    customer={customer}
                                    onResult={setLedgerModal}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="mt-3 w-full py-2 text-xs font-medium text-primary hover:bg-primary/5 border border-border rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : "Load More Orders"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {ledgerModal && (
        <ItemLedgerModal
          cardName={ledgerModal.cardName}
          entries={ledgerModal.entries}
          isOpen={true}
          onClose={() => setLedgerModal(null)}
        />
      )}

      <OrderDetailsModal
        order={viewOrder}
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
      />
    </>
  )
}
