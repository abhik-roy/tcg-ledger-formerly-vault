/**
 * @file customers.ts
 * @module actions/customers
 * @description
 *   Server Action controller for the customer module. Thin wrappers around
 *   CustomerService for customer management and order/ledger queries.
 *
 * @layer Controller
 * @dependencies CustomerService, requireStaff
 */

"use server"

import { requireStaff } from "@/lib/auth-guard"
import { CustomerService } from "@/services/customer.service"

// Re-exports for backwards compatibility
export type {
  CustomerWithStats,
  CustomerOverviewStats,
  CustomerOrder,
  CustomerOrderItem,
  QuantityLogEntry,
} from "@/lib/types"

/**
 * Retrieves a paginated list of customers with order stats.
 *
 * @param {number} [page=1] - The page number.
 * @param {string} [query] - Search query (email, name).
 * @returns {Promise<{ data: CustomerWithStats[]; total: number; totalPages: number }>}
 */
export async function getCustomers(page: number = 1, query?: string) {
  await requireStaff()
  return CustomerService.getPaginatedCustomers(page, query)
}

/**
 * Retrieves paginated orders for a specific customer.
 *
 * @param {string} customerId - The customer's internal ID.
 * @param {string} customerEmail - The customer's email address.
 * @param {number} [page=1] - Page number (1-based).
 * @param {number} [pageSize=20] - Items per page.
 * @returns {Promise<{ orders: any[]; total: number; hasMore: boolean }>}
 */
export async function getCustomerOrders(
  customerId: string,
  customerEmail: string,
  page: number = 1,
  pageSize: number = 20
) {
  await requireStaff()
  return CustomerService.getOrdersForCustomer(customerId, customerEmail, page, pageSize)
}

/**
 * Retrieves ledger entries related to a specific order item purchase.
 *
 * @param {string} cardName - The card name.
 * @param {string} customerEmail - The customer's email.
 * @param {Date} orderCreatedAt - When the order was created.
 * @returns {Promise<any[]>} Matching quantity log entries.
 */
export async function getOrderItemLedger(
  cardName: string,
  customerEmail: string,
  orderCreatedAt: Date
) {
  await requireStaff()
  return CustomerService.getLedgerEntriesForItem(cardName, customerEmail, orderCreatedAt)
}

/**
 * Returns aggregate customer statistics.
 *
 * @returns {Promise<CustomerOverviewStats>} Customer overview stats.
 */
export async function getCustomerStats() {
  await requireStaff()
  return CustomerService.getOverviewStats()
}
