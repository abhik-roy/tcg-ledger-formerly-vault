/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file stripe.ts
 * @module actions/stripe
 * @description
 *   Server Action controller for the Stripe payment module. Thin wrappers
 *   around StripeService for checkout session creation and order verification.
 *
 * @layer Controller
 * @dependencies StripeService, auth
 */

"use server"

import { z } from "zod"
import { StripeService } from "@/services/stripe.service"
import { auth } from "@/lib/auth"
import { CartItem } from "@/context/cart-context"

// ---------------------------------------------------------------------------
// Input schema (DEV-110)
// ---------------------------------------------------------------------------

const StripeCheckoutItemSchema = z.object({
  id: z.number().int().positive("Item ID must be a positive integer"),
  cartQuantity: z
    .number()
    .int()
    .min(1, "Cart quantity must be at least 1")
    .max(100, "Cart quantity cannot exceed 100"),
  name: z.string().optional(),
  cardName: z.string().optional(),
  setname: z.string().optional(),
  setName: z.string().optional(),
  condition: z.string().optional(),
  finish: z.string().optional(),
  storeprice: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
})

const CreateStripeSessionSchema = z.object({
  items: z.array(StripeCheckoutItemSchema).min(1, "Order must contain at least one item"),
  email: z.string().email("A valid email address is required"),
  total: z.number().nonnegative("Total must be non-negative"),
})

/**
 * Creates a Stripe checkout session with server-side price validation.
 * Requires an authenticated user session (any role).
 *
 * @param {object} data - The checkout data.
 * @param {CartItem[]} data.items - Cart items.
 * @param {string} data.email - Customer email.
 * @param {number} data.total - Expected total in cents.
 * @returns {Promise<{ url: string | null }>} The Stripe checkout URL.
 * @throws {Error} If the user is not authenticated.
 */
export async function createStripeSession(data: {
  items: CartItem[]
  email: string
  total: number
}) {
  // DEV-110: Validate all inputs at the action boundary
  const parsed = CreateStripeSessionSchema.safeParse(data)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input"
    return { success: false, error: message }
  }

  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  return StripeService.createCheckoutSession({
    items: parsed.data.items.map((item) => ({
      id: item.id,
      cartQuantity: item.cartQuantity,
    })),
    email: parsed.data.email,
  })
}

/**
 * Verifies a Stripe checkout session and returns the associated order.
 * Called from the checkout success page.
 *
 * @param {string} sessionId - The Stripe session ID.
 * @returns {Promise<{ success: boolean; order?: OrderConfirmationDTO; orderId?: string; error?: string }>}
 * @throws {Error} If the user is not authenticated.
 */
export async function createOrderFromSession(sessionId: string) {
  const userSession = await auth()
  if (!userSession?.user) throw new Error("Unauthorized")

  try {
    const result = await StripeService.verifyOrderFromSession(sessionId)

    // DEV-108: Verify the authenticated user owns this order (IDOR prevention).
    // Fail closed: no session email → deny. Email mismatch → deny.
    if (result.success && result.order) {
      if (!userSession.user.email) {
        return { success: false, error: "Order not found" }
      }
      if (result.order.customerEmail.toLowerCase() !== userSession.user.email.toLowerCase()) {
        console.warn(
          `IDOR attempt: user ${userSession.user.email} tried to access order for ${result.order.customerEmail}`
        )
        return { success: false, error: "Order not found" }
      }
    }

    return result
  } catch (error: any) {
    console.error("Stripe Order Verification Failed:", error)
    return { success: false, error: error.message }
  }
}
