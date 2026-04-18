/**
 * @file team.ts
 * @module actions/team
 * @description
 *   Server Action controller for team management. ADMIN only.
 *   Uses 2-flag permissions (inventoryUpdatePrices, addCardsAccess).
 *
 * @layer Controller
 */

"use server"

import { TeamService } from "@/services/team.service"
import { requireAdmin } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import type { ActionResult, UserPermissionsInput } from "@/lib/types"
import type { TeamMemberDTO } from "@/lib/dtos"

/**
 * Retrieves all team members with their permissions.
 */
export async function getTeamMembers(): Promise<TeamMemberDTO[]> {
  await requireAdmin()
  return TeamService.listAll()
}

/**
 * Invites (creates) a new team member.
 */
export async function inviteTeamMember(data: {
  name: string
  email: string
  password: string
  role: "ADMIN" | "USER"
  permissions?: Partial<UserPermissionsInput>
}): Promise<ActionResult<TeamMemberDTO>> {
  await requireAdmin()
  try {
    const member = await TeamService.create(data)
    revalidatePath("/admin/users")
    return { success: true, data: member }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Updates an existing team member's name, role, and permissions.
 */
export async function updateTeamMember(data: {
  id: string
  name: string
  role: "ADMIN" | "USER"
  permissions?: Partial<UserPermissionsInput>
}): Promise<ActionResult<TeamMemberDTO>> {
  await requireAdmin()
  try {
    // Update role + name
    const updated = await TeamService.updateRole(data.id, data.name, data.role)

    // Update permissions if provided and role is USER
    if (data.permissions && data.role === "USER") {
      await TeamService.updatePermissions(data.id, data.permissions)
    }

    revalidatePath("/admin/users")
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Deletes a team member. Cannot delete yourself.
 */
export async function deleteTeamMember(id: string): Promise<ActionResult<void>> {
  const session = await requireAdmin()
  if (id === session.user.id) {
    return { success: false, error: "Cannot delete yourself" }
  }
  try {
    await TeamService.deleteUser(id)
    revalidatePath("/admin/users")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Resets a team member's password.
 */
export async function resetTeamMemberPassword(data: {
  id: string
  newPassword: string
}): Promise<ActionResult<void>> {
  await requireAdmin()
  try {
    await TeamService.updatePassword(data.id, data.newPassword)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
