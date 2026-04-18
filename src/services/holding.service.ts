/**
 * @file holding.service.ts
 * @module services/holding
 * @description
 *   Business logic for per-user Holdings. CRUD, trade listing, CSV import.
 *
 * @layer Service
 */

import { HoldingRepository } from "@/repositories/holding.repository"
import { TradeOfferRepository } from "@/repositories/trade-offer.repository"
import { toHoldingDTO, toHoldingDTOs } from "@/mappers/holding.mapper"
import { toTradeBinderItemDTOs } from "@/mappers/trade-binder.mapper"
import type { HoldingDTO, TradeBinderItemDTO } from "@/lib/dtos"
import type {
  CreateHoldingInput,
  UpdateHoldingInput,
  HoldingFilterInput,
  TradeBinderFilterInput,
} from "@/lib/types"

export class HoldingService {
  static async listForUser(userId: string, filter: HoldingFilterInput = {}): Promise<HoldingDTO[]> {
    const rows = await HoldingRepository.findByUser(userId, filter)
    return toHoldingDTOs(rows)
  }

  static async getById(id: string): Promise<HoldingDTO> {
    const row = await HoldingRepository.findById(id)
    if (!row) throw new Error("Holding not found")
    return toHoldingDTO(row)
  }

  static async create(userId: string, input: CreateHoldingInput): Promise<HoldingDTO> {
    const row = await HoldingRepository.create(userId, input)
    return toHoldingDTO(row)
  }

  static async update(id: string, input: UpdateHoldingInput): Promise<HoldingDTO> {
    const row = await HoldingRepository.update(id, input)
    return toHoldingDTO(row)
  }

  static async delete(id: string): Promise<void> {
    await HoldingRepository.delete(id)
  }

  static async toggleListing(
    id: string,
    listedQuantity: number,
    notes?: string,
    askType?: string | null,
    askValue?: number | null
  ): Promise<HoldingDTO> {
    const row = await HoldingRepository.update(id, {
      listedForTrade: listedQuantity > 0,
      listedQuantity: Math.max(0, listedQuantity),
      tradeNotes: notes,
      askType: askType,
      askValue: askValue,
    } as UpdateHoldingInput)
    return toHoldingDTO(row)
  }

  static async listTradeBinder(
    filter: TradeBinderFilterInput & { excludeUserId?: string } = {},
    currentUserId?: string
  ): Promise<TradeBinderItemDTO[]> {
    const rows = await HoldingRepository.findListed(filter)

    // Build a map of the current user's pending offers keyed by holdingId
    let myOffers: Map<string, Record<string, unknown>> | undefined
    if (currentUserId) {
      const offers = await TradeOfferRepository.findByOfferUser(currentUserId)
      myOffers = new Map()
      for (const offer of offers) {
        // Only show the user's most recent pending offer per holding
        if (offer.status === "pending" && !myOffers.has(offer.holdingId)) {
          myOffers.set(offer.holdingId, offer)
        }
      }
    }

    return toTradeBinderItemDTOs(rows, myOffers)
  }

  static async bulkImportFromCsv(
    userId: string,
    rows: { cardId: string; quantity: number; condition: string; notes?: string }[]
  ): Promise<{ imported: number; failed: { row: number; reason: string }[] }> {
    const failed: { row: number; reason: string }[] = []
    let imported = 0

    for (let i = 0; i < rows.length; i++) {
      try {
        await HoldingRepository.upsertFromImport(userId, rows[i].cardId, {
          quantity: rows[i].quantity,
          condition: rows[i].condition,
          notes: rows[i].notes,
        })
        imported++
      } catch (err) {
        failed.push({ row: i, reason: err instanceof Error ? err.message : "Unknown error" })
      }
    }

    return { imported, failed }
  }
}
