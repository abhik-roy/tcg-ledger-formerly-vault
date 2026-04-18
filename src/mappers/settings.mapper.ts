/**
 * @file settings.mapper.ts
 * @module mappers/settings
 * @description
 *   Pure mapping functions for StoreSettings → StoreSettingsDTO.
 *
 * @layer Mapper
 */

import type { StoreSettingsDTO } from "@/lib/dtos"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreSettingsRow = Record<string, any> | null

const DEFAULTS: StoreSettingsDTO = {
  storeName: "TCG Ledger",
  contactEmail: null,
  taxRate: 0,
  currency: "USD",
}

export function toStoreSettingsDTO(row: StoreSettingsRow): StoreSettingsDTO {
  if (!row) return DEFAULTS

  return {
    storeName: row.storeName || DEFAULTS.storeName,
    contactEmail: row.contactEmail ?? null,
    taxRate: row.taxRate ?? DEFAULTS.taxRate,
    currency: row.currency || DEFAULTS.currency,
  }
}
