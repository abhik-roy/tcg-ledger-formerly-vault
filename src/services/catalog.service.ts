/**
 * @file catalog.service.ts
 * @module services/catalog
 * @description
 *   Business logic for the Card catalog. Imports from Scryfall/Pokemon,
 *   searches, and updates market prices.
 *
 * @layer Service
 */

import { CatalogRepository } from "@/repositories/catalog.repository"
import { toCardDTO, toCardDTOs } from "@/mappers/holding.mapper"
import type { CardDTO } from "@/lib/dtos"
import type { CreateCardInput } from "@/lib/types"

export class CatalogService {
  static async upsertCard(input: CreateCardInput): Promise<CardDTO> {
    const card = await CatalogRepository.upsertCard(input)
    return toCardDTO(card)
  }

  static async search(query: string, game?: string): Promise<CardDTO[]> {
    const cards = await CatalogRepository.searchCards(query, game)
    return toCardDTOs(cards)
  }

  static async updateMarketPrice(cardId: string, price: number): Promise<CardDTO> {
    const card = await CatalogRepository.updateMarketPrice(cardId, price)
    return toCardDTO(card)
  }

  static async findById(id: string): Promise<CardDTO | null> {
    const card = await CatalogRepository.findById(id)
    return card ? toCardDTO(card) : null
  }

  static async findByNameAndNumber(name: string, collectorNumber?: string) {
    return CatalogRepository.findByNameAndNumber(name, collectorNumber)
  }

  static async findManyPaginated(params: { skip: number; take: number; query?: string }) {
    const { rows, total } = await CatalogRepository.findManyPaginated(params)
    return { rows: toCardDTOs(rows), total }
  }
}
