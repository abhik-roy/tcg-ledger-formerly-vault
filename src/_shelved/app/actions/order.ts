/**
 * @file order.ts
 * @module actions/order
 * @description
 *   Server Action controller for the order module. Thin wrappers around
 *   OrderService for admin order management.
 *
 * @layer Controller
 * @dependencies OrderService, requireStaff
 */

"use server"

import { OrderService } from "@/services/order.service"
import { revalidatePath, revalidateTag } from "next/cache"
import { requireStaff } from "@/lib/auth-guard"
import { OrderFilterParams } from "@/lib/types"

/**
 * Returns the count of orders in PENDING or PAID status.
 *
 * @returns {Promise<number>} Pending/paid order count.
 */
export async function getPendingOrderCount() {
  await requireStaff()
  try {
    return await OrderService.getPendingOrderCount()
  } catch {
    return 0
  }
}

/**
 * Retrieves a paginated list of admin orders with optional filters.
 *
 * @param {number} [page=1] - The page number.
 * @param {number} [limit=10] - Items per page.
 * @param {string} [search] - Optional search string (order ID prefix or customer email). Deprecated — use filters.search instead.
 * @param {OrderFilterParams} [filters] - Optional filter parameters (search, date range, fulfillment, paymentMethod).
 * @returns {Promise<{ orders: any[]; total: number; totalPages: number }>}
 */
export async function getAdminOrders(
  page = 1,
  limit = 10,
  search?: string,
  filters?: OrderFilterParams
) {
  await requireStaff()
  // Merge legacy `search` param into filters for backwards compatibility
  const mergedFilters: OrderFilterParams = { ...filters }
  if (search && !mergedFilters.search) {
    mergedFilters.search = search
  }
  return OrderService.getAdminOrders(page, limit, mergedFilters)
}

/**
 * Cancels an order and restores its inventory.
 * Admin-only action.
 *
 * @param {string} orderId - The order ID.
 * @param {string} [reason] - Optional cancellation reason.
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function cancelOrderAction(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireStaff()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const result = await OrderService.cancelOrder(orderId, reason ?? "Cancelled by admin")
    if (result.success) {
      revalidatePath("/admin/orders")
      revalidateTag("dashboard-stats", "default")
    }
    return result
  } catch (error) {
    console.error("cancelOrderAction error:", error)
    return { success: false, error: "Failed to cancel order" }
  }
}

/**
 * Marks multiple orders as fulfilled in bulk.
 * Admin-only action.
 *
 * @param {string[]} orderIds - Array of order IDs to fulfill.
 * @returns {Promise<{ success: boolean; succeeded?: string[]; failed?: { id: string; error: string }[]; error?: string }>}
 */
export async function bulkFulfillAction(orderIds: string[]): Promise<{
  success: boolean
  succeeded?: string[]
  failed?: { id: string; error: string }[]
  error?: string
}> {
  try {
    await requireStaff()
  } catch {
    return { success: false, error: "Unauthorized" }
  }

  if (!orderIds || orderIds.length === 0) {
    return { success: false, error: "No order IDs provided" }
  }

  try {
    const result = await OrderService.bulkFulfillOrders(orderIds)
    revalidatePath("/admin/orders")
    revalidateTag("dashboard-stats", "default")
    return { success: true, succeeded: result.succeeded, failed: result.failed }
  } catch (error) {
    console.error("bulkFulfillAction error:", error)
    return { success: false, error: "Failed to bulk fulfill orders" }
  }
}

/**
 * Marks an order as fulfilled (shipped) with optional tracking info.
 *
 * @param {string} orderId - The order ID.
 * @param {string} [trackingNumber] - Optional tracking number.
 * @param {string} [carrier="USPS"] - Shipping carrier name.
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function fulfillOrderAction(
  orderId: string,
  trackingNumber?: string,
  carrier: string = "USPS"
) {
  await requireStaff()
  try {
    const result = await OrderService.fulfillOrder(orderId, trackingNumber, carrier)
    revalidatePath("/admin/orders")
    revalidateTag("dashboard-stats", "default")
    return result
  } catch (error) {
    console.error("Fulfillment Error:", error)
    return { success: false, error: "Failed to mark as shipped" }
  }
}
