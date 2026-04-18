/**
 * @file checkout.ts
 * @module actions/checkout
 * @description
 *   Server Action controller for the in-store (non-Stripe) checkout flow.
 *   Delegates transactional order creation to OrderService.createInStoreOrder.
 *   Auth, validation, and error handling remain at the action boundary.
 *
 * @layer Controller
 * @dependencies OrderService, auth, revalidatePath, zod, SettingsService
 *
 * @security
 *   - Requires an authenticated CUSTOMER session (DEV-17)
 *   - All inputs validated with Zod at the action boundary (DEV-16)
 *   - Order totals recalculated server-side from DB prices (DEV-16)
 */

"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import type { CheckoutCartItem, OrderConfirmationDTO } from "@/lib/types"
import { EmailService } from "@/services/email.service"
import { SettingsService } from "@/services/settings.service"
import { OrderService } from "@/services/order.service"
import { prisma } from "@/lib/prisma"

// ---------------------------------------------------------------------------
// Input schema (DEV-16)
// ---------------------------------------------------------------------------

const CheckoutItemSchema = z.object({
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

const PlaceInStoreOrderSchema = z.object({
  customerEmail: z.string().email("A valid email address is required"),
  items: z.array(CheckoutItemSchema).min(1, "Order must contain at least one item"),
  // subtotal / tax / total are provided by the client but intentionally ignored —
  // the server recalculates all monetary totals from DB prices (DEV-16)
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  fulfillment: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  // DEV-111: Optional idempotency key to prevent duplicate orders from double-submits
  idempotencyKey: z.string().max(64).optional(),
})

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Places an in-store order (non-Stripe checkout).
 * Validates stock, decrements inventory, logs changes, and creates the order
 * within a single database transaction.
 *
 * @security Requires CUSTOMER session. Order totals are always recalculated
 *   server-side from DB prices — client-supplied subtotal/tax/total are ignored.
 *
 * @param {object} data - The order data from the checkout form.
 * @returns {Promise<{ success: boolean; order?: OrderConfirmationDTO; orderId?: string; error?: string }>}
 */
export async function placeInStoreOrder(data: {
  customerEmail: string
  items: CheckoutCartItem[]
  subtotal: number
  tax: number
  total: number
  fulfillment?: string
  addressLine1?: string
  city?: string
  postalCode?: string
  firstName?: string
  lastName?: string
  idempotencyKey?: string
}) {
  try {
    // DEV-17: Require an authenticated CUSTOMER session.
    // Guest checkout is intentionally disallowed — shoppers must be signed in.
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return { success: false, error: "Authentication required" }
    }
    const customerId = session.user.id

    // DEV-16: Validate all inputs at the action boundary
    const parsed = PlaceInStoreOrderSchema.safeParse(data)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input"
      return { success: false, error: message }
    }

    // DEV-111: Idempotency guard — if a matching order already exists, return it
    // instead of creating a duplicate. This protects against network retries and
    // double-submits that bypass the client-side isProcessing flag.
    if (data.idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        include: { items: true },
      })
      if (existing) {
        const existingDTO: OrderConfirmationDTO = {
          id: existing.id,
          customerEmail: existing.customerEmail,
          subtotal: existing.subtotal,
          tax: existing.tax,
          shippingCost: existing.shippingCost,
          totalAmount: existing.totalAmount,
          fulfillment: existing.fulfillment,
          paymentMethod: existing.paymentMethod,
          addressLine1: existing.addressLine1 ?? null,
          city: existing.city ?? null,
          postalCode: existing.postalCode ?? null,
          createdAt: existing.createdAt.toISOString(),
          items: existing.items.map((item) => ({
            name: item.name,
            setName: item.setName || "",
            condition: item.condition || "NM",
            finish: item.finish || "nonfoil",
            price: item.price,
            quantity: item.quantity,
          })),
        }
        return { success: true, order: existingDTO, orderId: existing.id }
      }
    }

    const fulfillment =
      data.fulfillment === "SHIPPING" ? ("SHIPPING" as const) : ("PICKUP" as const)

    // Fetch store settings for server-side monetary calculations (DEV-16)
    const settings = await SettingsService.getSettings()
    const taxRatePct = settings.taxRate || 0
    const shippingCost = fulfillment === "SHIPPING" ? settings.standardShippingRate || 499 : 0

    // DEV-60: Delegate transactional order creation to the service layer
    const result = await OrderService.createInStoreOrder({
      customerEmail: data.customerEmail,
      customerId,
      items: data.items,
      fulfillment,
      taxRatePct,
      shippingCost,
      addressLine1: data.addressLine1,
      city: data.city,
      postalCode: data.postalCode,
      idempotencyKey: data.idempotencyKey,
    })

    // Fire-and-forget — email failure must never block checkout
    // Use server-verified item prices from the service result (DEV-77)
    void EmailService.sendOrderConfirmation({
      id: result.orderId,
      customerEmail: data.customerEmail,
      subtotal: result.subtotal,
      tax: result.tax,
      shippingCost,
      totalAmount: result.totalAmount,
      fulfillment,
      paymentMethod: fulfillment === "SHIPPING" ? "CREDIT_CARD" : "PAY_IN_STORE",
      addressLine1: data.addressLine1 ?? null,
      city: data.city ?? null,
      postalCode: data.postalCode ?? null,
      createdAt: result.createdAt,
      items: result.items,
    })

    revalidatePath("/admin/orders")
    revalidatePath("/admin/inventory")
    revalidatePath("/admin/ledger")

    const orderDTO: OrderConfirmationDTO = {
      id: result.orderId,
      customerEmail: data.customerEmail,
      subtotal: result.subtotal,
      tax: result.tax,
      shippingCost,
      totalAmount: result.totalAmount,
      fulfillment,
      paymentMethod: fulfillment === "SHIPPING" ? "CREDIT_CARD" : "PAY_IN_STORE",
      addressLine1: data.addressLine1 ?? null,
      city: data.city ?? null,
      postalCode: data.postalCode ?? null,
      createdAt: result.createdAt.toISOString(),
      items: result.items,
    }

    return { success: true, order: orderDTO, orderId: result.orderId }
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : ""
    console.error("CHECKOUT FAILURE:", rawMessage)

    // DEV-111: P2002 = unique constraint violation on idempotencyKey — concurrent
    // request already created the order. Fetch and return it instead of failing.
    const isPrismaUniqueViolation =
      error instanceof Error && "code" in error && (error as { code: string }).code === "P2002"

    if (isPrismaUniqueViolation && data.idempotencyKey) {
      try {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
          include: { items: true },
        })
        if (existing) {
          const orderDTO: OrderConfirmationDTO = {
            id: existing.id,
            customerEmail: existing.customerEmail,
            subtotal: existing.subtotal,
            tax: existing.tax,
            shippingCost: existing.shippingCost,
            totalAmount: existing.totalAmount,
            fulfillment: existing.fulfillment,
            paymentMethod: existing.paymentMethod,
            addressLine1: existing.addressLine1 ?? null,
            city: existing.city ?? null,
            postalCode: existing.postalCode ?? null,
            createdAt: existing.createdAt.toISOString(),
            items: existing.items.map((item) => ({
              name: item.name,
              setName: item.setName || "",
              condition: item.condition || "NM",
              finish: item.finish || "nonfoil",
              price: item.price,
              quantity: item.quantity,
            })),
          }
          return { success: true, order: orderDTO, orderId: existing.id }
        }
      } catch {
        // fall through to generic error
      }
    }

    // DEV-113: Only pass through known safe messages to prevent internal leakage
    // (e.g., Prisma errors contain table/column names)
    let userMessage = "Checkout failed. Please try again."
    if (rawMessage === "Authentication required") {
      userMessage = rawMessage
    } else if (rawMessage.startsWith("Insufficient stock")) {
      userMessage = rawMessage
    }

    return { success: false, error: userMessage }
  }
}
