/**
 * @file team.mapper.ts
 * @module mappers/team
 * @description
 *   Pure mapping functions for User → TeamMemberDTO.
 *
 * @layer Mapper
 */

import type { TeamMemberDTO, UserPermissionsDTO } from "@/lib/dtos"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PermissionsRow = Record<string, any>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TeamMemberRow = Record<string, any>

export function toUserPermissionsDTO(row: PermissionsRow): UserPermissionsDTO {
  return {
    inventoryUpdatePrices: row.inventoryUpdatePrices,
    addCardsAccess: row.addCardsAccess,
  }
}

export function toTeamMemberDTO(row: TeamMemberRow): TeamMemberDTO {
  return {
    id: row.id,
    name: row.name ?? row.displayName,
    email: row.email,
    role: row.role || "USER",
    createdAt: row.createdAt,
    permissions: row.permissions ? toUserPermissionsDTO(row.permissions) : null,
  }
}

export function toTeamMemberDTOs(rows: TeamMemberRow[]): TeamMemberDTO[] {
  return rows.map(toTeamMemberDTO)
}
