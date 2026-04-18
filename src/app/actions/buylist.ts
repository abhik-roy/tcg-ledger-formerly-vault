/**
 * @file buylist.ts
 * @module actions/buylist
 * @description
 *   Server Action controller for personal targets (formerly buylist).
 *   Thin wrappers around PersonalTargetsService.
 *
 * @layer Controller
 */

"use server"

import { requireUser, requireOwnership } from "@/lib/auth-guard"
import { PersonalTargetsService } from "@/services/personal-targets.service"
import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/types"
import type { HoldingDTO } from "@/lib/dtos"

/**
 * Retrieves personal targets for the current user.
 */
export async function getTargets(): Promise<ActionResult<HoldingDTO[]>> {
  const session = await requireUser()
  try {
    const data = await PersonalTargetsService.listForUser(session.user.id)
    return { success: true, data }
  } catch (error) {
    console.error("Targets Fetch Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Updates personal targets for a holding.
 */
export async function updateTargets(
  holdingId: string,
  idealQuantity: number,
  maxQuantity: number
): Promise<ActionResult<HoldingDTO>> {
  const session = await requireUser()
  await requireOwnership(holdingId, session.user.id)
  try {
    const data = await PersonalTargetsService.updateTargets(holdingId, idealQuantity, maxQuantity)
    revalidatePath("/admin/targets")
    return { success: true, data }
  } catch (error) {
    console.error("Update Targets Error:", error)
    return { success: false, error: (error as Error).message }
  }
}
