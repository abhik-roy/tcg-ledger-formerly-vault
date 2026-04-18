/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file customer.service.ts
 * @module services/customer
 * @description
 *   Business logic layer for the customer module. Handles customer listing,
 *   order history retrieval, ledger correlation, and overview stats.
 *   All database access is delegated to CustomerRepository, OrderRepository,
 *   and LogRepository.
 *
 * @layer Service
 * @dependencies CustomerRepository, OrderRepository, LogRepository
 */

import { CustomerRepository } from "@/repositories/customer.repository"
import { OrderRepository } from "@/repositories/order.repository"
import { LogRepository } from "@/repositories/log.repository"
import type { CustomerWithStats, CustomerOverviewStats } from "@/lib/types"
import { toCustomerWithStatsDTOs } from "@/mappers/customer.mapper"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

export class CustomerService {
  /**
   * Retrieves a paginated list of customers with order counts and lifetime spend.
   *
   * @param {number} page - The page number.
   * @param {string} [query] - Optional search query (email, first name, last name).
   * @returns {Promise<{ data: CustomerWithStats[]; total: number; totalPages: number }>}
   */
  static async getPaginatedCustomers(
    page: number,
    query?: string
  ): Promise<{ data: CustomerWithStats[]; total: number; totalPages: number }> {
    const pageSize = 20

    const where: Prisma.CustomerWhereInput = {}
    if (query) {
      where.OR = [
        { email: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
      ]
    }

    const { rows, total } = await CustomerRepository.findManyPaginated({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const data: CustomerWithStats[] = toCustomerWithStatsDTOs(rows as any)

    return { data, total, totalPages: Math.ceil(total / pageSize) }
  }

  /**
   * Retrieves paginated orders for a specific customer (admin-facing).
   *
   * @param {string} customerId - The customer's internal ID.
   * @param {string} customerEmail - The customer's email address.
   * @param {number} [page=1] - Page number (1-based).
   * @param {number} [pageSize=20] - Items per page.
   * @returns {Promise<{ orders: any[]; total: number; hasMore: boolean }>}
   */
  static async getOrdersForCustomer(
    customerId: string,
    customerEmail: string,
    page: number = 1,
    pageSize: number = 20
  ) {
    const skip = (page - 1) * pageSize
    const { orders, total } = await CustomerRepository.findOrdersByCustomerPaginated(
      customerId,
      customerEmail,
      skip,
      pageSize
    )
    return { orders, total, hasMore: skip + orders.length < total }
  }

  /**
   * Finds ledger entries (quantity logs) related to a specific order item purchase.
   * Uses a +/-5 minute time window around the order creation time.
   *
   * @param {string} cardName - The card name to search for.
   * @param {string} customerEmail - The customer's email.
   * @param {Date} orderCreatedAt - When the order was created.
   * @returns {Promise<any[]>} Matching quantity log entries.
   */
  static async getLedgerEntriesForItem(
    cardName: string,
    customerEmail: string,
    orderCreatedAt: Date
  ) {
    const orderTime = new Date(orderCreatedAt).getTime()
    return LogRepository.findForCustomerOrderItem({
      cardName,
      customerEmail,
      windowStart: new Date(orderTime - 5 * 60 * 1000),
      windowEnd: new Date(orderTime + 5 * 60 * 1000),
    })
  }

  /**
   * Retrieves paginated orders for a customer (customer-facing).
   *
   * @param {string} customerId - The customer's ID.
   * @param {string} customerEmail - The customer's email.
   * @param {number} page - Page number (1-based).
   * @param {number} limit - Items per page.
   * @returns {Promise<{ orders: any[]; total: number; totalPages: number }>}
   */
  static async getMyOrders(
    customerId: string,
    customerEmail: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit
    const { orders, total } = await CustomerRepository.findOrdersByCustomerPaginated(
      customerId,
      customerEmail,
      skip,
      limit
    )
    return { orders, total, totalPages: Math.ceil(total / limit) }
  }

  /**
   * Changes a customer's password after verifying the current one.
   *
   * @param {string} customerId - The customer's ID.
   * @param {string} currentPassword - The current password (plaintext).
   * @param {string} newPassword - The new password (plaintext).
   * @returns {Promise<{ success: true } | { success: false; error: string }>}
   */
  static async changePassword(
    customerId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    const customer = await CustomerRepository.findById(customerId)
    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    const isValid = await bcrypt.compare(currentPassword, customer.password)
    if (!isValid) {
      return { success: false, error: "Current password is incorrect" }
    }

    // Validate new password strength (same rules as registration)
    if (newPassword.length < 8 || newPassword.length > 128) {
      return { success: false, error: "Password must be between 8 and 128 characters" }
    }
    if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return {
        success: false,
        error: "Password must contain at least one number or special character",
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await CustomerRepository.updatePassword(customerId, hashedPassword)
    return { success: true }
  }

  /**
   * Returns aggregate statistics for the customer overview section.
   *
   * @returns {Promise<CustomerOverviewStats>} Customer aggregate stats.
   */
  static async getOverviewStats(): Promise<CustomerOverviewStats> {
    const [totalCustomers, revenueAgg, totalOrders] = await Promise.all([
      CustomerRepository.count(),
      OrderRepository.aggregateRevenue(),
      OrderRepository.countNonCancelled(),
    ])

    const totalRevenue = revenueAgg._sum.totalAmount ?? 0
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

    return { totalCustomers, totalRevenue, avgOrderValue }
  }
}
