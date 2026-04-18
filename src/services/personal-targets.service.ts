/**
 * @file personal-targets.service.ts
 * @module services/personal-targets
 * @description
 *   Business logic for personal collection targets (idealQuantity, maxQuantity).
 *
 * @layer Service
 */

import { HoldingRepository } from "@/repositories/holding.repository"
import { toHoldingDTO, toHoldingDTOs } from "@/mappers/holding.mapper"
import type { HoldingDTO } from "@/lib/dtos"

export class PersonalTargetsService {
  static async listForUser(userId: string): Promise<HoldingDTO[]> {
    const rows = await HoldingRepository.findByUser(userId, {})
    const withTargets = rows.filter((h) => h.idealQuantity > 0 || h.maxQuantity > 0)
    return toHoldingDTOs(withTargets)
  }

  static async updateTargets(
    holdingId: string,
    idealQuantity: number,
    maxQuantity: number
  ): Promise<HoldingDTO> {
    const row = await HoldingRepository.update(holdingId, {
      idealQuantity,
      maxQuantity,
    })
    return toHoldingDTO(row)
  }
}
