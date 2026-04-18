/**
 * @file holding.repository.ts
 * @module repositories/holding
 * @description
 *   Data access layer for the Holding model. Per-user card ownership queries.
 *
 * @layer Repository
 * @dependencies prisma client
 */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import type {
  CreateHoldingInput,
  UpdateHoldingInput,
  HoldingFilterInput,
  TradeBinderFilterInput,
} from "@/lib/types"

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

const HOLDING_LIST_SELECT = {
  id: true,
  userId: true,
  cardId: true,
  quantity: true,
  condition: true,
  notes: true,
  listedForTrade: true,
  listedQuantity: true,
  askType: true,
  askValue: true,
  tradeNotes: true,
  idealQuantity: true,
  maxQuantity: true,
  acquiredPrice: true,
  acquiredAt: true,
  createdAt: true,
  updatedAt: true,
  card: { select: CARD_SELECT },
} as const

export const TRADE_BINDER_SELECT = {
  id: true,
  quantity: true,
  listedQuantity: true,
  condition: true,
  askType: true,
  askValue: true,
  tradeNotes: true,
  updatedAt: true,
  card: { select: CARD_SELECT },
  user: {
    select: { id: true, displayName: true, email: true },
  },
  _count: {
    select: { tradeOffers: { where: { status: "pending" } } },
  },
} as const

const HOLDING_DETAIL_SELECT = {
  ...HOLDING_LIST_SELECT,
  user: {
    select: { id: true, displayName: true, email: true },
  },
} as const

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class HoldingRepository {
  static async findById(id: string) {
    return prisma.holding.findUnique({
      where: { id },
      select: HOLDING_DETAIL_SELECT,
    })
  }

  static async findByUser(userId: string, filter: HoldingFilterInput = {}) {
    const where: Prisma.HoldingWhereInput = { userId }

    if (filter.search) {
      where.card = { name: { contains: filter.search, mode: "insensitive" } }
    }
    if (filter.game) {
      where.card = { ...(where.card as object), game: { equals: filter.game, mode: "insensitive" } }
    }
    if (filter.set) {
      where.card = { ...(where.card as object), set: { equals: filter.set, mode: "insensitive" } }
    }
    if (filter.condition) {
      where.condition = filter.condition
    }
    if (filter.listedForTrade !== undefined) {
      where.listedForTrade = filter.listedForTrade
    }

    return prisma.holding.findMany({
      where,
      select: HOLDING_LIST_SELECT,
      orderBy: { updatedAt: "desc" },
    })
  }

  static async findListed(filter: TradeBinderFilterInput & { excludeUserId?: string } = {}) {
    const where: Prisma.HoldingWhereInput = {
      listedForTrade: true,
      quantity: { gt: 0 },
    }

    if (filter.excludeUserId) {
      where.userId = { not: filter.excludeUserId }
    }
    if (filter.search) {
      where.card = { name: { contains: filter.search, mode: "insensitive" } }
    }
    if (filter.game) {
      where.card = { ...(where.card as object), game: { equals: filter.game, mode: "insensitive" } }
    }
    if (filter.condition) {
      where.condition = filter.condition
    }

    const orderBy: Prisma.HoldingOrderByWithRelationInput =
      filter.sort === "name"
        ? { card: { name: "asc" } }
        : filter.sort === "set"
          ? { card: { set: "asc" } }
          : filter.sort === "owner"
            ? { user: { displayName: "asc" } }
            : { updatedAt: "desc" }

    return prisma.holding.findMany({
      where,
      select: TRADE_BINDER_SELECT,
      orderBy,
      take: 100,
    })
  }

  static async create(userId: string, input: CreateHoldingInput) {
    return prisma.holding.create({
      data: {
        userId,
        cardId: input.cardId,
        quantity: input.quantity ?? 1,
        condition: input.condition ?? "NM",
        notes: input.notes,
        listedForTrade: input.listedForTrade ?? false,
        tradeNotes: input.tradeNotes,
        idealQuantity: input.idealQuantity ?? 0,
        maxQuantity: input.maxQuantity ?? 0,
        acquiredPrice: input.acquiredPrice,
        acquiredAt: input.acquiredAt,
      },
      include: { card: true },
    })
  }

  static async update(id: string, input: UpdateHoldingInput) {
    return prisma.holding.update({
      where: { id },
      data: input,
      include: { card: true },
    })
  }

  static async delete(id: string) {
    await prisma.holding.delete({ where: { id } })
  }

  static async upsertFromImport(
    userId: string,
    cardId: string,
    data: { quantity: number; condition: string; notes?: string }
  ) {
    return prisma.holding.upsert({
      where: {
        user_printing_condition: {
          userId,
          cardId,
          condition: data.condition,
        },
      },
      create: {
        userId,
        cardId,
        quantity: data.quantity,
        condition: data.condition,
        notes: data.notes,
      },
      update: {
        quantity: { increment: data.quantity },
      },
      include: { card: true },
    })
  }

  static async countByUser(userId: string): Promise<number> {
    const result = await prisma.holding.aggregate({
      where: { userId },
      _sum: { quantity: true },
    })
    return result._sum.quantity ?? 0
  }

  static async countUniquePrintingsByUser(userId: string): Promise<number> {
    return prisma.holding.count({ where: { userId } })
  }

  static async sumValueByUser(userId: string): Promise<number> {
    const holdings = await prisma.holding.findMany({
      where: { userId },
      select: { quantity: true, card: { select: { marketPrice: true } } },
    })
    return holdings.reduce((sum, h) => sum + (h.card.marketPrice ?? 0) * h.quantity, 0)
  }

  static async findRecentByUser(userId: string, take: number = 5) {
    return prisma.holding.findMany({
      where: { userId },
      select: HOLDING_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      take,
    })
  }

  static async countListedByUser(userId: string): Promise<number> {
    return prisma.holding.count({ where: { userId, listedForTrade: true } })
  }

  static async getTopGamesByUser(userId: string): Promise<{ game: string; count: number }[]> {
    const result = await prisma.$queryRaw<{ game: string; count: bigint }[]>`
      SELECT c.game, COUNT(*)::bigint as count
      FROM "Holding" h
      JOIN "Card" c ON h."cardId" = c.id
      WHERE h."userId" = ${userId}
      GROUP BY c.game
      ORDER BY count DESC
    `
    return result.map((r) => ({ game: r.game, count: Number(r.count) }))
  }

  static async getTailnetTotalUsers(): Promise<number> {
    return prisma.user.count()
  }

  static async getTailnetTotalListings(): Promise<number> {
    return prisma.holding.count({ where: { listedForTrade: true, quantity: { gt: 0 } } })
  }

  static async getTrendingCards(take: number = 5) {
    const result = await prisma.$queryRaw<{ cardId: string; ownerCount: bigint }[]>`
      SELECT "cardId", COUNT(DISTINCT "userId")::bigint as "ownerCount"
      FROM "Holding"
      WHERE quantity > 0
      GROUP BY "cardId"
      ORDER BY "ownerCount" DESC
      LIMIT ${take}
    `
    const cardIds = result.map((r) => r.cardId)
    const cards = await prisma.card.findMany({
      where: { id: { in: cardIds } },
      select: CARD_SELECT,
    })
    return result.map((r) => ({
      card: cards.find((c) => c.id === r.cardId)!,
      ownerCount: Number(r.ownerCount),
    }))
  }

  static async getRecentListings(take: number = 5) {
    return prisma.holding.findMany({
      where: { listedForTrade: true, quantity: { gt: 0 } },
      select: TRADE_BINDER_SELECT,
      orderBy: { updatedAt: "desc" },
      take,
    })
  }

  static async findForExport(userId: string) {
    return prisma.holding.findMany({
      where: { userId, quantity: { gt: 0 } },
      orderBy: { card: { name: "asc" } },
      select: {
        quantity: true,
        condition: true,
        acquiredPrice: true,
        listedForTrade: true,
        card: {
          select: {
            name: true,
            setName: true,
            collectorNumber: true,
            finish: true,
            game: true,
            marketPrice: true,
          },
        },
      },
    })
  }
}
