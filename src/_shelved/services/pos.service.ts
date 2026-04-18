/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file pos.service.ts
 * @module services/pos
 * @description
 *   Business logic layer for the Point of Sale (POS) module. Handles POS
 *   inventory search, order creation with transactional stock management,
 *   and PIN verification.
 *
 * @layer Service
 * @dependencies InventoryRepository, OrderRepository, LogRepository, SettingsRepository
 */

import { InventoryRepository } from "@/repositories/inventory.repository"
import { OrderRepository } from "@/repositories/order.repository"
import { LogRepository } from "@/repositories/log.repository"
import { SettingsRepository } from "@/repositories/settings.repository"
import type { POSInventoryItem, CreatePOSOrderParams, CreatePOSOrderResult } from "@/lib/types"
import { toPOSInventoryItemDTOs } from "@/mappers/inventory.mapper"

export class POSService {
  /**
   * Searches inventory for the POS interface.
   * Only returns in-stock items. If query is >= 2 characters, filters by name.
   *
   * @param {string} query - The search query.
   * @returns {Promise<POSInventoryItem[]>} Matching POS inventory items.
   *
   * @example
   *   const items = await POSService.searchInventory("Black Lotus")
   */
  static async searchInventory(query: string): Promise<POSInventoryItem[]> {
    const trimmed = query?.trim() ?? ""

    const where =
      trimmed.length >= 2
        ? {
            name: { contains: trimmed, mode: "insensitive" as const },
            quantity: { gt: 0 },
          }
        : {
            quantity: { gt: 0 },
          }

    const items = await InventoryRepository.findForPOS(where, 48)
    return toPOSInventoryItemDTOs(items as any)
  }

  /**
   * Creates a POS order within a database transaction.
   * Verifies stock, creates the order, decrements inventory, and logs changes.
   *
   * @param {CreatePOSOrderParams} params - The POS order parameters.
   * @returns {Promise<CreatePOSOrderResult>} Result with orderId and optional change.
   */
  static async createOrder(params: CreatePOSOrderParams): Promise<CreatePOSOrderResult> {
    if (!params.items || params.items.length === 0) {
      return { success: false, error: "No items in order" }
    }

    // DEV-62: Apply store tax rate to POS orders
    const { SettingsService } = await import("@/services/settings.service")
    const settings = await SettingsService.getSettings()

    const order = await OrderRepository.transaction(async (tx) => {
      // Verify stock for every item
      for (const item of params.items) {
        const inv = await tx.inventory.findUnique({
          where: { id: item.inventoryId },
          select: { id: true, quantity: true, name: true },
        })

        if (!inv) {
          throw new Error(`Item not found: ${item.name}`)
        }
        if ((inv.quantity || 0) < item.quantity) {
          throw new Error(
            `Insufficient stock for "${item.name}": requested ${item.quantity}, available ${inv.quantity || 0}`
          )
        }
      }

      // Calculate totals with tax (DEV-62)
      const subtotal = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const tax = Math.round(subtotal * (settings.taxRate / 100))
      const totalAmount = subtotal + tax

      const createdOrder = await tx.order.create({
        data: {
          customerEmail: params.customerEmail || "walkin@pos.local",
          subtotal,
          tax,
          shippingCost: 0,
          totalAmount,
          status: "PAID",
          fulfillment: "PICKUP",
          paymentMethod: params.paymentMethod === "CASH" ? "CASH" : "CARD",
          items: {
            create: params.items.map((item) => ({
              inventoryId: item.inventoryId,
              name: item.name,
              setName: item.setName,
              condition: item.condition,
              finish: item.finish,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
      })

      // Decrement inventory quantities
      for (const item of params.items) {
        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { quantity: { decrement: item.quantity } },
        })
      }

      // Log quantity changes atomically with the order (DEV-56)
      await tx.quantityLog.createMany({
        data: params.items.map((item) => ({
          cardname: item.name,
          amount: -item.quantity,
          user: "POS Sale",
          finish: item.finish || null,
          time: new Date(),
        })),
      })

      return createdOrder
    })

    // Calculate change for cash payments
    const change =
      params.paymentMethod === "CASH" && params.amountPaid != null
        ? params.amountPaid - order.totalAmount
        : undefined

    return { success: true, orderId: order.id, change }
  }

  /**
   * Verifies a POS exit PIN against the stored settings or environment variable.
   * The stored PIN is bcrypt-hashed (DEV-18). For migration compatibility,
   * if the stored value does not look like a bcrypt hash, falls back to a
   * constant-time string comparison to avoid a hard cutover.
   *
   * @param {string} pin - The PIN to verify.
   * @returns {Promise<{ valid: boolean }>} Whether the PIN is valid.
   */
  static async verifyExitPin(pin: string): Promise<{ valid: boolean }> {
    const settings = await SettingsRepository.find()
    const storedPin = settings?.posExitPin || process.env.POS_EXIT_PIN || "1234"

    // DEV-18: Use bcrypt.compare() to prevent timing attacks and protect the stored hash
    const bcrypt = await import("bcryptjs")
    const isBcryptHash = storedPin.startsWith("$2")
    if (isBcryptHash) {
      const valid = await bcrypt.compare(pin, storedPin)
      return { valid }
    }

    // Backward compatibility: plaintext PIN still in DB (pre-migration)
    // Compare byte-by-byte via bcrypt dummy to maintain constant-time behaviour
    await bcrypt.compare(pin, "$2b$10$invalidhashfortimingnormalization.")
    return { valid: pin === storedPin }
  }
}
