/**
 * @file profile.ts
 * @module actions/profile
 * @description
 *   Server Action controller for customer-facing profile operations.
 *   Thin wrappers around CustomerService, guarded by requireCustomer.
 *
 * @layer Controller
 * @dependencies CustomerService, requireCustomer
 */

"use server"

import { requireCustomer } from "@/lib/auth-guard"
import { CustomerService } from "@/services/customer.service"

/**
 * Retrieves paginated orders for the authenticated customer.
 *
 * @param {number} [page=1] - The page number (1-based).
 * @returns {Promise<{ orders: any[]; total: number; totalPages: number }>}
 */
export async function getMyOrders(page: number = 1) {
  const session = await requireCustomer()
  return CustomerService.getMyOrders(session.user.id, session.user.email || "", page, 10)
}

/**
 * Changes the authenticated customer's password.
 *
 * @param {string} currentPassword - The current password.
 * @param {string} newPassword - The new password.
 * @returns {Promise<{ success: true } | { success: false; error: string }>}
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await requireCustomer()
  return CustomerService.changePassword(session.user.id, currentPassword, newPassword)
}
