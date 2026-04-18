/**
 * @file catalog.mapper.ts
 * @module mappers/catalog
 * @description
 *   Pure mapping functions for Card catalog entries.
 *
 * @layer Mapper
 */

import type { CardDTO } from "@/lib/dtos"
import { toCardDTO, toCardDTOs } from "./holding.mapper"

// Re-export card mapping from holding mapper (single source of truth)
export { toCardDTO, toCardDTOs }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CardRow = Record<string, any>

export function toCatalogSearchResultDTO(row: CardRow): CardDTO {
  return toCardDTO(row)
}

export function toCatalogSearchResultDTOs(rows: CardRow[]): CardDTO[] {
  return toCardDTOs(rows)
}
