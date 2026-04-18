/**
 * @file settings.service.ts
 * @module services/settings
 * @description
 *   Business logic for global settings.
 *
 * @layer Service
 */

import { SettingsRepository } from "@/repositories/settings.repository"
import { toStoreSettingsDTO } from "@/mappers/settings.mapper"
import type { StoreSettingsDTO } from "@/lib/dtos"

export class SettingsService {
  static async getGlobal(): Promise<StoreSettingsDTO> {
    const row = await SettingsRepository.find()
    return toStoreSettingsDTO(row)
  }

  static async updateGlobal(input: Record<string, unknown>): Promise<StoreSettingsDTO> {
    const row = await SettingsRepository.upsert(input)
    return toStoreSettingsDTO(row)
  }
}
