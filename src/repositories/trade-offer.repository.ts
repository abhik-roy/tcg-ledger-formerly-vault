/**
 * @file trade-offer.repository.ts
 * @module repositories/trade-offer
 * @description
 *   Data access layer for the TradeOffer model. Manages trade offers
 *   on listed holdings including offered cards.
 *
 * @layer Repository
 * @dependencies prisma client
 */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

// ---------------------------------------------------------------------------
// Named SELECT constants
// ---------------------------------------------------------------------------

const CARD_SELECT = {
  id: true,
  name: true,
  set: true,
  setName: true,
  collectorNumber: true,
  finish: true,
  game: true,
  rarity: true,
  imageSmall: true,
  imageNormal: true,
  marketPrice: true,
  marketPriceAt: true,
} as const

const OFFERED_CARD_SELECT = {
  id: true,
  holdingId: true,
  quantity: true,
  holding: {
    select: {
      condition: true,
      card: { select: CARD_SELECT },
    },
  },
} as const

const OFFER_SELECT = {
  id: true,
  holdingId: true,
  offerUserId: true,
  cashAmount: true,
  message: true,
  status: true,
  declineMessage: true,
  completedAt: true,
  voidedAt: true,
  createdAt: true,
  updatedAt: true,
  offerUser: {
    select: { id: true, displayName: true, email: true },
  },
  offeredCards: {
    select: OFFERED_CARD_SELECT,
  },
  holding: {
    select: {
      id: true,
      userId: true,
      condition: true,
      askType: true,
      askValue: true,
      listedForTrade: true,
      listedQuantity: true,
      quantity: true,
      card: { select: CARD_SELECT },
      user: {
        select: { id: true, displayName: true, email: true },
      },
    },
  },
} as const

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class TradeOfferRepository {
  static async create(data: {
    holdingId: string
    offerUserId: string
    cashAmount: number
    message?: string | null
    offeredCards: { holdingId: string; quantity: number }[]
  }) {
    return prisma.tradeOffer.create({
      data: {
        holdingId: data.holdingId,
        offerUserId: data.offerUserId,
        cashAmount: data.cashAmount,
        message: data.message ?? null,
        offeredCards: {
          create: data.offeredCards.map((c) => ({
            holdingId: c.holdingId,
            quantity: c.quantity,
          })),
        },
      },
      select: OFFER_SELECT,
    })
  }

  static async findById(id: string) {
    return prisma.tradeOffer.findUnique({
      where: { id },
      select: OFFER_SELECT,
    })
  }

  static async findByOfferUser(userId: string) {
    return prisma.tradeOffer.findMany({
      where: { offerUserId: userId },
      select: OFFER_SELECT,
      orderBy: { createdAt: "desc" },
    })
  }

  /**
   * Finds all offers on holdings owned by the given user.
   */
  static async findOffersOnUserListings(userId: string) {
    return prisma.tradeOffer.findMany({
      where: {
        holding: { userId },
      },
      select: OFFER_SELECT,
      orderBy: { createdAt: "desc" },
    })
  }

  static async findPendingByHoldingAndUser(holdingId: string, userId: string) {
    return prisma.tradeOffer.findFirst({
      where: {
        holdingId,
        offerUserId: userId,
        status: "pending",
      },
      select: OFFER_SELECT,
    })
  }

  static async countPendingOnUserListings(userId: string): Promise<number> {
    return prisma.tradeOffer.count({
      where: {
        status: "pending",
        holding: { userId },
      },
    })
  }

  static async updateStatus(
    id: string,
    status: string,
    extra: Partial<{
      declineMessage: string | null
      completedAt: Date | null
      voidedAt: Date | null
    }> = {}
  ) {
    return prisma.tradeOffer.update({
      where: { id },
      data: { status, ...extra },
      select: OFFER_SELECT,
    })
  }

  /**
   * Auto-decline all pending offers on a holding, optionally excluding one offer.
   */
  static async declinePendingByHolding(
    holdingId: string,
    excludeOfferId?: string,
    message?: string
  ) {
    const where: Prisma.TradeOfferWhereInput = {
      holdingId,
      status: "pending",
    }
    if (excludeOfferId) {
      where.id = { not: excludeOfferId }
    }

    return prisma.tradeOffer.updateMany({
      where,
      data: {
        status: "declined",
        declineMessage: message ?? "Another offer was accepted",
      },
    })
  }
}
