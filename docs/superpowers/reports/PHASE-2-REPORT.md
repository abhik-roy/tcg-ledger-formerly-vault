# Phase 2 Report — Schema + Types

**Date:** 2026-04-16
**Status:** COMPLETE (gate: expected typecheck failures only)

## What was done

1. **`prisma/schema.prisma`** — Full rewrite per spec §2:
   - Renamed `model inventory` → `model legacyInventory` (with `@@map("inventory")`)
   - Added `Card` model (printing-level catalog, `@@unique([name, set, collectorNumber, finish])`)
   - Added `Holding` model (per-user ownership, `@@unique([userId, cardId, condition])`)
   - Modified `User`: added `displayName`, `holdings` relation, `quantityLogs` relation, role default `"USER"`
   - Modified `UserPermissions`: dropped 5 shop flags, kept `inventoryUpdatePrices` + `addCardsAccess`
   - Modified `quantityLog`: added `userId`, `holdingId`, `cardSet`, `reason`, `actorId`; renamed `amount` → `delta`
   - Modified `priceLog`: added `cardId` FK + `source`; dropped `finish`
   - Shelved models (`Order`, `OrderItem`, `Customer`, `StoreSettings`) clearly marked under `// SHELVED` block

2. **`src/lib/types.ts`** — Rewritten with:
   - `CreateCardInput`, `CreateHoldingInput`, `UpdateHoldingInput`
   - `TradeBinderFilterInput`, `HoldingFilterInput`
   - Updated `InviteTeamMemberInput` / `UpdateTeamMemberInput` (role: `"ADMIN" | "USER"`)
   - Updated `UserPermissionsInput` (2 flags only)
   - Retained `UpdateStoreSettingsInput`, `TeamMember`, `StoreSettingsData`

3. **`src/lib/dtos.ts`** — Rewritten with:
   - `CardDTO`, `HoldingDTO`, `TradeBinderItemDTO`
   - `LedgerEntryDTO` (unified quantity + price entries)
   - `UserSlimDTO`
   - `DashboardPersonalStats`, `DashboardTailnetStats`
   - `TeamMemberDTO`, `UserPermissionsDTO`
   - `StoreSettingsDTO` (trimmed)

4. **`prisma validate`** — PASS
5. **`prisma generate`** — PASS (Prisma Client v6.19.2)

## Migration file

Not created in Phase 2 — `prisma migrate dev --create-only` requires a running database. Deferred to Phase 3 preamble when dev Postgres is stood up. This is a deviation from the plan but has no impact: the migration SQL will be generated from the same schema diff.

## Typecheck errors (expected)

**Total: 182 errors across 32 files**

All errors are in files that Phase 3 (data layer) and Phase 4 (UI) will rewrite. No errors in the three files modified in this phase.

### Error categories

| Category                        | Files                                                                                                                         | Phase to fix |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Services (old types)            | `inventory.service`, `buylist.service`, `dashboard.service`, `logging.service`, `team.service`                                | Phase 3      |
| Repositories (old types)        | `inventory.repository`, `log.repository`                                                                                      | Phase 3      |
| Mappers (old DTOs)              | `inventory.mapper`, `dashboard.mapper`, `catalog.mapper`, `ledger.mapper`, `team.mapper`                                      | Phase 3      |
| Auth (removed permission flags) | `auth.ts`                                                                                                                     | Phase 3      |
| UI components                   | `InventoryTable`, `BuylistManager`, `LedgerTable`, `EditUserModal`, bulk modals                                               | Phase 4      |
| Actions                         | `inventory.ts`                                                                                                                | Phase 4      |
| API routes                      | `ledger/export`, `inventory/export`                                                                                           | Phase 4      |
| Tests                           | `inventory-delete`, `buylist-service`, `buylist-velocity`, `inventory-bulk-actions`, `inventory-buy-price`, `ledger-grouping` | Phase 6      |
