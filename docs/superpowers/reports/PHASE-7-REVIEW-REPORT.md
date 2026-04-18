# Phase 7 Independent Code Review Report

**Reviewer:** Claude (code-reviewer agent, no prior phase context)
**Branch:** `pivot/personal-tracker`
**Base:** `main`
**Spec:** `docs/superpowers/specs/2026-04-15-personal-tracker-pivot-design.md`
**Date:** 2026-04-16

---

## Gate Result: PASS

- **Critical:** 0
- **High:** 0 (5 found, all fixed inline)
- **Medium:** 7
- **Low:** 4

---

## High Severity (Fixed)

### H-1. `next.config.ts` retained Stripe CSP entries (FIXED)

**Spec reference:** Section 4 -- "CSP entries for Stripe (`js.stripe.com`, Stripe image domains) removed."

`script-src` included `https://js.stripe.com`, `frame-src` included `https://js.stripe.com https://hooks.stripe.com`, `connect-src` included `https://api.stripe.com`. All three violated the spec requirement of zero Stripe references in active code.

**Fix:** Removed all Stripe domains from CSP. Set `frame-src 'none'`, cleaned `script-src` and `connect-src`.

### H-2. `next.config.ts` missing `output: "standalone"` (FIXED)

**Spec reference:** Section 4 -- "Add `output: 'standalone'`", Section 7 -- runtime artifact is Next.js standalone output.

The config had no `output` property. Without it, `make deploy` would fail on the Pi because the standalone build artifact wouldn't exist.

**Fix:** Added `output: "standalone"` to `nextConfig`.

### H-3. `src/components/admin/OrderDetailsModal.tsx` not shelved (FIXED)

**Spec reference:** Section 4 shelving list, Section 8.7 Phase 7 checks -- "No live-code references to Order, OrderItem, Customer, StoreSettings, Stripe, Vercel."

This 300-line component references `order.stripeSessionId`, "Stripe refund", "Stripe dashboard", `order.items` (OrderItem semantics), `order.customerEmail` (Customer semantics). It was the only unshelved component with direct Stripe/Order references. No active code imports it, but its presence in `src/components/` means it participates in typecheck and could confuse future developers.

**Fix:** Moved to `src/_shelved/components/admin/OrderDetailsModal.tsx`.

### H-4. `StoreSettingsDTO` and types retained shop-specific fields (FIXED)

**Spec reference:** Section 2 -- "UserPermissions shrinks from 7 flags to 2"; Section 4 -- shelving strategy. The spec lists `StoreSettings` as a SHELVED model and states the settings module gets "minimal-touch" retargeting.

`StoreSettingsDTO` in `dtos.ts` included `posExitPin` (POS feature, explicitly shelved). `UpdateStoreSettingsInput` in `types.ts` included `posExitPin`, `shippingEnabled`, `standardShippingRate`, `expressShippingRate`, `freeShippingThreshold` -- all shop/POS fields. `StoreSettingsData` in `types.ts` had the same shop fields.

**Fix:** Removed `posExitPin` from `StoreSettingsDTO`. Removed all shipping and POS fields from `UpdateStoreSettingsInput` and `StoreSettingsData`. Updated `settings.mapper.ts` to match.

### H-5. `Permissions-Policy` header allowed `payment=(self)` (FIXED)

**Spec reference:** Section 1 -- "No payment processing, checkout, or Stripe in live code."

The `payment=(self)` directive signals the app uses the Payment Request API. With Stripe shelved and no payment processing, this should be `payment=()`.

**Fix:** Changed to `payment=()`.

---

## Medium Severity (Noted, Deferred)

### M-1. Settings module still queries SHELVED `StoreSettings` Prisma model

`src/repositories/settings.repository.ts` calls `prisma.storeSettings.findUnique()` and `prisma.storeSettings.upsert()`. The `StoreSettings` model is in the SHELVED block of `schema.prisma`. The spec (Section 8.7) says "No live-code references to ... StoreSettings" but also says (Section 8.4) "Retarget `/admin/settings`" and (Section 10.4) "Rewriting ... settings UIs (minimal-touch only)".

**Deferral justification:** The settings module is functional and tested. The `StoreSettings` model must remain in the schema because the table exists in Postgres. The repository's use of it is the intentional "minimal-touch" approach -- the model is SHELVED conceptually (no new features) but the admin still needs basic app configuration. A full retarget would mean creating a new `AppSettings` model, which is out of scope per Section 10.4. The DTO and types have been cleaned of shop-specific fields (H-4), limiting the blast radius.

### M-2. Three read-only actions return bare values instead of `{success}` tuples

- `getTeamMembers()` -> `Promise<TeamMemberDTO[]>`
- `getLedgerEntries()` -> `Promise<LedgerEntryDTO[]>`
- `searchCatalogAction()` -> `Promise<CardDTO[]>`

The spec states "Actions return { success } tuples." These are all read-only queries, not mutations, and they handle errors internally (returning `[]` on failure or letting the error propagate to the UI boundary). The pattern is consistent within the codebase -- all mutation actions properly return `ActionResult<T>`.

**Deferral justification:** Read-only convenience. No security or correctness impact. Can be wrapped in `ActionResult` in a future consistency pass.

### M-3. `src/docs/modules/` contains stale documentation for shelved features

Files `stripe.md`, `orders.md`, `pos.md`, `customers.md`, `inventory.md` under `src/docs/modules/` document shelved modules. These are not excluded from the build (they're `.md` files, not code) but could mislead developers.

**Deferral justification:** Documentation files, not code. They don't affect build, tests, or runtime. Should be moved to `src/_shelved/docs/` in a cleanup pass.

### M-4. `src/tests/TEST_COVERAGE.md` references shelved test suites

This file documents the original 302-test suite including DashboardService, CustomerService, BuylistService, OrderService, StripeService, Checkout Action, Stripe Webhook, etc. The actual test count is now 94 across 10 suites.

**Deferral justification:** Documentation file, not code. Should be regenerated to reflect current state.

### M-5. `src/lib/env.ts` does not validate all spec-declared env vars

The spec (Section 4) lists active env vars as: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL`, `NODEMAILER_*`, `ADMIN_EMAIL`. The actual `env.ts` only validates `DATABASE_URL` and `AUTH_SECRET`/`NEXTAUTH_SECRET`. The others are not validated at startup.

**Deferral justification:** The app works without `NODEMAILER_*` (email is deferred), and `NEXTAUTH_URL`/`NEXT_PUBLIC_BASE_URL`/`ADMIN_EMAIL` are handled by Next.js or optional features. Adding validation would cause boot failures in dev environments that don't set all vars. Can be tightened when email features are enabled.

### M-6. `requireOwnership` makes two auth calls

`src/lib/auth-guard.ts` line 26-37: `requireOwnership` calls `auth()` internally (line 34) even though the caller has already called `requireUser()` and passed `session.user.id`. The session could be passed as a parameter to avoid the redundant auth check.

**Deferral justification:** Functional correctness is not affected -- the double-call is a minor perf overhead. Fixing would change the function signature and all call sites.

### M-7. `StoreSettingsData` type in `types.ts` may be unused

After removing the shop-specific fields, `StoreSettingsData` is now a near-duplicate of `StoreSettingsDTO` (minus `updatedAt`). No grep hits for `StoreSettingsData` in active code outside of `types.ts` itself (only `_shelved` references it).

**Deferral justification:** Dead type, no runtime impact. Can be removed in a cleanup pass.

---

## Low Severity

### L-1. `src/app/actions/buylist.ts` filename not renamed to match spec

The spec renames buylist to personal-targets throughout, and the service is `personal-targets.service.ts`. But the action file is still `buylist.ts`. The route is correctly `/admin/targets`.

### L-2. GeneralSection UI still says "Store Name" / "Basic store information"

`src/components/admin/settings/sections/GeneralSection.tsx` uses copy like "Store Name", "Basic store information", "My Card Store" placeholder. These are shop-oriented labels that don't match the personal-tracker framing. The spec says settings gets "minimal-touch" so this is acceptable.

### L-3. Settings mapper default name is "TCG Ledger"

`src/mappers/settings.mapper.ts` defaults `storeName` to "TCG Ledger" -- the former product name. Should be "TCG Ledger" or whatever the current branding is. Minor cosmetic issue.

### L-4. `eslint-disable @typescript-eslint/no-explicit-any` in several files

`settings.repository.ts` has a file-level disable. `import-helpers.ts` has multiple inline disables for Scryfall API response typing. These are pre-existing patterns, not introduced by the refactor.

---

## Checklist Verification Summary

| #   | Check                                               | Result                                                                                            |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1a  | `@prisma/client` in actions (non-shelved)           | PASS -- 0 hits                                                                                    |
| 1b  | `NextResponse\|cookies\|headers` in services        | PASS -- 0 hits                                                                                    |
| 1c  | `NextResponse\|Request\|Response` in repositories   | PASS -- 0 hits                                                                                    |
| 1d  | `bcrypt\|jwt` in services                           | PASS -- only `team.service.ts` (acceptable)                                                       |
| 1e  | Services return DTOs, not `{success}` tuples        | PASS -- 0 hits for `success:` in services                                                         |
| 1f  | Actions return `{success}` tuples                   | PASS for mutations; M-2 for reads                                                                 |
| 2a  | `legacyInventory` in active code                    | PASS -- only `_shelved/README.md`                                                                 |
| 2b  | `Stripe` in active code                             | PASS after H-1, H-3 fixes                                                                         |
| 2c  | `Vercel` in active code                             | PASS -- 0 hits                                                                                    |
| 2d  | `OrderItem\|Customer\|StoreSettings` in active code | M-1 (settings, justified)                                                                         |
| 2e  | `CartContext` in active code                        | PASS -- 0 hits                                                                                    |
| 3a  | Auth on mutations                                   | PASS -- all mutations call `requireUser` or `requireAdmin`                                        |
| 3b  | `requireOwnership` on Holding mutations             | PASS -- `updateHolding`, `deleteHolding`, `toggleTradeListingAction`, `updateTargets` all call it |
| 4a  | `env.ts` declarations                               | M-5 (partial validation)                                                                          |
| 4b  | No `STRIPE_*`, `CRON_SECRET` in active code         | PASS -- 0 hits                                                                                    |
| 5   | Dead imports/exports                                | M-7 (`StoreSettingsData`), L-1 (`buylist.ts` naming)                                              |
| 6a  | `/admin/inventory` does not exist                   | PASS                                                                                              |
| 6b  | `/admin/buylist` does not exist                     | PASS                                                                                              |
| 6c  | `/admin/trade-binder` exists                        | PASS                                                                                              |
| 6d  | `/shop/**` not routable                             | PASS -- directory does not exist                                                                  |
| 7a  | Schema has Card, Holding, SHELVED block             | PASS                                                                                              |
| 7b  | Migration exists                                    | PASS -- `20260416171533_pivot_card_holding`                                                       |
| 8a  | `npx vitest run` all green                          | PASS -- 94/94 passed                                                                              |
| 8b  | No test imports from `_shelved`                     | PASS -- 0 hits                                                                                    |
| 9a  | `src/_shelved/README.md` exists                     | PASS                                                                                              |
| 9b  | Phase reports exist                                 | PASS -- Phases 0,2,3,4,5,6                                                                        |

---

## Files Modified by This Review

| File                                         | Change                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `next.config.ts`                             | Removed Stripe CSP entries, added `output: "standalone"`, fixed `payment=()`        |
| `src/components/admin/OrderDetailsModal.tsx` | Moved to `src/_shelved/components/admin/`                                           |
| `src/lib/dtos.ts`                            | Removed `posExitPin` from `StoreSettingsDTO`                                        |
| `src/lib/types.ts`                           | Removed shipping/POS fields from `UpdateStoreSettingsInput` and `StoreSettingsData` |
| `src/mappers/settings.mapper.ts`             | Removed `posExitPin` from defaults and mapping                                      |

---

## Test Verification

All 94 tests pass after fixes (10 test files, 0 failures).
