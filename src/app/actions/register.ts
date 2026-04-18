"use server"

import { TeamService } from "@/services/team.service"
import type { ActionResult } from "@/lib/types"

/**
 * Public registration — creates a USER account (no admin permissions).
 * No auth required (this is called from the login/register page).
 */
export async function registerUser(data: {
  email: string
  password: string
  displayName: string
}): Promise<ActionResult<{ id: string; email: string }>> {
  try {
    if (!data.email || !data.password || !data.displayName) {
      return { success: false, error: "All fields are required." }
    }
    if (data.password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." }
    }

    const user = await TeamService.create({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      name: data.displayName.trim(),
      role: "USER",
      permissions: {
        inventoryUpdatePrices: false,
        addCardsAccess: true,
      },
    })

    return { success: true, data: { id: user.id, email: user.email ?? data.email } }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed."
    if (message.includes("already in use")) {
      return { success: false, error: "An account with this email already exists." }
    }
    return { success: false, error: message }
  }
}
