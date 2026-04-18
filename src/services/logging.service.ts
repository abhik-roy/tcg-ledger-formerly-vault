/**
 * @file logging.service.ts
 * @module services/logging
 * @description
 *   Business logic for the audit log (ledger). Logs quantity and price changes,
 *   and retrieves ledger entries.
 *
 * @layer Service
 */

import { LogRepository } from "@/repositories/log.repository"
import { fromQuantityLogs, fromPriceLogs } from "@/mappers/ledger.mapper"
import type { LedgerEntryDTO } from "@/lib/dtos"

export class LoggingService {
  static async logQuantityChange(args: {
    userId: string
    holdingId?: string | null
    cardName: string
    cardSet: string
    condition?: string | null
    finish?: string | null
    delta: number
    reason?: string | null
    actorId: string
  }): Promise<void> {
    await LogRepository.createQuantityLog(args)
  }

  static async logPriceChange(args: {
    cardId: string
    cardname: string
    oldPrice: number
    newPrice: number
    source: string
    user: string
  }): Promise<void> {
    await LogRepository.createPriceLog(args)
  }

  static async listUserLedger(
    userId: string,
    filter?: { from?: Date; to?: Date; cardName?: string }
  ): Promise<LedgerEntryDTO[]> {
    const rows = await LogRepository.findQuantityLogByUser(userId, filter)
    return fromQuantityLogs(rows)
  }

  static async listCardPriceHistory(cardId: string): Promise<LedgerEntryDTO[]> {
    const rows = await LogRepository.findPriceLogByCard(cardId)
    return fromPriceLogs(rows)
  }

  static async listRecentLedger(limit: number = 50): Promise<LedgerEntryDTO[]> {
    const [qLogs, pLogs] = await Promise.all([
      LogRepository.findRecentQuantityLogs(limit),
      LogRepository.findRecentPriceLogs(limit),
    ])
    const all = [...fromQuantityLogs(qLogs), ...fromPriceLogs(pLogs)]
    return all.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, limit)
  }

  static async listAllInRange(startDate: Date, endDate: Date): Promise<LedgerEntryDTO[]> {
    const rows = await LogRepository.findAllLogsInRange(startDate, endDate)
    return rows.map((row) => {
      if (row.type === "quantity") {
        return {
          id: row.id,
          type: "quantity" as const,
          userId: row.userId ?? undefined,
          cardName: row.cardname,
          cardSet: row.cardSet ?? undefined,
          finish: row.finish ?? null,
          delta: row.delta ?? undefined,
          reason: row.reason ?? null,
          time: row.time,
        }
      }
      return {
        id: row.id,
        type: "price" as const,
        cardName: row.cardname,
        oldPrice: row.oldPrice ?? undefined,
        newPrice: row.newPrice ?? undefined,
        source: row.source ?? undefined,
        time: row.time,
      }
    })
  }
}
