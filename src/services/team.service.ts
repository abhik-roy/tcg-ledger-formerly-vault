/**
 * @file team.service.ts
 * @module services/team
 * @description
 *   Business logic for team (user) management. ADMIN/USER roles, 2-flag permissions.
 *
 * @layer Service
 */

import { TeamRepository } from "@/repositories/team.repository"
import { toTeamMemberDTO, toTeamMemberDTOs } from "@/mappers/team.mapper"
import { toUserSlimDTO } from "@/mappers/holding.mapper"
import type { TeamMemberDTO, UserSlimDTO } from "@/lib/dtos"
import type { UserPermissionsInput } from "@/lib/types"
import bcrypt from "bcryptjs"

const DEFAULT_PERMISSIONS: UserPermissionsInput = {
  inventoryUpdatePrices: false,
  addCardsAccess: true,
}

export class TeamService {
  static async listAll(): Promise<TeamMemberDTO[]> {
    const rows = await TeamRepository.findAll()
    return toTeamMemberDTOs(rows)
  }

  static async create(input: {
    email: string
    password: string
    name: string
    role: string
    permissions?: Partial<UserPermissionsInput>
  }): Promise<TeamMemberDTO> {
    const existing = await TeamRepository.findByEmail(input.email)
    if (existing) throw new Error("Email already in use")

    const hashedPassword = await bcrypt.hash(input.password, 10)
    const perms =
      input.role === "ADMIN"
        ? undefined
        : {
            ...DEFAULT_PERMISSIONS,
            ...input.permissions,
          }

    const user = await TeamRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: input.role,
      permissions: perms,
    })

    const full = await TeamRepository.findAll()
    const created = full.find((u) => u.id === user.id)
    return toTeamMemberDTO(created || user)
  }

  static async updatePermissions(
    userId: string,
    permissions: Partial<UserPermissionsInput>
  ): Promise<TeamMemberDTO> {
    await TeamRepository.upsertPermissions(userId, {
      ...DEFAULT_PERMISSIONS,
      ...permissions,
    })
    const users = await TeamRepository.findAll()
    const updated = users.find((u) => u.id === userId)
    if (!updated) throw new Error("User not found")
    return toTeamMemberDTO(updated)
  }

  static async updateRole(userId: string, name: string, role: string): Promise<TeamMemberDTO> {
    await TeamRepository.update(userId, { name, role })
    if (role === "ADMIN") {
      await TeamRepository.deletePermissions(userId)
    }
    const users = await TeamRepository.findAll()
    const updated = users.find((u) => u.id === userId)
    if (!updated) throw new Error("User not found")
    return toTeamMemberDTO(updated)
  }

  static async deleteUser(userId: string): Promise<void> {
    await TeamRepository.delete(userId)
  }

  static async updateSelfProfile(
    userId: string,
    input: { displayName?: string }
  ): Promise<UserSlimDTO> {
    const user = await TeamRepository.findById(userId)
    if (!user) throw new Error("User not found")
    const updated = await TeamRepository.updateDisplayName(userId, input.displayName)
    return toUserSlimDTO(updated)
  }

  static async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await TeamRepository.updatePassword(userId, hashedPassword)
  }
}
