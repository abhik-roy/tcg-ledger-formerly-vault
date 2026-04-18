/**
 * @file holding.mapper.ts
 * @module mappers/holding
 * @description
 *   Pure mapping functions for Card+Holding → DTOs.
 *
 * @layer Mapper
 */

import type { CardDTO, HoldingDTO, UserSlimDTO } from "@/lib/dtos"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CardRow = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HoldingWithCard = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserRow = Record<string, any>

export function toCardDTO(card: CardRow): CardDTO {
  return {
    id: card.id,
    name: card.name,
    set: card.set,
    setName: card.setName,
    collectorNumber: card.collectorNumber,
    finish: card.finish,
    game: card.game,
    rarity: card.rarity,
    imageSmall: card.imageSmall ?? null,
    imageNormal: card.imageNormal ?? null,
    marketPrice: card.marketPrice ?? null,
    marketPriceAt: card.marketPriceAt ?? null,
  }
}

export function toCardDTOs(cards: CardRow[]): CardDTO[] {
  return cards.map(toCardDTO)
}

export function toHoldingDTO(holding: HoldingWithCard): HoldingDTO {
  return {
    id: holding.id,
    userId: holding.userId,
    card: toCardDTO(holding.card),
    quantity: holding.quantity,
    condition: holding.condition,
    notes: holding.notes ?? null,
    listedForTrade: holding.listedForTrade,
    listedQuantity: holding.listedQuantity ?? 0,
    askType: holding.askType ?? null,
    askValue: holding.askValue ?? null,
    tradeNotes: holding.tradeNotes ?? null,
    idealQuantity: holding.idealQuantity,
    maxQuantity: holding.maxQuantity,
    acquiredPrice: holding.acquiredPrice ?? null,
    acquiredAt: holding.acquiredAt ?? null,
    createdAt: holding.createdAt,
    updatedAt: holding.updatedAt,
  }
}

export function toHoldingDTOs(holdings: HoldingWithCard[]): HoldingDTO[] {
  return holdings.map(toHoldingDTO)
}

export function toUserSlimDTO(user: UserRow): UserSlimDTO {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? null,
    role: user.role,
  }
}
