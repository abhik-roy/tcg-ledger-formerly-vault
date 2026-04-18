# Frontend Audit — TCG Ledger Admin UI

**Date:** 2026-04-16
**Branch:** `pivot/personal-tracker`

## 1. shadcn/Radix Inventory

12 @radix-ui packages installed. 10/19 ui/ components actively used from retained pages. 9 orphaned (accordion, alert-dialog, card, pagination, scroll-area, separator, sheet, skeleton, theme-toggle).

**Parallel modal systems:** `AdminModal.tsx` uses raw Radix Dialog directly while 5 other files use shadcn `dialog.tsx`.

**Installed but unused:** `@tanstack/react-table` (tables are hand-rolled), `recharts` (dashboard chart is hand-rolled SVG).

## 2. Per-Page Component Map

- **Login:** Custom inputs (not shadcn), `ShieldCheck` icon, dead `/shop` link
- **Dashboard:** Revenue/Orders/Customers/SKUs stats (all retail), hand-rolled SVG chart, dead `/admin/orders` link
- **Inventory:** `InventoryDashboardClient` (522 lines, most complex), `InventoryTable`/`InventoryGrid`, bulk modals, `QRCodeModal`
- **Add Cards:** `SearchPanel` + `BulkUploadPanel` with custom tab toggle
- **Buylist:** `BuylistManager` with inline editing, references dropped permission flags
- **Ledger:** `LedgerTable` (1026 lines), dead `sheetTrigger` wiring for shelved `LedgerOrderSheet`
- **Settings:** `SettingsClient` with desktop sidebar + mobile tab strip, POS/Shipping sections (retail-specific)
- **Users:** `TeamClient` with hand-rolled portal modals, references 7 permission flags (only 2 remain)

## 3. Tailwind Theming

All colors via CSS custom properties. Full dark mode coverage — every retained page uses semantic tokens. Primary: indigo-500/400. `ThemeToggle` component exists but not placed in any layout.

Custom type classes: `.text-caption` (10px), `.text-label` (11px), `.text-body` (13px) — the 10px class violates accessibility minimums.

## 4. Retained vs Orphaned

**Orphaned ui/ components:** accordion, alert-dialog, card, pagination, scroll-area, separator, sheet, skeleton, theme-toggle

**Orphaned admin/ components:** `OrderDetailsModal.tsx`, `layout.tsx` (stale duplicate)

**Orphaned domain/ components:** `FilterSidebar.tsx`, `ProductCard.tsx`

## 5. Genericness Issues

- Login: standard SaaS shield-icon template, stale "TCG Vault Admin" heading
- Dashboard: Vercel analytics clone — 2×2 panel grid, all retail KPIs
- Toolbar pattern: identical search+import+export+toggle across inventory/buylist/ledger
- Empty states: same icon-in-box + heading + muted text pattern everywhere
- Stats strips: identical h-14 border-b number+label pattern on 5 pages
- Settings: retail config (Store Name, Tax Rate, POS PIN, Shipping Rates)
- Modal headers: uniform icon-in-box pattern regardless of function
- Sidebar: default shadcn admin nav with no TCG identity

## 6. Typography

Single font: Inter. No monospace font loaded. Largest text: `text-2xl` (24px) on login only. Most pages peak at `text-sm` (14px) for headings. No H1 on most admin pages. `text-xs` and `.text-body` mixed inconsistently.

## 7. Mobile Readiness

**Primary blocker:** 220px always-visible sidebar leaves 170px for content at 390px — completely unusable. No hamburger, drawer, or bottom nav exists.

| Page               | Mobile Ready?                                      |
| ------------------ | -------------------------------------------------- |
| Login              | Yes (no sidebar)                                   |
| Dashboard          | Partially (needs sidebar fix)                      |
| Inventory          | Partially (has expand-row, best mobile table)      |
| Add Cards (Search) | Partially                                          |
| Add Cards (Bulk)   | No (8-column table, no responsive)                 |
| Buylist            | Partially (good column-collapse)                   |
| Ledger             | Partially (has expand-row + horizontal scroll)     |
| Settings           | Partially (best mobile nav — horizontal tab strip) |
| Users              | No (5-column table, no responsive)                 |
