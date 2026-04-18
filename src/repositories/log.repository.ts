/**
 * @file log.repository.ts
 * @module repositories/log
 * @description
 *   Data access layer for the quantityLog and priceLog audit tables.
 *
 * @layer Repository
 * @dependencies prisma client
 */

import { prisma } from "@/lib/prisma"

export class LogRepository {
  static async createQuantityLog(data: {
    userId: string
    holdingId?: string | null
    cardName: string
    cardSet: string
    condition?: string | null
    finish?: string | null
    delta: number
    reason?: string | null
    actorId: string
  }) {
    return prisma.quantityLog.create({
      data: {
        cardName: data.cardName,
        delta: data.delta,
        user: data.actorId,
        time: new Date(),
        finish: data.finish || null,
        userId: data.userId,
        holdingId: data.holdingId || null,
        cardSet: data.cardSet,
        reason: data.reason || null,
        actorId: data.actorId,
      },
    })
  }

  static async createPriceLog(data: {
    cardId: string
    cardname: string
    oldPrice: number
    newPrice: number
    source: string
    user: string
  }) {
    return prisma.priceLog.create({
      data: {
        cardname: data.cardname,
        oldPrice: data.oldPrice,
        newPrice: data.newPrice,
        user: data.user,
        time: new Date(),
        cardId: data.cardId,
        source: data.source,
      },
    })
  }

  static async findQuantityLogByUser(
    userId: string,
    filter?: { from?: Date; to?: Date; cardName?: string },
    take: number = 500
  ) {
    const where: Record<string, unknown> = { userId }
    if (filter?.from || filter?.to) {
      where.time = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      }
    }
    if (filter?.cardName) {
      where.cardName = { contains: filter.cardName, mode: "insensitive" }
    }

    return prisma.quantityLog.findMany({
      where,
      orderBy: { time: "desc" },
      take,
    })
  }

  static async findPriceLogByCard(cardId: string, take: number = 500) {
    return prisma.priceLog.findMany({
      where: { cardId },
      orderBy: { time: "desc" },
      take,
    })
  }

  static async findRecentQuantityLogs(limit: number = 50) {
    return prisma.quantityLog.findMany({
      take: limit,
      orderBy: { time: "desc" },
    })
  }

  static async findRecentPriceLogs(limit: number = 50) {
    return prisma.priceLog.findMany({
      take: limit,
      orderBy: { time: "desc" },
    })
  }

  static async findAllLogsInRange(startDate: Date, endDate: Date) {
    return prisma.$queryRaw<
      {
        type: string
        id: number
        cardname: string
        user: string
        time: Date
        finish: string | null
        delta: number | null
        oldPrice: number | null
        newPrice: number | null
        userId: string | null
        cardSet: string | null
        reason: string | null
        source: string | null
      }[]
    >`
      SELECT 'quantity' as type, id, cardname, "user", time, finish,
             delta, NULL::int as "oldPrice", NULL::int as "newPrice",
             "userId", "cardSet", reason, NULL::varchar as source
      FROM "quantityLog"
      WHERE time >= ${startDate} AND time <= ${endDate}
      UNION ALL
      SELECT 'price' as type, id, cardname, "user", time, NULL::varchar as finish,
             NULL::int as delta, "oldPrice", "newPrice",
             NULL::varchar as "userId", NULL::varchar as "cardSet", NULL::varchar as reason, source
      FROM "priceLog"
      WHERE time >= ${startDate} AND time <= ${endDate}
      ORDER BY time DESC
      LIMIT 20000
    `
  }
}
