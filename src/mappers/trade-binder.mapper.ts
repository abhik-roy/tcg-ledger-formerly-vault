/**
 * @file trade-binder.mapper.ts
 * @module mappers/trade-binder
 * @description
 *   Pure mapping functions for trade binder listings and trade offers.
 *
 * @layer Mapper
 */

import type { TradeBinderItemDTO, TradeOfferDTO, TradeOfferCardDTO } from "@/lib/dtos"
import { toCardDTO } from "./holding.mapper"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

/**
 * Computes the ask price in cents from askType + askValue + market price.
 * - "fixed": askValue is the price in cents
 * - "percent_market": askValue is a percentage of marketPrice (e.g. 80 = 80%)
 * - null/other: returns null (no ask price set)
 */
export function computeAskPrice(
  askType: string | null | undefined,
  askValue: number | null | undefined,
  marketPrice: number | null | undefined
): number | null {
  if (!askType || askValue == null) return null
  if (askType === "fixed") return askValue
  if (askType === "percent_market" && marketPrice != null) {
    return Math.round((askValue / 100) * marketPrice)
  }
  return null
}

export function toTradeOfferCardDTO(row: AnyRow): TradeOfferCardDTO {
  return {
    id: row.id,
    holdingId: row.holdingId,
    card: toCardDTO(row.holding.card),
    condition: row.holding.condition,
    quantity: row.quantity,
    marketValue: row.holding.card.marketPrice ? row.holding.card.marketPrice * row.quantity : null,
  }
}

export function toTradeOfferDTO(row: AnyRow): TradeOfferDTO {
  const offeredCards = (row.offeredCards ?? []).map(toTradeOfferCardDTO)
  const offeredCardsValue = offeredCards.reduce(
    (sum: number, c: TradeOfferCardDTO) => sum + (c.marketValue ?? 0),
    0
  )

  return {
    id: row.id,
    holdingId: row.holdingId,
    card: toCardDTO(row.holding.card),
    cardCondition: row.holding.condition,
    askPrice: computeAskPrice(
      row.holding.askType,
      row.holding.askValue,
      row.holding.card.marketPrice
    ),
    offerUser: {
      id: row.offerUser.id,
      displayName: row.offerUser.displayName ?? null,
      email: row.offerUser.email,
    },
    listingOwner: row.holding?.user
      ? {
          id: row.holding.user.id,
          displayName: row.holding.user.displayName ?? null,
          email: row.holding.user.email,
        }
      : undefined,
    cashAmount: row.cashAmount,
    offeredCards,
    offeredCardsValue,
    message: row.message ?? null,
    status: row.status,
    declineMessage: row.declineMessage ?? null,
    completedAt: row.completedAt ?? null,
    voidedAt: row.voidedAt ?? null,
    createdAt: row.createdAt,
  }
}

export function toTradeBinderItemDTO(row: AnyRow, myOffer?: AnyRow | null): TradeBinderItemDTO {
  const askPrice = computeAskPrice(row.askType, row.askValue, row.card?.marketPrice)

  return {
    holdingId: row.id,
    card: toCardDTO(row.card),
    quantity: row.quantity,
    listedQuantity: row.listedQuantity ?? row.quantity,
    condition: row.condition,
    owner: {
      id: row.user.id,
      displayName: row.user.displayName ?? null,
      email: row.user.email,
    },
    listedAt: row.updatedAt,
    tradeNotes: row.tradeNotes ?? null,
    askType: row.askType ?? null,
    askValue: row.askValue ?? null,
    askPrice,
    offerCount: row._count?.tradeOffers ?? 0,
    myOffer: myOffer ? toTradeOfferDTO(myOffer) : null,
  }
}

export function toTradeBinderItemDTOs(
  rows: AnyRow[],
  myOffers?: Map<string, AnyRow>
): TradeBinderItemDTO[] {
  return rows.map((row) => toTradeBinderItemDTO(row, myOffers?.get(row.id) ?? null))
}
