/**
 * @file route.ts
 * @module api/admin/cleanup
 * @description
 *   Admin-only endpoint to cancel stale PENDING orders and restore their
 *   reserved inventory. Intended for manual admin invocation or a scheduled
 *   job (e.g. a cron hitting this endpoint).
 *
 *   Stripe's `checkout.session.expired` webhook handles most cases
 *   automatically; this endpoint catches any that slip through (e.g. orders
 *   created before the webhook was configured, or webhook delivery failures).
 *
 * @layer Controller (API Route)
 * @dependencies OrderService, auth
 */

import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/auth-guard"
import { OrderService } from "@/services/order.service"

/**
 * POST /api/admin/cleanup
 *
 * Cancels all PENDING orders older than `olderThanMinutes` (default: 30).
 * Restores reserved inventory for each cancelled order.
 *
 * @body {{ olderThanMinutes?: number }} - Optional age threshold in minutes.
 * @returns {{ cancelled: number; message: string }} Count of cancelled orders.
 */
export async function POST(req: Request) {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const olderThanMinutes =
    typeof body.olderThanMinutes === "number" && body.olderThanMinutes > 0
      ? body.olderThanMinutes
      : 30

  try {
    const cancelled = await OrderService.cancelStalePendingOrders(olderThanMinutes)

    return NextResponse.json({
      cancelled,
      message: `Cancelled ${cancelled} stale pending order${cancelled !== 1 ? "s" : ""}.`,
    })
  } catch {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
