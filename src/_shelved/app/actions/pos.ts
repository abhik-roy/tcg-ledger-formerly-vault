/**
 * @file pos.ts
 * @module actions/pos
 * @description
 *   Server Action controller for the Point of Sale (POS) module. Thin wrappers
 *   around POSService for POS operations.
 *
 * @layer Controller
 * @dependencies POSService, requireStaff
 */

"use server"

import { requireStaff } from "@/lib/auth-guard"
import { POSService } from "@/services/pos.service"
import { revalidatePath } from "next/cache"

// Re-export for backwards compatibility
export type { POSInventoryItem } from "@/lib/types"

// Internal types still needed by the controller signature
type POSOrderItem = {
  inventoryId: number
  name: string
  setName: string
  condition: string
  finish: string
  price: number
  quantity: number
}

type CreatePOSOrderParams = {
  items: POSOrderItem[]
  customerEmail?: string
  paymentMethod: "CASH" | "CARD"
  amountPaid?: number
}

type CreatePOSOrderResult = {
  success: boolean
  orderId?: string
  change?: number
  error?: string
}

/**
 * Searches inventory for the POS interface.
 *
 * @param {string} query - The search query.
 * @returns {Promise<POSInventoryItem[]>} Matching POS inventory items.
 */
export async function searchPOSInventory(
  query: string
): Promise<import("@/lib/types").POSInventoryItem[]> {
  await requireStaff()
  return POSService.searchInventory(query)
}

/**
 * Creates a POS order with transactional stock management.
 *
 * @param {CreatePOSOrderParams} params - The POS order parameters.
 * @returns {Promise<CreatePOSOrderResult>} Result with orderId and optional change.
 */
export async function createPOSOrderAction(
  params: CreatePOSOrderParams
): Promise<CreatePOSOrderResult> {
  await requireStaff()

  try {
    const result = await POSService.createOrder(params)

    if (result.success) {
      revalidatePath("/admin/orders")
      revalidatePath("/admin/inventory")
    }

    return result
  } catch (error) {
    console.error("POS Order Error:", error)
    const message = error instanceof Error ? error.message : "Failed to create POS order"
    return { success: false, error: message }
  }
}

/**
 * Verifies a POS exit PIN.
 *
 * @param {string} pin - The PIN to verify.
 * @returns {Promise<{ valid: boolean }>} Whether the PIN is valid.
 */
export async function verifyPOSPinAction(pin: string): Promise<{ valid: boolean }> {
  await requireStaff()
  return POSService.verifyExitPin(pin)
}
