/**
 * @file trade-binder.ts
 * @module actions/trade-binder
 * @description
 *   Server Action controller for the Tailnet-wide trade binder.
 *
 * @layer Controller
 */

"use server"

import { HoldingService } from "@/services/holding.service"
import { requireUser } from "@/lib/auth-guard"
import type { ActionResult, TradeBinderFilterInput } from "@/lib/types"
import type { TradeBinderItemDTO } from "@/lib/dtos"

/**
 * Retrieves all trade-listed holdings across the Tailnet.
 * Optionally excludes the current user's own listings.
 */
export async function getTradeBinder(
  filter: TradeBinderFilterInput = {},
  excludeSelf: boolean = false
): Promise<ActionResult<TradeBinderItemDTO[]>> {
  const session = await requireUser()
  try {
    const data = await HoldingService.listTradeBinder(
      {
        ...filter,
        excludeUserId: excludeSelf ? session.user.id : undefined,
      },
      session.user.id
    )
    return { success: true, data }
  } catch (error) {
    console.error("Trade Binder Fetch Error:", error)
    return { success: false, error: (error as Error).message }
  }
}
