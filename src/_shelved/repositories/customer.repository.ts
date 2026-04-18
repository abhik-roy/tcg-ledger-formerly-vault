/**
 * @file customer.repository.ts
 * @module repositories/customer
 * @description
 *   Data access layer for the customer module. All Prisma queries for the
 *   `Customer` table (and related order aggregates) are consolidated here.
 *
 * @layer Repository
 * @dependencies prisma client
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export class CustomerRepository {
  /**
   * Retrieves a paginated list of customers with order counts and order totals.
   *
   * @param {object} params - Query parameters.
   * @param {Prisma.CustomerWhereInput} params.where - Prisma where filter.
   * @param {number} params.skip - Pagination offset.
   * @param {number} params.take - Page size.
   * @returns {Promise<{ rows: any[]; total: number }>} Customer rows and total count.
   */
  static async findManyPaginated(params: {
    where: Prisma.CustomerWhereInput
    skip: number
    take: number
  }) {
    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where: params.where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { orders: true } },
        },
      }),
      prisma.customer.count({ where: params.where }),
    ])

    // DEV-46: Use groupBy aggregate instead of loading all order rows per customer.
    // Previously we included `orders: { select: { totalAmount: true } }` which
    // loaded every order row for every customer on the page (N-query problem).
    const customerIds = rows.map((r) => r.id)
    let spendMap = new Map<string, number>()

    if (customerIds.length > 0) {
      const spendAgg = await prisma.order.groupBy({
        by: ["customerId"],
        where: { customerId: { in: customerIds } },
        _sum: { totalAmount: true },
      })
      spendMap = new Map(spendAgg.map((a) => [a.customerId as string, a._sum.totalAmount ?? 0]))
    }

    const enrichedRows = rows.map((r) => ({
      ...r,
      lifetimeSpend: spendMap.get(r.id) ?? 0,
    }))

    return { rows: enrichedRows, total }
  }

  /**
   * Finds all orders for a customer by customer ID or email.
   *
   * @param {string} customerId - The customer's internal ID.
   * @param {string} customerEmail - The customer's email address.
   * @returns {Promise<any[]>} Orders with items, ordered by creation date descending.
   */
  static async findOrdersByCustomer(customerId: string, customerEmail: string) {
    return prisma.order.findMany({
      where: { OR: [{ customerId }, { customerEmail }] },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    })
  }

  /**
   * Returns the total number of customers.
   *
   * @returns {Promise<number>} Total customer count.
   */
  static async count() {
    return prisma.customer.count()
  }

  /**
   * Finds a customer by email.
   *
   * @param {string} email - The customer's email.
   * @returns {Promise<any | null>} The customer record or null.
   */
  static async findByEmail(email: string) {
    return prisma.customer.findUnique({ where: { email } })
  }

  /**
   * Finds multiple customers by email, returning a Map of email → id.
   * Used for bulk enrichment of ledger entries with customer IDs.
   *
   * @param {string[]} emails - List of customer emails.
   * @returns {Promise<Map<string, string>>} Map from email to customer ID.
   */
  static async findIdsByEmails(emails: string[]): Promise<Map<string, string>> {
    const customers = await prisma.customer.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    })
    return new Map(customers.map((c) => [c.email, c.id]))
  }

  /**
   * Creates a new customer.
   *
   * @param {object} data - The customer data.
   * @returns {Promise<any>} The created customer record.
   */
  static async create(data: {
    email: string
    password: string
    firstName: string | null
    lastName: string | null
  }) {
    return prisma.customer.create({ data })
  }

  /**
   * Finds paginated orders for a customer by ID or email, with total count.
   *
   * @param {string} customerId - The customer's internal ID.
   * @param {string} customerEmail - The customer's email address.
   * @param {number} skip - Pagination offset.
   * @param {number} take - Page size.
   * @returns {Promise<{ orders: any[]; total: number }>}
   */
  static async findOrdersByCustomerPaginated(
    customerId: string,
    customerEmail: string,
    skip: number,
    take: number
  ) {
    const where: Prisma.OrderWhereInput = {
      OR: [{ customerId }, { customerEmail }],
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ])

    return { orders, total }
  }

  /**
   * Finds a customer by ID (for password changes).
   *
   * @param {string} id - The customer's ID.
   * @returns {Promise<any | null>} The customer record or null.
   */
  static async findById(id: string) {
    return prisma.customer.findUnique({ where: { id } })
  }

  /**
   * Updates a customer's password.
   *
   * @param {string} id - The customer's ID.
   * @param {string} hashedPassword - The new bcrypt-hashed password.
   * @returns {Promise<any>} The updated customer record.
   */
  static async updatePassword(id: string, hashedPassword: string) {
    return prisma.customer.update({
      where: { id },
      data: { password: hashedPassword },
    })
  }
}
