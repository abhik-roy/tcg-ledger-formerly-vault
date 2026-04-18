/**
 * @file dashboard.ts
 * @module actions/dashboard
 * @description
 *   Server Action controller for the admin dashboard.
 *   Returns personal + Tailnet stats.
 *
 * @layer Controller
 */

"use server"

import { requireUser } from "@/lib/auth-guard"
import { DashboardService } from "@/services/dashboard.service"
import type { ActionResult } from "@/lib/types"
import type { DashboardPersonalStats, DashboardTailnetStats } from "@/lib/dtos"

/**
 * Retrieves personal collection statistics for the current user.
 */
export async function getPersonalStats(): Promise<ActionResult<DashboardPersonalStats>> {
  const session = await requireUser()
  try {
    const data = await DashboardService.getPersonalStats(session.user.id)
    return { success: true, data }
  } catch (error) {
    console.error("Personal Stats Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Retrieves Tailnet-wide aggregate statistics.
 */
export async function getTailnetStats(): Promise<ActionResult<DashboardTailnetStats>> {
  await requireUser()
  try {
    const data = await DashboardService.getTailnetStats()
    return { success: true, data }
  } catch (error) {
    console.error("Tailnet Stats Error:", error)
    return { success: false, error: (error as Error).message }
  }
}
