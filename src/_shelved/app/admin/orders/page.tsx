import { getAdminOrders } from "@/app/actions/order"
import { OrdersTable } from "@/components/admin/orders-table"

export const dynamic = "force-dynamic"

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    page?: string
    search?: string
    dateFrom?: string
    dateTo?: string
    fulfillment?: string
    payment?: string
  }>
}) {
  const { q, page, search, dateFrom, dateTo, fulfillment, payment } = await searchParams

  const pageNum = page ? parseInt(page, 10) : 1
  const searchTerm = search || q || undefined

  // Default date range: last 30 days
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const resolvedDateFrom = dateFrom || thirtyDaysAgo.toISOString().split("T")[0]
  const resolvedDateTo = dateTo || now.toISOString().split("T")[0]

  // Normalize fulfillment / payment to valid enum values or undefined
  const resolvedFulfillment =
    fulfillment === "PICKUP" || fulfillment === "SHIPPING" ? fulfillment : undefined
  const resolvedPayment = payment === "STRIPE" || payment === "IN_STORE" ? payment : undefined

  const PAGE_SIZE = 50

  const response = await getAdminOrders(pageNum, PAGE_SIZE, searchTerm, {
    search: searchTerm,
    dateFrom: resolvedDateFrom,
    dateTo: resolvedDateTo,
    fulfillment: resolvedFulfillment,
    paymentMethod: resolvedPayment,
  })
  const orderList = Array.isArray(response) ? response : response?.orders || []
  const total = Array.isArray(response) ? orderList.length : (response?.total ?? orderList.length)
  const totalPages = Array.isArray(response) ? 1 : (response?.totalPages ?? 1)

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <OrdersTable
        orders={orderList}
        initialDateFrom={resolvedDateFrom}
        initialDateTo={resolvedDateTo}
        initialFulfillment={fulfillment || ""}
        initialPayment={payment || ""}
        currentPage={pageNum}
        totalPages={totalPages}
        total={total}
      />
    </div>
  )
}
