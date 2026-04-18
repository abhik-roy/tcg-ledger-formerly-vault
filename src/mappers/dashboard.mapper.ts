/**
 * @file dashboard.mapper.ts
 * @module mappers/dashboard
 * @description
 *   Pure mapping functions for dashboard statistics.
 *
 * @layer Mapper
 */

import type {
  DashboardPersonalStats,
  DashboardTailnetStats,
  HoldingDTO,
  CardDTO,
  TradeBinderItemDTO,
} from "@/lib/dtos"

export function toDashboardPersonalStats(raw: {
  totalCards: number
  uniquePrintings: number
  totalValueCents: number
  recentlyAcquired: HoldingDTO[]
  topGames: { game: string; count: number }[]
}): DashboardPersonalStats {
  return {
    totalCards: raw.totalCards,
    uniquePrintings: raw.uniquePrintings,
    totalValueCents: raw.totalValueCents,
    recentlyAcquired: raw.recentlyAcquired,
    topGames: raw.topGames,
  }
}

export function toDashboardTailnetStats(raw: {
  totalUsers: number
  totalListings: number
  trendingCards: { card: CardDTO; ownerCount: number }[]
  recentListings: TradeBinderItemDTO[]
}): DashboardTailnetStats {
  return {
    totalUsers: raw.totalUsers,
    totalListings: raw.totalListings,
    trendingCards: raw.trendingCards,
    recentListings: raw.recentListings,
  }
}
