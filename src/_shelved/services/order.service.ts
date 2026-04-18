/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file order.service.ts
 * @module services/order
 * @description
 *   Business logic layer for the order module. Handles order listing,
 *   fulfillment, and Stripe webhook payment processing. All database
 *   access is delegated to OrderRepository, InventoryRepository, and
 *   LogRepository.
 *
 * @layer Service
 * @dependencies OrderRepository, InventoryRepository, LogRepository
 */

import { OrderRepository } from "@/repositories/order.repository"
import { InventoryRepository } from "@/repositories/inventory.repository"
import { LogRepository } from "@/repositories/log.repository"
import { EmailService } from "@/services/email.service"
import { FulfillmentType, Prisma } from "@prisma/client"
import type { OrderFilterParams, CheckoutCartItem } from "@/lib/types"

// Default stale-order window: orders PENDING for longer than this are eligible for cleanup.
const DEFAULT_STALE_MINUTES = 30

/** Parameters for creating an in-store (non-Stripe) checkout order. */
export interface CreateInStoreOrderParams {
  customerEmail: string
  customerId: string
  items: CheckoutCartItem[]
  fulfillment: "PICKUP" | "SHIPPING"
  taxRatePct: number
  shippingCost: number
  addressLine1?: string | null
  city?: string | null
  postalCode?: string | null
  idempotencyKey?: string | null
}

/** A single order item with server-verified price. */
export interface VerifiedOrderItem {
  name: string
  setName: string
  condition: string
  finish: string
  price: number
  quantity: number
}

/** Result returned from OrderService.createInStoreOrder */
export interface CreateInStoreOrderResult {
  orderId: string
  subtotal: number
  tax: number
  totalAmount: number
  createdAt: Date
  items: VerifiedOrderItem[]
}

export class OrderService {
  /**
   * Creates an in-store (non-Stripe) order within a single database transaction.
   * Validates stock, decrements inventory, logs quantity changes, and creates
   * the order with server-calculated totals.
   *
   * @param {CreateInStoreOrderParams} params - Order parameters (pre-validated by action).
   * @returns {Promise<CreateInStoreOrderResult>} The created order details.
   * @throws {Error} If any item has insufficient stock.
   */
  static async createInStoreOrder(
    params: CreateInStoreOrderParams
  ): Promise<CreateInStoreOrderResult> {
    const {
      customerEmail,
      customerId,
      items,
      fulfillment,
      taxRatePct,
      shippingCost,
      addressLine1,
      city,
      postalCode,
      idempotencyKey,
    } = params

    const result = await OrderRepository.transaction(async (tx) => {
      // Lock each inventory row with SELECT FOR UPDATE to prevent concurrent
      // checkouts from reading stale quantities (TOCTOU race condition fix, DEV-107).
      // This matches the Stripe checkout path which already uses row locking.
      const invMap = new Map<number, { id: number; quantity: number; name: string }>()

      for (const item of items) {
        const locked = await InventoryRepository.findAndLockForUpdate(tx, item.id)
        if (!locked || locked.quantity < item.cartQuantity) {
          throw new Error(`Insufficient stock for ${item.name || "item"}`)
        }
        invMap.set(item.id, locked)
      }

      // Fetch storeprice and finish for locked items (not returned by findAndLockForUpdate)
      const inventoryDetails = await tx.inventory.findMany({
        where: { id: { in: items.map((i) => i.id) } },
        select: { id: true, storeprice: true, finish: true },
      })
      const detailMap = new Map(inventoryDetails.map((r) => [r.id, r]))

      // Recalculate totals server-side from DB prices -- never trust client values
      const subtotal = items.reduce((sum, item) => {
        const detail = detailMap.get(item.id)!
        return sum + (detail.storeprice || 0) * item.cartQuantity
      }, 0)
      const tax = Math.round((subtotal * taxRatePct) / 100)
      const totalAmount = subtotal + tax + shippingCost

      const now = new Date()
      for (const item of items) {
        const locked = invMap.get(item.id)!
        const detail = detailMap.get(item.id)!

        // Decrement the physical stock
        await tx.inventory.update({
          where: { id: item.id },
          data: { quantity: { decrement: item.cartQuantity } },
        })

        // Log the change in the Ledger
        await tx.quantityLog.create({
          data: {
            cardname: locked.name,
            amount: -item.cartQuantity,
            user: `CUSTOMER: ${customerEmail}`,
            time: now,
            finish: detail.finish || "nonfoil",
          },
        })
      }

      // Create the Order with server-calculated totals
      const order = await tx.order.create({
        data: {
          customerEmail,
          customerId,
          subtotal,
          tax,
          totalAmount,
          status: "PENDING",
          fulfillment: fulfillment as FulfillmentType,
          paymentMethod: fulfillment === "SHIPPING" ? "CREDIT_CARD" : "PAY_IN_STORE",
          ...(idempotencyKey && { idempotencyKey }),
          ...(fulfillment === "SHIPPING" && {
            addressLine1: addressLine1 || null,
            city: city || null,
            postalCode: postalCode || null,
          }),
          items: {
            create: items.map((item: CheckoutCartItem) => ({
              inventoryId: item.id,
              name: item.name || item.cardName || "",
              setName: item.setname || item.setName || "",
              condition: item.condition || "NM",
              finish: item.finish || "nonfoil",
              price: detailMap.get(item.id)!.storeprice || 0, // always use DB price
              quantity: item.cartQuantity,
            })),
          },
        },
      })

      const verifiedItems: VerifiedOrderItem[] = items.map((item) => {
        const detail = detailMap.get(item.id)!
        return {
          name: item.name || item.cardName || "",
          setName: item.setname || item.setName || "",
          condition: item.condition || "NM",
          finish: item.finish || "nonfoil",
          price: detail.storeprice || 0,
          quantity: item.cartQuantity,
        }
      })

      return { orderId: order.id, subtotal, tax, totalAmount, createdAt: now, items: verifiedItems }
    })

    return result
  }

  /**
   * Returns the count of orders in PENDING or PAID status.
   * Used for the badge on the admin orders navigation item.
   *
   * @returns {Promise<number>} Count of pending/paid orders.
   */
  static async getPendingOrderCount(): Promise<number> {
    return OrderRepository.countByStatuses(["PENDING", "PAID"])
  }

  /**
   * Retrieves a paginated list of admin orders with their items.
   *
   * @param {number} [page=1] - The page number.
   * @param {number} [limit=10] - Items per page.
   * @param {OrderFilterParams} [filters] - Optional filter parameters (search, date range, fulfillment, paymentMethod).
   * @returns {Promise<{ orders: any[]; total: number; totalPages: number }>}
   */
  static async getAdminOrders(page: number = 1, limit: number = 10, filters?: OrderFilterParams) {
    const skip = (page - 1) * limit

    const where: Prisma.OrderWhereInput = {}

    if (filters?.search) {
      where.OR = [
        { id: { startsWith: filters.search, mode: "insensitive" } },
        { customerEmail: { contains: filters.search, mode: "insensitive" } },
      ]
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {}
      if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo) {
        const end = new Date(filters.dateTo)
        end.setHours(23, 59, 59, 999)
        createdAt.lte = end
      }
      where.createdAt = createdAt
    }

    if (filters?.fulfillment) {
      where.fulfillment = filters.fulfillment
    }

    if (filters?.paymentMethod === "STRIPE") {
      where.paymentMethod = "CREDIT_CARD"
    } else if (filters?.paymentMethod === "IN_STORE") {
      where.paymentMethod = { in: ["PAY_IN_STORE", "CASH", "CARD"] }
    }

    const { orders, total } = await OrderRepository.findManyPaginated(skip, limit, where)
    return { orders, total, totalPages: Math.ceil(total / limit) }
  }

  /**
   * Marks an order as fulfilled (shipped).
   * Updates status to COMPLETED with shipping details.
   *
   * @param {string} orderId - The order ID.
   * @param {string} [trackingNumber] - Optional tracking number.
   * @param {string} [carrier="USPS"] - Shipping carrier.
   * @returns {Promise<{ success: boolean; error?: string }>}
   */
  static async fulfillOrder(
    orderId: string,
    trackingNumber?: string,
    carrier: string = "USPS"
  ): Promise<{ success: boolean; error?: string }> {
    // Single update+fetch: OrderRepository.fulfillOrder now includes items
    // so no separate findUnique is needed (DEV-72)
    const order = await OrderRepository.fulfillOrder(orderId, {
      status: "COMPLETED",
      carrier: carrier || "USPS",
      trackingNumber: trackingNumber || null,
      shippedAt: new Date(),
    })

    // Fire-and-forget fulfillment notification
    try {
      if (order?.customerEmail) {
        EmailService.sendFulfillmentNotification(
          {
            id: order.id,
            customerEmail: order.customerEmail,
            fulfillment: order.fulfillment,
            trackingNumber: order.trackingNumber,
            carrier: order.carrier,
            items: order.items.map((item) => ({
              name: item.name,
              setName: item.setName || "",
              condition: item.condition || "",
              finish: item.finish || "nonfoil",
              price: item.price,
              quantity: item.quantity,
            })),
            totalAmount: order.totalAmount,
            addressLine1: order.addressLine1,
            city: order.city,
            state: order.state,
            postalCode: order.postalCode,
          },
          "TCG Vault",
          process.env.ADMIN_EMAIL
        ).catch((err) => console.error("Fulfillment email failed:", err))
      }
    } catch (err) {
      console.error("Failed to fetch order for fulfillment email:", err)
    }

    return { success: true }
  }

  /**
   * Marks multiple orders as fulfilled in sequence.
   * Each order is fulfilled independently; failures do not block remaining orders.
   *
   * @param {string[]} orderIds - Array of order IDs to fulfill.
   * @returns {Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }>}
   */
  static async bulkFulfillOrders(
    orderIds: string[]
  ): Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }> {
    // Process in batches of 5 to stay within Prisma's default connection pool (~5 connections).
    // Promise.allSettled ensures individual failures don't abort the remaining batch.
    const BATCH_SIZE = 5
    const succeeded: string[] = []
    const failed: Array<{ id: string; error: string }> = []

    for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
      const batch = orderIds.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map((id) => OrderService.fulfillOrder(id)))

      results.forEach((result, j) => {
        const id = batch[j]
        if (result.status === "fulfilled" && result.value.success) {
          succeeded.push(id)
        } else {
          const error =
            result.status === "rejected"
              ? result.reason instanceof Error
                ? result.reason.message
                : "Unknown error"
              : result.value.error || "Unknown error"
          failed.push({ id, error })
        }
      })
    }

    return { succeeded, failed }
  }

  /**
   * Processes a completed Stripe payment. Called by the Stripe webhook handler.
   * Stock was already reserved (decremented) at session creation, so this method
   * only updates the order status to PAID with final Stripe amounts and sends
   * the confirmation email.
   * This method is idempotent -- it skips already-processed orders.
   *
   * @param {string} orderId - The order ID from Stripe metadata.
   * @param {object} session - The Stripe checkout session data.
   * @param {number | null} session.amount_total - Total amount charged.
   * @param {number | null} session.amount_subtotal - Subtotal before tax/shipping.
   * @returns {Promise<void>}
   */
  static async processStripePayment(
    orderId: string,
    session: {
      amount_total: number | null
      amount_subtotal: number | null
    }
  ): Promise<void> {
    const order = (await OrderRepository.findById(orderId, true)) as any

    if (!order) {
      console.error(`Order ${orderId} not found in database`)
      return
    }

    // Idempotency: skip if already processed
    if (order.status === "PAID" || order.status === "COMPLETED") {
      console.warn(`Order ${orderId} already processed, skipping`)
      return
    }

    // Stock was already decremented and logged at session creation.
    // Only update the order status and final amounts.
    await OrderRepository.transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          totalAmount: session.amount_total || order.totalAmount,
          tax: (session.amount_total || 0) - (session.amount_subtotal || 0),
        },
      })
    })

    // Send order confirmation email (idempotency: skip if already sent)
    if (!order.emailConfirmationSent) {
      const updatedOrder = {
        ...order,
        totalAmount: session.amount_total || order.totalAmount,
        tax: (session.amount_total || 0) - (session.amount_subtotal || 0),
      }
      await EmailService.sendOrderConfirmation(updatedOrder)
      await OrderRepository.update(orderId, { emailConfirmationSent: true })
    }
  }

  /**
   * Handles a Stripe `checkout.session.expired` or `checkout.session.async_payment_failed` event.
   * Restores reserved inventory and cancels the PENDING order.
   * Idempotent: no-ops if the order is already PAID, COMPLETED, or CANCELLED.
   * Race-safe: uses an atomic `updateMany` inside the transaction so that if a concurrent
   * caller (e.g. the admin cleanup job) wins the lock, inventory is not restored twice.
   *
   * @param {string} orderId - The order ID from Stripe session metadata.
   * @returns {Promise<void>}
   */
  static async handleExpiredSession(orderId: string): Promise<void> {
    const order = (await OrderRepository.findById(orderId, true)) as any

    if (!order) {
      console.error(`Expired session: order ${orderId} not found`)
      return
    }

    // Fast path: skip if order is already in a terminal/confirmed state.
    if (order.status !== "PENDING") {
      console.warn(`Expired session: order ${orderId} is ${order.status}, skipping restore`)
      return
    }

    await OrderRepository.transaction(async (tx) => {
      // Atomic guard: claim cancellation for this order.
      // If a concurrent process already cancelled it, count will be 0 — skip inventory restore.
      const result = await tx.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "CANCELLED" },
      })

      if (result.count === 0) {
        console.warn(
          `Expired session: order ${orderId} was already processed concurrently, skipping`
        )
        return
      }

      // Restore inventory and log for each item
      for (const item of order.items) {
        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { quantity: { increment: item.quantity } },
        })

        await LogRepository.createQuantityLogInTransaction(tx, {
          cardname: item.name,
          amount: item.quantity, // positive: restoring reserved stock
          user: `STRIPE_EXPIRED: ${order.customerEmail}`,
          finish: item.finish || "nonfoil",
        })
      }
    })
  }

  /**
   * Cancels an order (admin-initiated). Restores reserved inventory,
   * logs the restoration, and sends a cancellation email.
   * Only PENDING and PAID orders can be cancelled.
   *
   * @param {string} orderId - The order ID.
   * @param {string} [reason="Cancelled by admin"] - The cancellation reason.
   * @returns {Promise<{ success: boolean; error?: string }>}
   */
  static async cancelOrder(
    orderId: string,
    reason: string = "Cancelled by admin"
  ): Promise<{ success: boolean; error?: string }> {
    const order = (await OrderRepository.findById(orderId, true)) as any

    if (!order) {
      return { success: false, error: "Order not found" }
    }

    if (order.status === "CANCELLED" || order.status === "COMPLETED") {
      return { success: false, error: "Order cannot be cancelled" }
    }

    let didCancel = false

    await OrderRepository.transaction(async (tx) => {
      // Atomic guard: only cancel if still in a cancellable state
      const result = await tx.order.updateMany({
        where: { id: orderId, status: { in: ["PENDING", "PAID"] } },
        data: { status: "CANCELLED" },
      })

      if (result.count === 0) {
        console.warn(`cancelOrder: order ${orderId} was already processed concurrently, skipping`)
        return
      }

      didCancel = true

      // Restore inventory and log for each item
      for (const item of order.items) {
        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { quantity: { increment: item.quantity } },
        })

        await LogRepository.createQuantityLogInTransaction(tx, {
          cardname: item.name,
          amount: item.quantity,
          user: `CANCELLED_BY_ADMIN: ${reason}`,
          finish: item.finish || "nonfoil",
        })
      }
    })

    // Only send email if this caller won the cancellation lock
    if (didCancel) {
      EmailService.sendOrderCancellation(order, reason).catch((err) =>
        console.error(`Failed to send cancellation email for order ${orderId}:`, err)
      )
    }

    return { success: true }
  }

  /**
   * Handles a Stripe refund event. For full refunds, restores inventory
   * and cancels the order. Partial refunds are logged but no inventory action is taken.
   *
   * @param {string} orderId - The order ID.
   * @param {boolean} isFullRefund - Whether this is a full refund.
   * @returns {Promise<void>}
   */
  static async handleStripeRefund(orderId: string, isFullRefund: boolean): Promise<void> {
    if (!isFullRefund) {
      console.warn(`Partial refund for order ${orderId}, no inventory action taken`)
      return
    }

    const order = (await OrderRepository.findById(orderId, true)) as any

    if (!order || order.status === "CANCELLED") {
      return
    }

    if (order.status !== "PAID" && order.status !== "COMPLETED") {
      console.warn(`handleStripeRefund: order ${orderId} is ${order.status}, skipping`)
      return
    }

    let didCancel = false

    await OrderRepository.transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id: orderId, status: { in: ["PAID", "COMPLETED"] } },
        data: { status: "CANCELLED" },
      })

      if (result.count === 0) {
        return
      }

      didCancel = true

      for (const item of order.items) {
        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { quantity: { increment: item.quantity } },
        })

        await LogRepository.createQuantityLogInTransaction(tx, {
          cardname: item.name,
          amount: item.quantity,
          user: `REFUNDED_BY_STRIPE: ${order.customerEmail}`,
          finish: item.finish || "nonfoil",
        })
      }
    })

    // Only send email if this caller won the cancellation lock
    if (didCancel) {
      EmailService.sendOrderCancellation(order, "Your payment has been refunded").catch((err) =>
        console.error(`Failed to send refund cancellation email for order ${orderId}:`, err)
      )
    }
  }

  /**
   * Cancels all PENDING orders that have been open longer than `olderThanMinutes`.
   * For each stale order, restores reserved inventory and logs the restoration
   * (delegates to `handleExpiredSession` for consistent idempotent, race-safe cleanup).
   * Orders that fail to cancel are skipped with an error log; processing continues.
   *
   * @param {number} [olderThanMinutes=30] - Age threshold in minutes.
   * @returns {Promise<number>} Count of successfully cancelled orders.
   */
  static async cancelStalePendingOrders(
    olderThanMinutes: number = DEFAULT_STALE_MINUTES
  ): Promise<number> {
    const staleOrders = await OrderRepository.findStalePending(olderThanMinutes)
    let cancelled = 0

    for (const order of staleOrders) {
      try {
        await OrderService.handleExpiredSession(order.id)
        cancelled++
      } catch (error) {
        console.error(`Failed to cancel stale order ${order.id}:`, error)
      }
    }

    return cancelled
  }
}
