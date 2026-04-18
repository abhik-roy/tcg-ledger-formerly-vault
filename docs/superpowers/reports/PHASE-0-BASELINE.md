# Phase 0 Baseline

**Branch:** `pivot/personal-tracker` (from `main` at `5f39215`)
**Date:** 2026-04-16

## Typecheck

- Status: **PASS** (zero errors)
- Command: `npx tsc --noEmit`

## Vitest

- Test Files: **46 passed** (46 total)
- Tests: **609 passed** (609 total)
- Duration: 8.26s
- Command: `npx vitest run`

## File counts

- Actions: 12 files
- Services: 12 files
- Repositories: 7 files
- Mappers: 9 files (incl. index.ts barrel)
- Admin pages: 14 entries under (dashboard)/
- Tests: 46 test files under src/tests/

## npm install

- Required `--legacy-peer-deps` due to `@next-auth/prisma-adapter` peer dep conflict
- 12 vulnerabilities (3 moderate, 9 high) — pre-existing, not introduced by pivot
