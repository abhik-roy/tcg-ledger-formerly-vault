/**
 * @file customer.mapper.ts
 * @module mappers/customer
 * @description
 *   Pure mapping functions that convert raw database rows (as returned by
 *   CustomerRepository) into strongly-typed customer DTOs consumed by the
 *   service and controller layers. No I/O, no side effects, no business logic.
 *
 * @layer Mapper
 */

import type { CustomerWithStatsDTO, CustomerOverviewStatsDTO } from "@/lib/dtos"

// ---------------------------------------------------------------------------
// Customer with stats
// ---------------------------------------------------------------------------

/**
 * Raw customer shape as returned by CustomerRepository.findManyPaginated.
 * Includes Prisma relation counts and pre-computed lifetime spend from
 * a groupBy aggregate (DEV-46).
 */
export type CustomerRow = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: Date
  _count: { orders: number }
  lifetimeSpend: number
}

/**
 * Maps a raw customer row (with pre-computed lifetime spend) to a CustomerWithStatsDTO.
 *
 * @param {CustomerRow} row - Raw customer row from CustomerRepository.findManyPaginated.
 * @returns {CustomerWithStatsDTO} The shaped DTO.
 */
export function toCustomerWithStatsDTO(row: CustomerRow): CustomerWithStatsDTO {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    createdAt: row.createdAt,
    orderCount: row._count.orders,
    lifetimeSpend: row.lifetimeSpend,
  }
}

/**
 * Maps an array of raw customer rows to CustomerWithStatsDTOs.
 *
 * @param {CustomerRow[]} rows - Raw rows from CustomerRepository.findManyPaginated.
 * @returns {CustomerWithStatsDTO[]} Mapped DTOs.
 */
export function toCustomerWithStatsDTOs(rows: CustomerRow[]): CustomerWithStatsDTO[] {
  return rows.map(toCustomerWithStatsDTO)
}

// ---------------------------------------------------------------------------
// Customer overview stats
// ---------------------------------------------------------------------------

/**
 * Maps raw aggregate values to a CustomerOverviewStatsDTO.
 *
 * @param {object} raw - The raw aggregated values.
 * @param {number} raw.totalCustomers - Total number of registered customers.
 * @param {number} raw.totalRevenue - Sum of all non-cancelled order totals (cents).
 * @param {number} raw.totalOrders - Total count of non-cancelled orders.
 * @returns {CustomerOverviewStatsDTO} The shaped stats DTO.
 */
export function toCustomerOverviewStatsDTO(raw: {
  totalCustomers: number
  totalRevenue: number
  totalOrders: number
}): CustomerOverviewStatsDTO {
  return {
    totalCustomers: raw.totalCustomers,
    totalRevenue: raw.totalRevenue,
    avgOrderValue: raw.totalOrders > 0 ? Math.round(raw.totalRevenue / raw.totalOrders) : 0,
  }
}
