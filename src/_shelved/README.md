# Shelved Code

This directory contains storefront, checkout, POS, order management, customer
accounts, and Stripe integration code from the original TCG Ledger codebase.
It is excluded from `tsconfig.json`, `vitest.config.ts`, and `eslint.config.mjs`.
Nothing in this tree is compiled, tested, linted, or shipped.

## To revive a module

1. Move files from `src/_shelved/<path>` back to `src/<path>`.
2. Remove the corresponding entries from the three config excludes:
   - `tsconfig.json` — `exclude: [..., "src/_shelved/**"]`
   - `vitest.config.ts` — `test.exclude: [..., "src/_shelved/**"]`
   - `eslint.config.mjs` — `ignores: [..., "src/_shelved/**"]`
3. Reconcile against the current Prisma schema — shelved code references
   `inventory` (which may have been renamed to `legacyInventory`),
   `Customer`, `Order`, `OrderItem`, `StoreSettings`.
4. Run `npm run typecheck` and fix the breakage.
5. Run the shelved tests.

Shelved from commit ed9f56708ec983bd9e2742f368e8c55d03ccd850 on 2026-04-15.
