/**
 * @file ledger.mapper.ts
 * @module mappers/ledger
 * @description
 *   Pure mapping functions for quantityLog and priceLog → LedgerEntryDTO.
 *
 * @layer Mapper
 */

import type { LedgerEntryDTO } from "@/lib/dtos"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuantityLogRow = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PriceLogRow = Record<string, any>

export function fromQuantityLog(row: QuantityLogRow): LedgerEntryDTO {
  return {
    id: row.id,
    type: "quantity",
    userId: row.userId,
    cardName: row.cardName ?? row.cardname,
    cardSet: row.cardSet ?? undefined,
    condition: row.condition ?? null,
    finish: row.finish ?? null,
    delta: row.delta ?? row.amount,
    reason: row.reason ?? null,
    actorId: row.actorId ?? undefined,
    time: row.time,
  }
}

export function fromPriceLog(row: PriceLogRow): LedgerEntryDTO {
  return {
    id: row.id,
    type: "price",
    cardName: row.cardname ?? row.cardName,
    finish: row.finish ?? null,
    oldPrice: row.oldPrice,
    newPrice: row.newPrice,
    source: row.source ?? undefined,
    time: row.time,
  }
}

export function fromQuantityLogs(rows: QuantityLogRow[]): LedgerEntryDTO[] {
  return rows.map(fromQuantityLog)
}

export function fromPriceLogs(rows: PriceLogRow[]): LedgerEntryDTO[] {
  return rows.map(fromPriceLog)
}

export function toMergedLedger(
  quantityLogs: QuantityLogRow[],
  priceLogs: PriceLogRow[]
): LedgerEntryDTO[] {
  const qEntries = fromQuantityLogs(quantityLogs)
  const pEntries = fromPriceLogs(priceLogs)
  return [...qEntries, ...pEntries].sort((a, b) => b.time.getTime() - a.time.getTime())
}
