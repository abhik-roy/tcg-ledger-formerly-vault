# Phase 3 Report — Backend Data Layer Rewrite + Research

**Date:** 2026-04-16
**Status:** COMPLETE

## Preamble

- Installed `podman-compose` (Fedora)
- Fixed `docker-compose.dev.yml`: full image path (`docker.io/library/postgres:16`), named volume instead of bind mount (rootless Podman permission fix)
- Created migration `20260416171533_pivot_card_holding`
- Applied migration to dev DB — all tables live

## File Changes

### Renames (git mv)

- `src/repositories/inventory.repository.ts` → `holding.repository.ts`
- `src/services/inventory.service.ts` → `holding.service.ts`
- `src/services/buylist.service.ts` → `personal-targets.service.ts`
- `src/mappers/inventory.mapper.ts` → `holding.mapper.ts`

### Full Rewrites

| File                          | Summary                                                                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `holding.repository.ts`       | New: findById, findByUser, findListed (trade binder), create/update/delete, upsertFromImport, countByUser, sumValueByUser, dashboard aggregates. Named SELECT constants: CARD_SELECT, HOLDING_LIST_SELECT, TRADE_BINDER_SELECT, HOLDING_DETAIL_SELECT |
| `holding.service.ts`          | New: listForUser, getById, create, update, delete, toggleListing, listTradeBinder, bulkImportFromCsv                                                                                                                                                  |
| `personal-targets.service.ts` | New: listForUser (holdings with idealQty>0 or maxQty>0), updateTargets                                                                                                                                                                                |
| `holding.mapper.ts`           | New: toCardDTO, toCardDTOs, toHoldingDTO, toHoldingDTOs, toUserSlimDTO                                                                                                                                                                                |
| `trade-binder.mapper.ts`      | New: toTradeBinderItemDTO, toTradeBinderItemDTOs                                                                                                                                                                                                      |
| `auth.ts`                     | Rewrite: single credentials provider, no CUSTOMER branch, lowercase email, session shape: id/email/displayName/role/permissions                                                                                                                       |
| `auth-guard.ts`               | Rewrite: requireUser, requireAdmin, requireOwnership (checks holding.userId or ADMIN)                                                                                                                                                                 |
| `middleware.ts`               | Simplified: single "no token → redirect to /admin/login" check                                                                                                                                                                                        |

### Modifications

| File                     | Changes                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog.repository.ts`  | Added: findCardByPrintingKey, findCardByScryfallId, upsertCard, searchCards, updateMarketPrice. Uses CARD_LIST_SELECT.                                                                                               |
| `log.repository.ts`      | Rewritten for new schema: createQuantityLog (with userId/holdingId/cardSet/reason/actorId), createPriceLog (with cardId/source). findQuantityLogByUser, findPriceLogByCard. UNION ALL query updated for new columns. |
| `settings.repository.ts` | No changes needed                                                                                                                                                                                                    |
| `team.repository.ts`     | Added: updateDisplayName method                                                                                                                                                                                      |
| `catalog.service.ts`     | Rewritten: upsertCard, search, updateMarketPrice, findById                                                                                                                                                           |
| `dashboard.service.ts`   | Rewritten: getPersonalStats (totalCards/uniquePrintings/totalValueCents/recentlyAcquired/topGames), getTailnetStats (totalUsers/totalListings/trendingCards/recentListings)                                          |
| `settings.service.ts`    | Simplified: getGlobal, updateGlobal                                                                                                                                                                                  |
| `team.service.ts`        | Updated: 2-flag permissions, added updateSelfProfile via TeamRepository.updateDisplayName                                                                                                                            |
| `logging.service.ts`     | Rewritten: logQuantityChange, logPriceChange, listUserLedger, listCardPriceHistory, listRecentLedger, listAllInRange                                                                                                 |
| `ledger.mapper.ts`       | Updated: type field now lowercase ('quantity'/'price'), handles new columns (userId, cardSet, reason, actorId, source)                                                                                               |
| `team.mapper.ts`         | Reduced to 2-flag permissions (inventoryUpdatePrices, addCardsAccess)                                                                                                                                                |
| `settings.mapper.ts`     | Default storeName changed to "TCG Ledger"                                                                                                                                                                            |
| `dashboard.mapper.ts`    | Full rewrite for DashboardPersonalStats + DashboardTailnetStats                                                                                                                                                      |
| `catalog.mapper.ts`      | Re-exports toCardDTO from holding.mapper; toCatalogSearchResultDTO returns CardDTO                                                                                                                                   |
| `index.ts`               | Updated barrel: exports holding.mapper, trade-binder.mapper instead of inventory.mapper                                                                                                                              |

## Departures from Spec Interfaces

1. **HoldingRepository.sumValueByUser**: Implemented as in-memory calculation (fetch holdings + sum) rather than raw SQL, since Prisma doesn't support cross-table aggregate in a single query. Acceptable for small collections (<10K holdings).

2. **Dashboard service return types**: Used mapper wrappers (toDashboardPersonalStats, toDashboardTailnetStats) for consistency even though the raw aggregates already match the DTO shape.

3. **Auth session**: `displayName` packed into `name` field in JWT since NextAuth User type doesn't support custom fields without module augmentation. Extracted in session callback.

## Layering Rule Verification

- `grep -r 'NextResponse\|cookies(\|headers(' src/services/` → **0 results** ✓
- `grep -rn 'import.*prisma' src/services/` → **0 results** ✓ (fixed team.service.ts to use TeamRepository.updateDisplayName)
- All repositories contain only Prisma calls ✓
- All mappers are pure functions ✓

## Remaining Typecheck Failures (UI-layer only)

**Total: ~130 errors across 30 files**

| Category                           | Files                                                                                                            | Count |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----- |
| Actions (src/app/actions/)         | buylist, dashboard, import-helpers, inventory, settings, team                                                    | ~25   |
| Admin pages (src/app/admin/)       | dashboard, inventory, buylist, add-cards, ledger, settings, users, login                                         | ~30   |
| Components (src/components/admin/) | BuylistManager, InventoryDashboardClient, InventoryTable, InventoryGrid, LedgerTable, EditUserModal, bulk modals | ~45   |
| API routes (src/app/api/)          | ledger/export, inventory/export                                                                                  | ~5    |
| Tests (src/tests/)                 | inventory mappers, buylist service, inventory bulk, settings, ledger grouping                                    | ~25   |

## Research Reports

All four research deliverables written:

- `docs/superpowers/research/frontend-audit.md` — 7-section component/theming/mobile audit
- `docs/superpowers/research/ux-heuristic-audit.md` — Nielsen heuristic eval, top 10 findings
- `docs/superpowers/research/competitive-analysis.md` — Deckbox/Moxfield/ManaBox/Dragon Shield/Cardsphere
- `docs/superpowers/research/user-journeys.md` — 3 journeys (pack crack, trade browse, bulk price update) with mobile variants
