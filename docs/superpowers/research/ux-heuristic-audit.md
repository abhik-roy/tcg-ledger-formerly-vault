# UX Heuristic Audit

**Date:** 2026-04-16
**Methodology:** Nielsen's 10 heuristics, WCAG 2.2 AA, Fitts's Law, mobile viewport (375-428px)

## Top 10 Prioritized Findings

| #   | Severity | Finding                                                                 | File                          | Effort |
| --- | -------- | ----------------------------------------------------------------------- | ----------------------------- | ------ |
| 1   | Critical | No mobile navigation — sidebar blocks content at 375px                  | `AdminSidebar.tsx` L84        | M      |
| 2   | Critical | Dashboard shows store metrics, not collection data                      | `(dashboard)/page.tsx` L22-91 | L      |
| 3   | High     | Stale retail terminology throughout (Inventory, Buylist, SKUs, Revenue) | Multiple                      | M      |
| 4   | High     | 10px/9px font sizes violate accessibility minimums                      | `globals.css` L180-191        | S      |
| 5   | High     | Inventory table has no mobile card layout                               | `InventoryTable.tsx`          | M      |
| 6   | High     | Buylist permissions reference dropped schema columns                    | `BuylistManager.tsx` L149-150 | S      |
| 7   | High     | Ledger source filters reference shelved concepts (POS, Customer Order)  | `LedgerTable.tsx` L483-497    | S      |
| 8   | High     | Team permission labels reference 5 dropped flags                        | `TeamClient.tsx` L15-23       | S      |
| 9   | High     | Settings contains POS and Shipping sections                             | `SettingsClient.tsx` L27-28   | M      |
| 10  | Medium   | Filter dropdowns lack ARIA roles and keyboard navigation                | `InventoryFilter.tsx`         | M      |

## Key Issues by Category

### Navigation (G-1)

Fixed 220px sidebar with no responsive breakpoint. At 375px, sidebar consumes 59% of screen.

### Terminology (G-3)

"Inventory Managers Only", "Return to Shop", "Revenue", "Orders", "Customers", "SKUs", "Store overview" — all retail language.

### Dead Links

- Login "Return to Shop" → `/shop` (shelved)
- Dashboard "View all" → `/admin/orders` (shelved)
- Login default callback → `/admin/inventory` (will become `/admin/collection`)

### Accessibility

- `text-caption` at 10px, role badges at 9px
- Form labels not programmatically associated (`htmlFor`/`id` missing on login)
- Filter dropdowns lack ARIA roles
- Pagination buttons `h-7` (28px) below 44px touch target minimum

### Mobile

Every page blocked by sidebar. Best mobile implementations: Settings (horizontal tab strip), Inventory (expand-row pattern), Ledger (expand-row + horizontal scroll indicator).
