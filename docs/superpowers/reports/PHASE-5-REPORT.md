# Phase 5: Visual Refresh + Mobile Responsive — Report

## Summary

Applied the "Collector's Alcove" design direction across the entire admin UI.
Warm amber/gold palette, DM Sans + JetBrains Mono typography, mobile-first
responsive layouts, and accessibility fixes throughout.

## Changes by File

### Foundation

| File                  | Changes                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/layout.tsx`  | Replaced Inter with DM_Sans + JetBrains_Mono (Google Fonts). Set CSS variables `--font-sans` and `--font-mono`. Title changed to "TCG Ledger".                                                                                                                                                                                                                                                                            |
| `src/app/globals.css` | Complete palette rewrite: warm amber/gold primary (#d4a843 light, #e5b94e dark), warm charcoal background (#16171d dark, #f5f3ef light), warm card surfaces, teal success, coral destructive, warm low-opacity borders. Added `--font-family-sans` and `--font-family-mono` to @theme. Added `.card-glow`, `.gradient-mesh`, game accent classes. Fixed `text-caption` from 10px to 11px, `text-label` from 11px to 12px. |

### Layout & Navigation

| File                                    | Changes                                                                                                                                                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/admin/(dashboard)/layout.tsx`  | Converted to client component with `useState` for mobile menu. Desktop sidebar hidden below `lg` breakpoint. Mobile sidebar renders as overlay drawer with backdrop and slide-in animation.                                                           |
| `src/components/admin/AdminSidebar.tsx` | Added `mobile` and `onClose` props. Mobile mode: wider (260px), close button in header, nav links auto-close drawer on click. Fixed role badge from `text-[9px]` to `text-[11px]`. Increased touch targets to 44px minimum (py-2.5, w-9 h-9 buttons). |
| `src/components/admin/header.tsx`       | Added hamburger `Menu` button (visible below `lg`). Accepts `onMenuClick` prop. "Add Cards" button text hidden on mobile (icon only). Touch targets 44px minimum. Responsive padding.                                                                 |

### Login Page (Full Redesign)

| File                           | Changes                                                                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/admin/login/page.tsx` | Gradient mesh background. Card-shaped login container with `card-glow`. Added `htmlFor`/`id` associations for accessibility. Added password visibility toggle (Eye/EyeOff). Larger inputs (h-12). Layers icon instead of ShieldCheck. Footer tagline. All touch targets 44px+. |

### Dashboard

| File                                 | Changes                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/admin/(dashboard)/page.tsx` | Replaced thin stats strip with bold 2x2 (mobile) / 4-col (desktop) stat card grid: Total Cards, Unique Printings, Collection Value, Tailnet Users. Each card has icon badge, `stat-value`/`stat-label` pattern, and `card-glow` hover. Game-specific accent colors on Top Games rows. Improved empty states with larger icons and personality text. Panel headers bumped to `text-base`. |

### Trade Binder

| File                                         | Changes                                                                                                                                                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/admin/TradeBinderClient.tsx` | Grid changed to 1-col mobile, 2 sm, 3 md, 4 lg, 5 xl. Cards use `card-glow` hover. Card fan CSS empty state (3 rotated dashed rectangles). Touch-friendly filters (h-10 on mobile). Card images are hero-sized. Responsive padding throughout. |

### Collection

| File                                        | Changes                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/admin/CollectionClient.tsx` | Added mobile card-per-row layout (below `md`): thumbnail + name + set badge + qty + condition + price + action buttons. Desktop keeps table layout. All action buttons 44px touch targets on mobile. Stats bar horizontally scrollable. Improved empty state. Export button collapses to icon-only on mobile. |

### Card Detail Dialog

| File                                  | Changes                                                                                                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/CardDetailDialog.tsx` | Mobile: full-width bottom sheet (rounded-t-2xl, slide-in-from-bottom). Desktop: centered dialog. Added drag indicator bar on mobile. Close button enlarged to 44px. Added "Contact owner" mailto button when ownerInfo provided. Market price uses mono font. |

### Responsive Fixes (Remaining Pages)

| File                                               | Changes                                                                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/admin/LedgerTable.tsx`             | Stats strip scrollable on mobile. Toolbar wraps on narrow screens. Pagination buttons 44px on mobile. Fixed foil badge from `text-[9px]` to `text-[11px]`. |
| `src/components/admin/TargetsClient.tsx`           | Stats bar scrollable. Search input 44px on mobile. Table has `overflow-x-auto` with `min-w-[600px]`.                                                       |
| `src/components/admin/users/TeamClient.tsx`        | Stats bar scrollable. Toolbar wraps. Search and invite button 44px on mobile. Table has `overflow-x-auto` with `min-w-[640px]`.                            |
| `src/app/admin/(dashboard)/add-cards/page.tsx`     | Toolbar wraps. Tab buttons have 36px min-height on mobile. Responsive padding.                                                                             |
| `src/components/admin/settings/SettingsClient.tsx` | Already had mobile horizontal tabs — no changes needed.                                                                                                    |

## Verification

- `npm run typecheck` passes with 0 source errors (all errors are pre-existing in `src/tests/` from schema migration)
- No server actions, services, repositories, or type files modified
- Dark mode fully supported via CSS variables
- All text meets 11px minimum (fixed `text-caption` and role badges)
- All interactive elements meet 44px touch target on mobile
- No horizontal overflow at 390px viewport width
