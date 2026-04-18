/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file route.ts
 * @module api/webhooks/stripe
 * @description
 *   Stripe webhook handler. Receives events from Stripe, verifies the
 *   signature, and delegates payment processing to OrderService.
 *   This route handler contains no business logic beyond signature
 *   verification and event routing.
 *
 * @layer Controller (API Route)
 * @dependencies OrderService, Stripe SDK
 */

import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { OrderService } from "@/services/order.service"
import { EmailService } from "@/services/email.service"
import { OrderRepository } from "@/repositories/order.repository"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover" as any,
})

/**
 * Handles POST requests from Stripe webhooks.
 * Verifies the webhook signature and processes checkout.session.completed events.
 *
 * @param {Request} req - The incoming request.
 * @returns {Promise<NextResponse>} 200 on success, 400 on signature failure.
 */
export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get("Stripe-Signature") as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.orderId

    if (orderId) {
      console.warn(`Payment received for Order: ${orderId}`)

      try {
        await OrderService.processStripePayment(orderId, {
          amount_total: session.amount_total,
          amount_subtotal: session.amount_subtotal,
        })
      } catch (error) {
        console.error(`Failed to process order ${orderId}:`, error)
        // Return 500 so Stripe retries on transient failures (e.g. DB temporarily down).
        // The order stays PENDING until the retry succeeds.
        return new NextResponse("Internal Server Error", { status: 500 })
      }
    }
  }

  if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.orderId

    if (orderId) {
      const reason = event.type === "checkout.session.expired" ? "expired" : "async payment failed"
      console.warn(`Checkout session ${reason} for order: ${orderId}`)
      try {
        await OrderService.handleExpiredSession(orderId)
      } catch (error) {
        console.error(`Failed to handle ${reason} for order ${orderId}:`, error)
        // Return 200: these are definitive states — retrying the handler won't help.
      }
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge
    const isFullRefund = charge.refunded === true && charge.amount_refunded === charge.amount

    try {
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : (charge.payment_intent as Stripe.PaymentIntent | null)?.id

      if (paymentIntentId) {
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1,
        })
        const session = sessions.data[0]
        if (session) {
          const orderId = session.metadata?.orderId
          if (orderId) {
            await OrderService.handleStripeRefund(orderId, isFullRefund)
          } else {
            const order = await OrderRepository.findByStripeSessionId(session.id)
            if (order) {
              await OrderService.handleStripeRefund(order.id, isFullRefund)
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to process refund for charge ${charge.id}:`, error)
      // Return 200: refund already happened on Stripe's side, retrying won't help
    }
  }

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute
    const chargeId =
      typeof dispute.charge === "string"
        ? dispute.charge
        : (dispute.charge as Stripe.Charge | null)?.id || "unknown"

    try {
      await EmailService.sendDisputeNotification({
        chargeId,
        amount: dispute.amount,
        customerEmail: (dispute as any).evidence?.customer_email_address,
      })
    } catch (error) {
      console.error(`Failed to send dispute notification for charge ${chargeId}:`, error)
    }
  }

  return new NextResponse(null, { status: 200 })
}
