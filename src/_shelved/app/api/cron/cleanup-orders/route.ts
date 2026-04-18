/**
 * @file route.ts
 * @module api/cron/cleanup-orders
 * @description
 *   Vercel Cron endpoint that cancels stale PENDING orders and restores
 *   their reserved inventory. Runs every 15 minutes via vercel.json schedule.
 *   Protected by CRON_SECRET to prevent unauthorized invocations.
 *
 * @see vercel.json for the cron schedule configuration
 * @see OrderService.cancelStalePendingOrders for the cleanup logic
 *
 * @layer API Route
 * @dependencies OrderService
 * @ticket DEV-112
 */

import { NextResponse } from "next/server"
import { OrderService } from "@/services/order.service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // Verify Vercel Cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const cancelled = await OrderService.cancelStalePendingOrders()
    return NextResponse.json({ success: true, cancelled })
  } catch (error) {
    console.error("Cron cleanup-orders error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
