/**
 * @file order.mapper.ts
 * @module mappers/order
 * @description
 *   Pure mapping functions that convert raw database rows (as returned by
 *   OrderRepository) into strongly-typed order DTOs consumed by the service
 *   and controller layers. No I/O, no side effects, no business logic.
 *
 * @layer Mapper
 */

import type {
  AdminOrderDTO,
  OrderItemDTO,
  RecentOrderDTO,
  TopSellerDTO,
  LedgerOrderDetailDTO,
} from "@/lib/dtos"

// ---------------------------------------------------------------------------
// OrderItem
// ---------------------------------------------------------------------------

/**
 * Raw order item shape as returned by Prisma includes.
 */
export type OrderItemRow = {
  id: string
  inventoryId: number
  name: string
  setName: string
  condition: string
  finish: string
  price: number
  quantity: number
}

/**
 * Maps a raw Prisma order item row to an OrderItemDTO.
 *
 * @param {OrderItemRow} row - Raw order item from Prisma include.
 * @returns {OrderItemDTO} The shaped DTO.
 */
export function toOrderItemDTO(row: OrderItemRow): OrderItemDTO {
  return {
    id: row.id,
    inventoryId: row.inventoryId,
    name: row.name,
    setName: row.setName,
    condition: row.condition,
    finish: row.finish,
    price: row.price,
    quantity: row.quantity,
  }
}

// ---------------------------------------------------------------------------
// AdminOrder
// ---------------------------------------------------------------------------

/**
 * Raw order shape as returned by Prisma with items included.
 */
export type AdminOrderRow = {
  id: string
  customerEmail: string
  subtotal: number
  tax: number
  shippingCost: number
  totalAmount: number
  status: string
  fulfillment: string
  paymentMethod: string
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  createdAt: Date
  updatedAt: Date
  carrier: string | null
  shippedAt: Date | null
  trackingNumber: string | null
  stripeSessionId: string | null
  customerId: string | null
  items: OrderItemRow[]
}

/**
 * Maps a raw Prisma order row (with items included) to an AdminOrderDTO.
 *
 * @param {AdminOrderRow} row - Raw order from OrderRepository.findManyPaginated.
 * @returns {AdminOrderDTO} The shaped DTO.
 */
export function toAdminOrderDTO(row: AdminOrderRow): AdminOrderDTO {
  return {
    id: row.id,
    customerEmail: row.customerEmail,
    subtotal: row.subtotal,
    tax: row.tax,
    shippingCost: row.shippingCost,
    totalAmount: row.totalAmount,
    status: row.status,
    fulfillment: row.fulfillment,
    paymentMethod: row.paymentMethod,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    carrier: row.carrier,
    shippedAt: row.shippedAt,
    trackingNumber: row.trackingNumber,
    stripeSessionId: row.stripeSessionId,
    customerId: row.customerId,
    items: row.items.map(toOrderItemDTO),
  }
}

/**
 * Maps an array of raw order rows to AdminOrderDTOs.
 *
 * @param {AdminOrderRow[]} rows - Raw orders from OrderRepository.
 * @returns {AdminOrderDTO[]} Mapped DTOs.
 */
export function toAdminOrderDTOs(rows: AdminOrderRow[]): AdminOrderDTO[] {
  return rows.map(toAdminOrderDTO)
}

// ---------------------------------------------------------------------------
// RecentOrder (dashboard widget)
// ---------------------------------------------------------------------------

/**
 * Raw shape returned by OrderRepository.findRecent.
 */
export type RecentOrderRow = {
  id: string
  customerEmail: string
  totalAmount: number
  status: string
  fulfillment: string
  createdAt: Date
  _count: { items: number }
}

/**
 * Maps a raw recent-order row to a RecentOrderDTO.
 *
 * @param {RecentOrderRow} row - Raw row from OrderRepository.findRecent.
 * @returns {RecentOrderDTO} The shaped DTO.
 */
export function toRecentOrderDTO(row: RecentOrderRow): RecentOrderDTO {
  return {
    id: row.id,
    customerEmail: row.customerEmail,
    totalAmount: row.totalAmount,
    status: row.status,
    fulfillment: row.fulfillment,
    createdAt: row.createdAt,
    itemCount: row._count.items,
  }
}

/**
 * Maps an array of raw recent order rows to RecentOrderDTOs.
 *
 * @param {RecentOrderRow[]} rows - Raw rows from OrderRepository.findRecent.
 * @returns {RecentOrderDTO[]} Mapped DTOs.
 */
export function toRecentOrderDTOs(rows: RecentOrderRow[]): RecentOrderDTO[] {
  return rows.map(toRecentOrderDTO)
}

// ---------------------------------------------------------------------------
// TopSeller (dashboard widget)
// ---------------------------------------------------------------------------

/**
 * Raw shape returned by OrderRepository.getTopSellers (Prisma groupBy).
 */
export type TopSellerRow = {
  name: string
  setName: string
  _sum: { quantity: number | null; price: number | null }
}

/**
 * Maps a raw top-seller groupBy row to a TopSellerDTO.
 *
 * @param {TopSellerRow} row - Raw row from OrderRepository.getTopSellers.
 * @returns {TopSellerDTO} The shaped DTO.
 */
export function toTopSellerDTO(row: TopSellerRow): TopSellerDTO {
  return {
    name: row.name,
    setName: row.setName,
    totalSold: row._sum.quantity ?? 0,
    revenue: row._sum.price ?? 0,
  }
}

/**
 * Maps an array of raw top-seller rows to TopSellerDTOs.
 *
 * @param {TopSellerRow[]} rows - Raw rows from OrderRepository.getTopSellers.
 * @returns {TopSellerDTO[]} Mapped DTOs.
 */
export function toTopSellerDTOs(rows: TopSellerRow[]): TopSellerDTO[] {
  return rows.map(toTopSellerDTO)
}

// ---------------------------------------------------------------------------
// LedgerOrderDetail (customer drill-down)
// ---------------------------------------------------------------------------

/**
 * Maps a raw Prisma order (with items) to a LedgerOrderDetailDTO.
 * Used in the customer order history / ledger drill-down view.
 *
 * @param {AdminOrderRow} row - Raw order row from OrderRepository.
 * @returns {LedgerOrderDetailDTO} The shaped DTO.
 */
export function toLedgerOrderDetailDTO(row: AdminOrderRow): LedgerOrderDetailDTO {
  return {
    id: row.id,
    customerEmail: row.customerEmail,
    totalAmount: row.totalAmount,
    status: row.status,
    paymentMethod: row.paymentMethod,
    fulfillment: row.fulfillment,
    createdAt: row.createdAt,
    items: row.items.map(toOrderItemDTO),
  }
}
