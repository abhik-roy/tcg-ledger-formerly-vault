/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file order.repository.ts
 * @module repositories/order
 * @description
 *   Data access layer for the order module. All Prisma queries for the
 *   `Order` and `OrderItem` tables are consolidated here. This layer
 *   performs no business logic -- it returns raw database rows.
 *
 * @layer Repository
 * @dependencies prisma client
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export class OrderRepository {
  /**
   * Counts orders matching the given statuses.
   *
   * @param {string[]} statuses - Array of order statuses to count (e.g. ["PENDING", "PAID"]).
   * @returns {Promise<number>} The count of matching orders.
   */
  static async countByStatuses(statuses: string[]): Promise<number> {
    return prisma.order.count({
      where: { status: { in: statuses as any } },
    })
  }

  /**
   * Retrieves a paginated list of orders with their items.
   *
   * @param {number} skip - Number of rows to skip (pagination offset).
   * @param {number} take - Number of rows to return (page size).
   * @returns {Promise<{ orders: any[]; total: number }>} Orders with items and total count.
   */
  static async findManyPaginated(skip: number, take: number, where?: Prisma.OrderWhereInput) {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where }),
    ])

    return { orders, total }
  }

  /**
   * Finds a single order by its ID, optionally including items.
   *
   * @param {string} id - The order ID.
   * @param {boolean} [includeItems=false] - Whether to include order items.
   * @returns {Promise<any | null>} The order record or null.
   */
  static async findById(id: string, includeItems: boolean = false) {
    return prisma.order.findUnique({
      where: { id },
      ...(includeItems ? { include: { items: true } } : {}),
    })
  }

  /**
   * Updates an order's status and shipping information for fulfillment.
   *
   * @param {string} id - The order ID.
   * @param {object} data - The fields to update.
   * @returns {Promise<any>} The updated order record.
   */
  static async fulfillOrder(
    id: string,
    data: {
      status: string
      carrier: string
      trackingNumber: string | null
      shippedAt: Date
    }
  ) {
    return prisma.order.update({
      where: { id },
      data: data as any,
      include: { items: true },
    })
  }

  /**
   * Creates a new order with its items in a single query.
   *
   * @param {Prisma.OrderCreateInput} data - The order data including nested items.
   * @returns {Promise<any>} The created order record.
   */
  static async create(data: Prisma.OrderCreateInput) {
    return prisma.order.create({ data })
  }

  /**
   * Creates a new order within a transaction.
   *
   * @param {Prisma.TransactionClient} tx - The transaction client.
   * @param {Prisma.OrderCreateInput} data - The order data including nested items.
   * @returns {Promise<any>} The created order record.
   */
  static async createInTransaction(tx: Prisma.TransactionClient, data: Prisma.OrderCreateInput) {
    return tx.order.create({ data })
  }

  /**
   * Updates an order by ID.
   *
   * @param {string} id - The order ID.
   * @param {Prisma.OrderUpdateInput} data - The fields to update.
   * @returns {Promise<any>} The updated order record.
   */
  static async update(id: string, data: Prisma.OrderUpdateInput) {
    return prisma.order.update({ where: { id }, data })
  }

  /**
   * Updates an order within a transaction.
   *
   * @param {Prisma.TransactionClient} tx - The transaction client.
   * @param {string} id - The order ID.
   * @param {object} data - The fields to update.
   * @returns {Promise<any>} The updated order record.
   */
  static async updateInTransaction(tx: Prisma.TransactionClient, id: string, data: any) {
    return tx.order.update({ where: { id }, data })
  }

  /**
   * Batch-fetches orders within a date range for a set of customer emails.
   * Expands the range by 5 minutes on each side to capture edge cases.
   * Used for server-side ledger enrichment.
   *
   * @param {object} params - Search parameters.
   * @param {string[]} params.customerEmails - Customer emails to match.
   * @param {Date} params.startDate - Start of the date range.
   * @param {Date} params.endDate - End of the date range.
   * @returns {Promise<any[]>} Matching orders with their items.
   */
  static async findOrdersInRangeForCustomers(params: {
    customerEmails: string[]
    startDate: Date
    endDate: Date
  }) {
    const windowStart = new Date(params.startDate.getTime() - 5 * 60 * 1000)
    const windowEnd = new Date(params.endDate.getTime() + 5 * 60 * 1000)
    return prisma.order.findMany({
      where: {
        customerEmail: { in: params.customerEmails },
        createdAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            setName: true,
            condition: true,
            finish: true,
            price: true,
            quantity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  /**
   * Finds an order by customer email within a time window, containing a specific card.
   * Used to correlate ledger entries with their originating orders.
   *
   * @param {object} params - Search parameters.
   * @param {string} params.customerEmail - The customer's email address.
   * @param {Date} params.windowStart - Start of the time window.
   * @param {Date} params.windowEnd - End of the time window.
   * @param {string} params.cardName - The card name to match in order items.
   * @returns {Promise<any | null>} The matching order with items, or null.
   */
  static async findByCustomerAndTimeWindow(params: {
    customerEmail: string
    windowStart: Date
    windowEnd: Date
    cardName: string
  }) {
    return prisma.order.findFirst({
      where: {
        customerEmail: params.customerEmail,
        createdAt: { gte: params.windowStart, lte: params.windowEnd },
        items: {
          some: { name: { contains: params.cardName, mode: "insensitive" } },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            setName: true,
            condition: true,
            finish: true,
            price: true,
            quantity: true,
          },
        },
      },
    })
  }

  /**
   * Retrieves recent orders for the dashboard.
   *
   * @param {number} limit - Maximum number of orders to return.
   * @returns {Promise<any[]>} Recent orders with item counts.
   */
  static async findRecent(limit: number = 6) {
    return prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerEmail: true,
        totalAmount: true,
        status: true,
        fulfillment: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    })
  }

  /**
   * Aggregates total revenue from non-cancelled orders.
   *
   * @returns {Promise<{ _sum: { totalAmount: number | null } }>} Revenue aggregate.
   */
  static async aggregateRevenue() {
    return prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { not: "CANCELLED" } },
    })
  }

  /**
   * Groups orders by status and counts them.
   *
   * @returns {Promise<{ status: string; _count: { id: number } }[]>} Status counts.
   */
  static async groupByStatus() {
    return prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    })
  }

  /**
   * Retrieves orders within a date range for chart data.
   *
   * @param {Date} startDate - The start of the date range.
   * @returns {Promise<{ createdAt: Date; totalAmount: number }[]>} Orders with date and amount.
   */
  static async findForChart(startDate: Date) {
    return prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: "CANCELLED" },
      },
      select: { createdAt: true, totalAmount: true },
    })
  }

  /**
   * Groups order items by name/set and aggregates quantity and revenue.
   * Used for the "Top Sellers" dashboard widget.
   *
   * @param {number} limit - Maximum number of top sellers.
   * @returns {Promise<any[]>} Grouped order item aggregates.
   */
  static async getTopSellers(limit: number = 5) {
    return prisma.orderItem.groupBy({
      by: ["name", "setName"],
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    })
  }

  /**
   * Counts non-cancelled orders (for average order value calculation).
   *
   * @returns {Promise<number>} Total non-cancelled order count.
   */
  static async countNonCancelled() {
    return prisma.order.count({ where: { status: { not: "CANCELLED" } } })
  }

  /**
   * Finds an order by its Stripe checkout session ID.
   *
   * @param {string} sessionId - The Stripe checkout session ID.
   * @returns {Promise<any | null>} The order record or null.
   */
  static async findByStripeSessionId(sessionId: string) {
    return prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
    })
  }

  /**
   * Finds PENDING orders that were created more than `olderThanMinutes` ago.
   * Used by the stale-order cleanup utility.
   *
   * @param {number} olderThanMinutes - Age threshold in minutes.
   * @returns {Promise<{ id: string }[]>} Stale PENDING order IDs.
   */
  static async findStalePending(olderThanMinutes: number): Promise<{ id: string }[]> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000)
    return prisma.order.findMany({
      where: {
        status: "PENDING" as any,
        createdAt: { lt: cutoff },
      },
      select: { id: true },
    })
  }

  /**
   * Runs a Prisma interactive transaction.
   *
   * @param {Function} fn - The transaction callback.
   * @returns {Promise<T>} The transaction result.
   */
  static async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn)
  }
}
