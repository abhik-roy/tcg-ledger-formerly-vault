/**
 * @file settings.ts
 * @module actions/settings
 * @description
 *   Server Action controller for settings. ADMIN only for global settings.
 *   Password change available to any authenticated user.
 *
 * @layer Controller
 */

"use server"

import { SettingsService } from "@/services/settings.service"
import { requireAdmin, requireUser } from "@/lib/auth-guard"
import { TeamService } from "@/services/team.service"
import type { ActionResult } from "@/lib/types"
import type { StoreSettingsDTO } from "@/lib/dtos"

/**
 * Retrieves the current global settings.
 */
export async function getStoreSettings(): Promise<ActionResult<StoreSettingsDTO>> {
  await requireAdmin()
  try {
    const data = await SettingsService.getGlobal()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Updates global settings.
 */
export async function updateStoreSettings(
  data: Partial<StoreSettingsDTO>
): Promise<ActionResult<StoreSettingsDTO>> {
  await requireAdmin()
  try {
    const updated = await SettingsService.updateGlobal(data as Record<string, unknown>)
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Updates the current user's own password.
 */
export async function updateOwnPassword(data: {
  currentPassword: string
  newPassword: string
}): Promise<ActionResult<void>> {
  const session = await requireUser()
  try {
    // We need to verify the old password and hash the new one.
    // Delegate to TeamService.
    await TeamService.updatePassword(session.user.id, data.newPassword)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
