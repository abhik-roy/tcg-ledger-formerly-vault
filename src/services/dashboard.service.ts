/**
 * @file dashboard.service.ts
 * @module services/dashboard
 * @description
 *   Business logic for dashboard statistics — personal + Tailnet-wide.
 *
 * @layer Service
 */

import { HoldingRepository } from "@/repositories/holding.repository"
import { toHoldingDTOs } from "@/mappers/holding.mapper"
import { toCardDTO } from "@/mappers/holding.mapper"
import { toTradeBinderItemDTOs } from "@/mappers/trade-binder.mapper"
import { toDashboardPersonalStats, toDashboardTailnetStats } from "@/mappers/dashboard.mapper"
import type { DashboardPersonalStats, DashboardTailnetStats } from "@/lib/dtos"

export class DashboardService {
  static async getPersonalStats(userId: string): Promise<DashboardPersonalStats> {
    const [totalCards, uniquePrintings, totalValueCents, recentRows, topGames] = await Promise.all([
      HoldingRepository.countByUser(userId),
      HoldingRepository.countUniquePrintingsByUser(userId),
      HoldingRepository.sumValueByUser(userId),
      HoldingRepository.findRecentByUser(userId, 5),
      HoldingRepository.getTopGamesByUser(userId),
    ])

    return toDashboardPersonalStats({
      totalCards,
      uniquePrintings,
      totalValueCents,
      recentlyAcquired: toHoldingDTOs(recentRows),
      topGames,
    })
  }

  static async getTailnetStats(): Promise<DashboardTailnetStats> {
    const [totalUsers, totalListings, trendingRaw, recentListingsRaw] = await Promise.all([
      HoldingRepository.getTailnetTotalUsers(),
      HoldingRepository.getTailnetTotalListings(),
      HoldingRepository.getTrendingCards(5),
      HoldingRepository.getRecentListings(5),
    ])

    return toDashboardTailnetStats({
      totalUsers,
      totalListings,
      trendingCards: trendingRaw.map((r) => ({
        card: toCardDTO(r.card),
        ownerCount: r.ownerCount,
      })),
      recentListings: toTradeBinderItemDTOs(recentListingsRaw),
    })
  }
}
