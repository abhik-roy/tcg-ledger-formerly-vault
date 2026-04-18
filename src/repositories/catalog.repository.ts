/**
 * @file catalog.repository.ts
 * @module repositories/catalog
 * @description
 *   Data access layer for the Card catalog. Prisma queries for Card table.
 *
 * @layer Repository
 * @dependencies prisma client
 */

import { prisma } from "@/lib/prisma"
import type { CreateCardInput } from "@/lib/types"

const CARD_LIST_SELECT = {
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

export class CatalogRepository {
  static async findCardByPrintingKey(key: {
    name: string
    set: string
    collectorNumber: string
    finish: string
  }) {
    return prisma.card.findUnique({
      where: {
        printing_key: {
          name: key.name,
          set: key.set,
          collectorNumber: key.collectorNumber,
          finish: key.finish,
        },
      },
    })
  }

  static async findCardByScryfallId(scryfallId: string) {
    return prisma.card.findUnique({ where: { scryfallId } })
  }

  static async findById(id: string) {
    return prisma.card.findUnique({ where: { id } })
  }

  static async upsertCard(input: CreateCardInput) {
    const printingKey = {
      name: input.name,
      set: input.set,
      collectorNumber: input.collectorNumber,
      finish: input.finish,
    }

    return prisma.card.upsert({
      where: { printing_key: printingKey },
      create: {
        ...input,
        marketPriceAt: input.marketPrice != null ? new Date() : undefined,
      },
      update: {
        setName: input.setName,
        game: input.game,
        rarity: input.rarity,
        imageSmall: input.imageSmall,
        imageNormal: input.imageNormal,
        scryfallId: input.scryfallId,
        tcgplayerId: input.tcgplayerId,
        ...(input.marketPrice != null
          ? { marketPrice: input.marketPrice, marketPriceAt: new Date() }
          : {}),
      },
    })
  }

  static async searchCards(query: string, game?: string, take: number = 20) {
    return prisma.card.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        ...(game ? { game: { equals: game, mode: "insensitive" } } : {}),
      },
      select: CARD_LIST_SELECT,
      take,
      orderBy: { name: "asc" },
    })
  }

  static async updateMarketPrice(cardId: string, price: number) {
    return prisma.card.update({
      where: { id: cardId },
      data: { marketPrice: price, marketPriceAt: new Date() },
    })
  }

  static async findByNameAndNumber(name: string, collectorNumber?: string) {
    return prisma.card.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(collectorNumber ? { collectorNumber: { equals: collectorNumber } } : {}),
      },
    })
  }

  static async findManyPaginated(params: { skip: number; take: number; query?: string }) {
    const where = params.query
      ? {
          OR: [
            { name: { contains: params.query, mode: "insensitive" as const } },
            { set: { contains: params.query, mode: "insensitive" as const } },
          ],
        }
      : {}

    const [rows, total] = await Promise.all([
      prisma.card.findMany({
        where,
        skip: params.skip,
        take: params.take,
        select: CARD_LIST_SELECT,
        orderBy: params.query ? { name: "asc" } : { set: "desc" },
      }),
      prisma.card.count({ where }),
    ])

    return { rows, total }
  }
}
