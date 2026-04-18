/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file stripe.service.ts
 * @module services/stripe
 * @description
 *   Business logic layer for the Stripe payment module. Handles creation
 *   of Stripe checkout sessions with server-side price/stock validation,
 *   and order verification after payment.
 *
 * @layer Service
 * @dependencies InventoryRepository, OrderRepository, Stripe SDK
 */

import { Stripe } from "stripe"
import { FulfillmentType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { InventoryRepository } from "@/repositories/inventory.repository"
import { OrderRepository } from "@/repositories/order.repository"
import { LogRepository } from "@/repositories/log.repository"
import { EmailService } from "@/services/email.service"
import type { VerifiedCheckoutItem, OrderConfirmationDTO } from "@/lib/types"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover" as any, // unreleased version not yet in SDK types
})

export class StripeService {
  /**
   * Creates a Stripe checkout session.
   * Validates all item prices and stock against the database before creating
   * the session (prevents price manipulation from the client).
   *
   * @param {object} data - The checkout data.
   * @param {Array<{ id: number; cartQuantity: number }>} data.items - Cart items with quantities.
   * @param {string} data.email - Customer email for the Stripe session.
   * @returns {Promise<{ url: string | null }>} The Stripe checkout URL.
   * @throws {Error} If any item is not found, has no price, or has insufficient stock.
   *
   * @example
   *   const { url } = await StripeService.createCheckoutSession({
   *     items: [{ id: 123, cartQuantity: 2 }],
   *     email: "customer@example.com",
   *   })
   */
  static async createCheckoutSession(data: {
    items: { id: number; cartQuantity: number }[]
    email: string
  }): Promise<{ url: string | null }> {
    // DEV-61: Fetch store settings for dynamic shipping rates and currency
    const { SettingsService } = await import("@/services/settings.service")
    const storeSettings = await SettingsService.getSettings()

    // Step 1: Pre-fetch item details outside the transaction (price, images, name).
    // This keeps the critical transaction section short and avoids holding locks
    // while fetching non-critical display data.
    const verifiedItems: VerifiedCheckoutItem[] = []

    for (const item of data.items) {
      const inventoryItem = await InventoryRepository.findForStripeVerification(item.id)

      if (!inventoryItem || !inventoryItem.storeprice) {
        throw new Error(`Item ${item.id} not found or has no price`)
      }

      verifiedItems.push({
        inventoryId: item.id,
        name: inventoryItem.name,
        setName: inventoryItem.setname || "Unknown Set",
        condition: inventoryItem.condition || "NM",
        finish: inventoryItem.finish || "nonfoil",
        price: inventoryItem.storeprice,
        quantity: item.cartQuantity,
        image: inventoryItem.imagenormal || inventoryItem.imagesmall || null,
      })
    }

    // Step 2: Single transaction — lock inventory rows, validate stock, decrement,
    // log quantity changes, and create the PENDING order atomically.
    // SELECT FOR UPDATE prevents concurrent sessions from reading stale quantities.
    const pendingOrder = await prisma.$transaction(async (tx) => {
      for (const item of verifiedItems) {
        const locked = await InventoryRepository.findAndLockForUpdate(tx, item.inventoryId)

        if (!locked || locked.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.name}`)
        }

        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { quantity: { decrement: item.quantity } },
        })

        await LogRepository.createQuantityLogInTransaction(tx, {
          cardname: item.name,
          amount: -item.quantity,
          user: `STRIPE_RESERVE: ${data.email}`,
          finish: item.finish,
        })
      }

      return tx.order.create({
        data: {
          customerEmail: data.email,
          subtotal: verifiedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
          tax: 0,
          totalAmount: verifiedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
          status: "PENDING",
          fulfillment: FulfillmentType.SHIPPING,
          paymentMethod: "STRIPE_ONLINE",
          items: {
            create: verifiedItems.map((i) => ({
              inventoryId: i.inventoryId,
              name: i.name,
              setName: i.setName,
              condition: i.condition,
              finish: i.finish,
              price: i.price,
              quantity: i.quantity,
            })),
          },
        },
      })
    })

    // Step 3: Build Stripe line items and create the session (outside transaction).
    const lineItems = verifiedItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
          metadata: {
            inventoryId: item.inventoryId.toString(),
            setName: item.setName,
          },
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }))

    // DEV-61: Use StoreSettings shipping rates. Apply free shipping threshold if configured.
    const subtotalCents = verifiedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const freeShipping =
      storeSettings.freeShippingThreshold > 0 &&
      subtotalCents >= storeSettings.freeShippingThreshold
    const shippingAmountCents = freeShipping ? 0 : storeSettings.standardShippingRate
    const currency = storeSettings.currency.toLowerCase()

    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: data.email,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingAmountCents, currency },
            display_name: freeShipping ? "Free Shipping" : "Standard Shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 5 },
            },
          },
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/shop/checkout`,
      metadata: {
        customer_email: data.email,
        type: "ONLINE_ORDER",
        orderId: pendingOrder.id,
      },
    })

    // Step 4: Store the Stripe session ID on the order for dedup + expiry handling.
    await OrderRepository.update(pendingOrder.id, {
      stripeSessionId: stripeSession.id,
    })

    return { url: stripeSession.url }
  }

  /**
   * Verifies that a Stripe checkout session has been paid and returns the
   * associated order ID.
   *
   * @param {string} sessionId - The Stripe session ID from the success page URL.
   * @returns {Promise<{ success: boolean; orderId?: string; error?: string }>}
   */
  static async verifyOrderFromSession(
    sessionId: string
  ): Promise<{ success: boolean; order?: OrderConfirmationDTO; orderId?: string; error?: string }> {
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId)

    if (stripeSession.payment_status !== "paid") {
      return { success: false, error: "Payment not completed" }
    }

    const orderId = stripeSession.metadata?.orderId
    if (!orderId) {
      return { success: false, error: "Order reference not found" }
    }

    const order = (await OrderRepository.findById(orderId, true)) as any
    if (!order) {
      return { success: false, error: "Order not found" }
    }

    // Fallback: send confirmation email if webhook didn't fire (idempotency guard)
    if (!order.emailConfirmationSent) {
      await EmailService.sendOrderConfirmation(order)
      await OrderRepository.update(orderId, { emailConfirmationSent: true })
    }

    const orderDTO: OrderConfirmationDTO = {
      id: order.id,
      customerEmail: order.customerEmail,
      subtotal: order.subtotal,
      tax: order.tax,
      shippingCost: order.shippingCost || 0,
      totalAmount: order.totalAmount,
      fulfillment: order.fulfillment,
      paymentMethod: order.paymentMethod,
      addressLine1: order.addressLine1 || null,
      city: order.city || null,
      postalCode: order.postalCode || null,
      createdAt: order.createdAt?.toISOString?.() || new Date().toISOString(),
      items: (order.items || []).map((item: any) => ({
        name: item.name,
        setName: item.setName,
        condition: item.condition,
        finish: item.finish,
        price: item.price,
        quantity: item.quantity,
      })),
    }

    return { success: true, order: orderDTO, orderId: order.id }
  }
}
