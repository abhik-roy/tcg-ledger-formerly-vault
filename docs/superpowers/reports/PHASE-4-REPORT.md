# Phase 4 Report: Admin UI Retarget

## Summary

Retargeted all admin pages, actions, components, and API routes from the retail storefront model (inventory/orders/customers/POS) to the personal collection tracker model (Card+Holding/trade-binder/targets).

## Route Renames

- `src/app/admin/(dashboard)/inventory` -> `collection`
- `src/app/admin/(dashboard)/buylist` -> `targets`
- `src/app/api/inventory/export` -> `src/app/api/collection/export`
- `src/app/actions/inventory.ts` -> `holding.ts`
- Created new route: `src/app/admin/(dashboard)/trade-binder/page.tsx`

## Action Files Rewritten (6 rewritten, 1 created)

| File                | Changes                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `holding.ts`        | CRUD for holdings, trade listing toggle, ledger entries. Uses `requireUser` + `requireOwnership`. |
| `buylist.ts`        | Now wraps `PersonalTargetsService` for ideal/max quantity targets.                                |
| `dashboard.ts`      | Returns `DashboardPersonalStats` + `DashboardTailnetStats` via `DashboardService`.                |
| `import-helpers.ts` | Scryfall identify + `addCardToCollection` (upserts Card, creates Holding).                        |
| `settings.ts`       | Uses `requireAdmin`, returns `ActionResult<StoreSettingsDTO>`.                                    |
| `team.ts`           | Uses `requireAdmin`, 2-flag permissions (`inventoryUpdatePrices`, `addCardsAccess`).              |
| `trade-binder.ts`   | **NEW** - `getTradeBinder` action wrapping `HoldingService.listTradeBinder`.                      |

## Admin Pages Updated (8 pages)

- **Dashboard**: Replaced retail stats (revenue/orders/customers) with personal stats (totalCards, uniquePrintings, totalValueCents, topGames) + Tailnet stats (totalUsers, totalListings, trendingCards, recentListings).
- **Collection** (was Inventory): Server component -> `CollectionClient` with holdings table, inline edit, trade toggle, CSV export.
- **Targets** (was Buylist): Server component -> `TargetsClient` with ideal/max quantity editing per holding.
- **Trade Binder**: **NEW** page with search, game/condition filters, card grid of trade-listed holdings.
- **Login**: Removed "Return to Shop" link, changed heading from "TCG Vault" to "TCG Ledger", removed `loginType` field.
- **Add Cards**: Updated to use `searchCatalogAction` from import-helpers, `AddCardBtn` replaces `AddStockBtn`.
- **Ledger**: Uses new `LedgerEntryDTO` shape (type: "quantity"/"price", delta instead of amount).
- **Settings**: Removed POS and Shipping sections. Uses `StoreSettingsDTO`.
- **Users**: Updated to `TeamMemberDTO`, 2-flag permissions, ADMIN/USER roles (not TEAM).

## Sidebar Navigation Updated

Order: Dashboard > Collection > Targets > Add Cards > Ledger > Trade Binder | Users (ADMIN) > Settings (ADMIN)
Removed: Orders, Customers, POS entries.

## Components Created/Updated

| Component               | Status                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `CollectionClient.tsx`  | **NEW** - Holdings table with edit/delete/trade toggle                               |
| `TargetsClient.tsx`     | **NEW** - Target editing with save per row                                           |
| `TradeBinderClient.tsx` | **NEW** - Card grid with search/filter                                               |
| `AddCardBtn.tsx`        | **NEW** - Replaces AddStockBtn for holdings                                          |
| `CardDetailDialog.tsx`  | **NEW** - Card image + details dialog                                                |
| `LedgerTable.tsx`       | Rewritten for `LedgerEntryDTO` (removed order grouping, POS/customer source filters) |
| `AdminSidebar.tsx`      | Updated nav items, ADMIN/USER badge                                                  |
| `SearchPanel.tsx`       | Uses `searchCatalogAction` + `CardDTO`                                               |
| `BulkUploadPanel.tsx`   | Uses `addCardToCollection` instead of `bulkImportAction`                             |
| `SettingsClient.tsx`    | Removed POS/Shipping sections, uses `StoreSettingsDTO`                               |
| `SettingsNav.tsx`       | Simplified to General + Account + Appearance                                         |
| `TeamClient.tsx`        | Uses `TeamMemberDTO`, 2-flag perms                                                   |
| `InviteUserModal.tsx`   | ADMIN/USER roles, 2 permission flags                                                 |
| `EditUserModal.tsx`     | ADMIN/USER roles, 2 permission flags                                                 |

## Components Shelved

Moved to `src/_shelved/admin-components/`:

- InventoryDashboardClient, InventoryTable, InventoryGrid
- BuylistManager, BulkActionBar, BulkPriceEditModal, BulkStockEditModal, BulkDeleteConfirmDialog, BulkBuyPriceModal
- CardHistoryModal, QRCodeModal, AddStockBtn, StatusBadge
- PosSection, ShippingSection
- ProductCard

## API Routes Updated

- `src/app/api/collection/export/route.ts` - Exports holdings as CSV
- `src/app/api/admin/ledger/export/route.ts` - Uses `LedgerEntryDTO` shape

## Auth Changes

- `next-auth.d.ts`: Roles simplified to `ADMIN | USER` (removed `TEAM`, `CUSTOMER`)
- Permissions reduced to 2 flags: `inventoryUpdatePrices`, `addCardsAccess`
- All actions use `requireUser()` or `requireAdmin()` from `@/lib/auth-guard`
- Holding mutations additionally call `requireOwnership(holdingId, userId)`

## Gate Results

- `npm run typecheck`: 0 errors (source files; test fixtures have expected breakage)
- `npm run lint`: 0 errors, 11 warnings (all pre-existing)
