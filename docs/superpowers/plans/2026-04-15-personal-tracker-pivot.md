# Personal TCG Tracker Pivot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot TCG Ledger from a retail storefront to a self-hosted, multi-user personal TCG collection tracker with a passive trade binder, shelving (not deleting) all shop/Stripe/POS/order code for future revival.

**Architecture:** Introduces a normalized `Card` (printing-level catalog) + `Holding` (per-user ownership) data model, renames the existing `inventory` model to `legacyInventory`, and moves all shop-adjacent code under `src/_shelved/` (excluded from build/test/lint). Execution is fully autonomous across Phases 0-7; Phase 8 (Pi deploy) stops with a manual "ready to deploy" handoff.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Prisma 6 + PostgreSQL 16, NextAuth v5, Tailwind 4, shadcn/Radix, Vitest 4, Playwright (new), Docker Compose (dev + prod).

**Spec:** `docs/superpowers/specs/2026-04-15-personal-tracker-pivot-design.md`

---

## File Structure Overview

Before tasks, the macro-level file map. Each task will specify exact paths within this layout.

### New files created

| Path | Purpose |
|---|---|
| `.claude/agents/ux-researcher.md` | Custom UX researcher subagent (Phase 3 dispatch) |
| `docker-compose.dev.yml` | Dev Postgres at `127.0.0.1:5433` (Fedora-local) |
| `docker-compose.yml` | Prod Postgres + app stack for Pi |
| `Makefile` | Build/deploy/migrate/backup targets |
| `scripts/dev-bootstrap.sh` | Start dev DB + apply migrations |
| `scripts/playwright-smoke.mjs` | Cross-phase smoke test (desktop + mobile viewports) |
| `scripts/_lib.ts` | Shared Prisma + readline helper for CLI scripts |
| `scripts/create-user.ts` | CLI: invite a friend with email+password+displayName |
| `scripts/reset-password.ts` | CLI: reset a user's password |
| `scripts/import-cards.ts` | CLI: bulk CSV import into Card+Holding |
| `src/repositories/holding.repository.ts` | Per-user Holding queries (replaces `inventory.repository.ts`) |
| `src/services/holding.service.ts` | Per-user Holding business logic (replaces `inventory.service.ts`) |
| `src/services/personal-targets.service.ts` | Personal collection targets (replaces `buylist.service.ts`) |
| `src/mappers/holding.mapper.ts` | Card+Holding → DTO (replaces `inventory.mapper.ts`) |
| `src/mappers/trade-binder.mapper.ts` | Listings → `TradeBinderItemDTO[]` |
| `src/app/actions/holding.ts` | Server actions for holding mutations (trade toggle, edit, delete) |
| `src/app/actions/trade-binder.ts` | Server action for trade binder fetch |
| `src/app/admin/(dashboard)/collection/page.tsx` | Retargeted inventory page |
| `src/app/admin/(dashboard)/targets/page.tsx` | Retargeted buylist page |
| `src/app/admin/(dashboard)/trade-binder/page.tsx` | New trade binder page |
| `src/components/CardDetailDialog.tsx` | Moved+retargeted from `shop/QuickViewDialog.tsx` |
| `src/_shelved/README.md` | Revive instructions for shelved code |
| `docs/superpowers/research/frontend-audit.md` | Phase 3 code-explorer output |
| `docs/superpowers/research/ux-heuristic-audit.md` | Phase 3 UX researcher output |
| `docs/superpowers/research/competitive-analysis.md` | Phase 3 UX researcher output |
| `docs/superpowers/research/user-journeys.md` | Phase 3 UX researcher output |
| `docs/superpowers/reports/PHASE-{2..7}-REPORT.md` | Per-phase agent reports |
| `docs/DEPLOYMENT.md` | Pi bootstrap runbook (produced in Phase 8 prep) |

### Modified files

| Path | Change |
|---|---|
| `prisma/schema.prisma` | Rename `inventory` → `legacyInventory`; add `Card`, `Holding`; modify `User`, `UserPermissions`, `quantityLog`, `priceLog`; mark shop models SHELVED |
| `src/lib/auth.ts` | Drop CUSTOMER branch; new session shape with `displayName` + 2-flag permissions |
| `src/lib/auth-guard.ts` | Replace `requireStaff`/`requireCustomer` with `requireUser` + `requireOwnership` |
| `src/middleware.ts` | Simplify to single "no token → login" check |
| `src/lib/types.ts` | Add `HoldingInput`, `CardInput`, `TradeBinderFilterInput`, `CreateHoldingInput` |
| `src/lib/dtos.ts` | Add `HoldingDTO`, `CardDTO`, `TradeBinderItemDTO`, `LedgerEntryDTO`; remove shop DTOs |
| `src/lib/env.ts` | Remove `STRIPE_*`, `CRON_SECRET`; keep `NODEMAILER_*` |
| `src/lib/prisma.ts` | No change (singleton stays) |
| `src/services/catalog.service.ts` | Upsert Card first, then Holding (not flat inventory rows) |
| `src/services/dashboard.service.ts` | Per-user + Tailnet-wide aggregates |
| `src/services/email.service.ts` | Keep infrastructure; order templates shelved |
| `src/services/settings.service.ts` | Retarget to personal/global preferences |
| `src/services/team.service.ts` | 2-flag permissions model |
| `src/repositories/log.repository.ts` | New `quantityLog`/`priceLog` shape |
| `src/repositories/settings.repository.ts` | Drop shop fields |
| `src/repositories/team.repository.ts` | 2-flag permissions |
| `src/mappers/dashboard.mapper.ts` | Per-user stats |
| `src/mappers/ledger.mapper.ts` | New log shape |
| `src/mappers/settings.mapper.ts` | Trim shop fields |
| `src/mappers/team.mapper.ts` | 2 flags |
| `src/app/actions/inventory.ts` → rename internally to holding semantics | Holding operations |
| `src/app/actions/buylist.ts` | Personal targets semantics |
| `src/app/actions/dashboard.ts` | New stat DTOs |
| `src/app/actions/import-helpers.ts` | Card+Holding upsert helpers |
| `src/app/actions/settings.ts` | Trimmed schema |
| `src/app/actions/team.ts` | 2-flag permissions |
| `src/app/admin/(dashboard)/add-cards/page.tsx` | Consume new catalog DTOs |
| `src/app/admin/(dashboard)/ledger/page.tsx` | New ledger DTOs |
| `src/app/admin/(dashboard)/settings/page.tsx` | Trimmed settings |
| `src/app/admin/(dashboard)/users/page.tsx` | 2 flags |
| `src/app/admin/(dashboard)/page.tsx` | New dashboard widgets |
| `src/app/admin/(dashboard)/layout.tsx` | Updated sidebar (drop Orders/Customers/POS; add Trade Binder) |
| `src/app/admin/login/page.tsx` | New auth shape |
| `src/app/api/auth/[...nextauth]/route.ts` | Updated provider config |
| `src/app/api/inventory/export/route.ts` | Export Holdings CSV |
| `src/app/api/admin/ledger/export/route.ts` | New ledger shape |
| `tsconfig.json` | Exclude `src/_shelved/**` |
| `vitest.config.ts` | Exclude `src/_shelved/**` from tests |
| `eslint.config.mjs` | Ignore `src/_shelved/**` |
| `next.config.ts` | Add `output: "standalone"`; trim CSP (drop Stripe entries) |
| `package.json` | Add `playwright` devDep; remove `stripe` dep |
| `.gitignore` | Add `.dev-postgres-data/`, `docs/superpowers/screenshots/` |

### Shelved (moved to `src/_shelved/`)

| From | To |
|---|---|
| `src/app/shop/**` | `src/_shelved/app/shop/**` |
| `src/app/admin/(dashboard)/orders/` | `src/_shelved/app/admin/orders/` |
| `src/app/admin/(dashboard)/pos/` | `src/_shelved/app/admin/pos/` |
| `src/app/admin/(dashboard)/customers/` | `src/_shelved/app/admin/customers/` |
| `src/app/api/webhooks/stripe/` | `src/_shelved/app/api/webhooks/stripe/` |
| `src/app/api/admin/cleanup/` | `src/_shelved/app/api/admin/cleanup/` |
| `src/app/api/cron/` | `src/_shelved/app/api/cron/` |
| `src/app/api/auth/forgot-password/` | `src/_shelved/app/api/auth/forgot-password/` |
| `src/app/api/auth/reset-password/` | `src/_shelved/app/api/auth/reset-password/` |
| `src/app/api/register/` | `src/_shelved/app/api/register/` |
| `src/app/actions/checkout.ts` | `src/_shelved/app/actions/checkout.ts` |
| `src/app/actions/customers.ts` | `src/_shelved/app/actions/customers.ts` |
| `src/app/actions/order.ts` | `src/_shelved/app/actions/order.ts` |
| `src/app/actions/pos.ts` | `src/_shelved/app/actions/pos.ts` |
| `src/app/actions/profile.ts` | `src/_shelved/app/actions/profile.ts` |
| `src/app/actions/stripe.ts` | `src/_shelved/app/actions/stripe.ts` |
| `src/services/customer.service.ts` | `src/_shelved/services/customer.service.ts` |
| `src/services/order.service.ts` | `src/_shelved/services/order.service.ts` |
| `src/services/pos.service.ts` | `src/_shelved/services/pos.service.ts` |
| `src/services/stripe.service.ts` | `src/_shelved/services/stripe.service.ts` |
| `src/repositories/customer.repository.ts` | `src/_shelved/repositories/customer.repository.ts` |
| `src/repositories/order.repository.ts` | `src/_shelved/repositories/order.repository.ts` |
| `src/mappers/customer.mapper.ts` | `src/_shelved/mappers/customer.mapper.ts` |
| `src/mappers/order.mapper.ts` | `src/_shelved/mappers/order.mapper.ts` |
| `src/components/shop/**` | `src/_shelved/components/shop/**` |
| `src/context/CartContext.tsx` (and wherever cart context lives) | `src/_shelved/context/CartContext.tsx` |
| `src/components/emails/` order templates | `src/_shelved/components/emails/order/` |
| Matching test files under `src/tests/**` for all the above | `src/_shelved/tests/**` |
| `vercel.json` | **DELETED** (not shelved — see spec §4) |

---

## Phase 0 — Pre-flight

### Task 0.1: Create the feature branch and record baselines

**Files:**
- Modify: `.git/HEAD` (via branch command)
- Create: `docs/superpowers/reports/PHASE-0-BASELINE.md`

- [ ] **Step 1: Create feature branch from main**

```bash
cd /home/abhikroy/Desktop/tcg-ledger-formerly-vault
git checkout -b pivot/personal-tracker
git status
```
Expected: `On branch pivot/personal-tracker`, clean tree.

- [ ] **Step 2: Record baseline test count and typecheck state**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30 > /tmp/baseline-vitest.txt
npm run typecheck 2>&1 | tee /tmp/baseline-typecheck.txt
cat /tmp/baseline-vitest.txt | grep -E 'Tests|Test Files' > /tmp/baseline-summary.txt
```

- [ ] **Step 3: Write baseline report**

Create `docs/superpowers/reports/PHASE-0-BASELINE.md` with:
- Current branch, commit SHA (`git rev-parse HEAD`)
- Vitest summary (tests passed / test files)
- Typecheck result (pass/fail, error count if any)
- `npm ls` top-level deps count
- File counts: `find src/app/actions -type f | wc -l`, same for services/repositories/mappers

- [ ] **Step 4: Commit baseline**

```bash
git add docs/superpowers/reports/PHASE-0-BASELINE.md
git commit -m "docs: record phase-0 baseline for pivot refactor"
```

---

### Task 0.2: Create the UX researcher subagent

**Files:**
- Create: `.claude/agents/ux-researcher.md`

- [ ] **Step 1: Create the agent file**

Write `.claude/agents/ux-researcher.md` with frontmatter and content per spec §6.1:

```markdown
---
name: ux-researcher
description: Use for UX research tasks on collector/hobbyist applications. Performs heuristic evaluation, user journey mapping, competitive analysis, IA audit, and accessibility sweeps. Outputs severity-rated markdown reports with file-path citations. Read-only.
tools: Read, Grep, Glob, WebFetch, WebSearch
---

You are a senior UX researcher specializing in collector and hobbyist applications — particularly TCG (trading card game) collection trackers. Your methodology is explicit: heuristic evaluation → user journey mapping → competitive analysis → information architecture audit → accessibility sweep → prioritized recommendations.

## Required expertise

- Nielsen's 10 usability heuristics
- Fitts's Law and hit-target sizing (44x44 px minimum on mobile)
- WCAG 2.2 AA accessibility criteria
- Mobile responsive design patterns (iOS Safari, Android Chrome)
- Dark-mode design considerations
- TCG collector domain knowledge: Deckbox, Moxfield, ManaBox, Dragon Shield app, Cardsphere — their strengths, weaknesses, and established patterns collectors expect

## Output format

Every report you produce MUST follow this structure:

1. **Scope** — exact files and pages audited (cite paths)
2. **Methodology** — which heuristics/frameworks applied
3. **Findings** — each finding formatted as:
   - **Severity:** critical / high / medium / low
   - **Scope:** file path + component name + line range
   - **Evidence type:** code-based / domain-informed (be explicit about which — never mix)
   - **Finding:** what's wrong
   - **Recommendation:** specific fix
   - **Effort:** S / M / L
4. **Prioritized top 10** — the findings you'd fix first, ordered by impact/effort ratio

## Rules

- You never write production code. You produce research reports only.
- You cite specific file paths and component names for every finding.
- You explicitly label findings as "evidence-based from reading code" vs "domain-informed recommendation."
- You distinguish severity strictly: "critical" means the feature is unusable; "high" means users will struggle; "medium" means friction; "low" means polish.
- You are pragmatic, not dogmatic. If the current implementation is fine, say so.

## What you DO NOT do

- You don't speculate beyond what you can verify by reading code or researching competitors
- You don't redesign things in prose (give recommendations, not mockups)
- You don't write long essays — prefer structured severity tables
- You don't ignore mobile. Every UI finding must consider mobile viewport (375-428px portrait)
```

- [ ] **Step 2: Commit the agent**

```bash
git add .claude/agents/ux-researcher.md
git commit -m "chore: add ux-researcher subagent for pivot refactor"
```

---

### Task 0.3: Stand up dev Postgres (Fedora-local)

**Files:**
- Create: `docker-compose.dev.yml`
- Create: `scripts/dev-bootstrap.sh`
- Modify: `.gitignore`

- [ ] **Step 1: Write `docker-compose.dev.yml`**

```yaml
services:
  postgres-dev:
    image: postgres:16
    container_name: tcg-ledger-postgres-dev
    restart: unless-stopped
    environment:
      POSTGRES_USER: tcg_dev
      POSTGRES_PASSWORD: tcg_dev_password
      POSTGRES_DB: tcg_ledger_dev
    ports:
      - "127.0.0.1:5433:5432"
    volumes:
      - ./.dev-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tcg_dev -d tcg_ledger_dev"]
      interval: 5s
      timeout: 3s
      retries: 10
```

- [ ] **Step 2: Write `scripts/dev-bootstrap.sh`**

```bash
#!/usr/bin/env bash
# Starts dev Postgres, waits for healthcheck, applies Prisma migrations.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Starting dev Postgres container..."
docker compose -f docker-compose.dev.yml up -d postgres-dev

echo "==> Waiting for healthcheck..."
for i in {1..30}; do
  if docker compose -f docker-compose.dev.yml ps postgres-dev | grep -q healthy; then
    echo "==> Postgres is healthy."
    break
  fi
  sleep 2
done

if ! docker compose -f docker-compose.dev.yml ps postgres-dev | grep -q healthy; then
  echo "ERROR: Postgres did not become healthy in 60s" >&2
  exit 1
fi

echo "==> Applying Prisma migrations..."
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" \
    npx prisma migrate deploy
else
  echo "==> No migrations yet; skipping apply step."
fi

echo "==> Dev DB ready at: postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev"
```

- [ ] **Step 3: Make the script executable**

```bash
chmod +x scripts/dev-bootstrap.sh
```

- [ ] **Step 4: Update `.gitignore`**

Append to `.gitignore`:
```
.dev-postgres-data/
docs/superpowers/screenshots/
```

- [ ] **Step 5: Create `.env.local` template if not present**

Ensure `.env.local` contains (or user has set):
```
DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev"
AUTH_SECRET="dev-secret-min-32-chars-for-local-only-00"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODEMAILER_HOST="smtp.gmail.com"
NODEMAILER_PORT="587"
NODEMAILER_USER="dev@local"
NODEMAILER_PASS="dev-placeholder"
NODEMAILER_FROM="dev@local"
ADMIN_EMAIL="dev@local"
```

Note: `.env.local` is already gitignored by Next.js convention.

- [ ] **Step 6: Run dev-bootstrap for the first time**

```bash
bash scripts/dev-bootstrap.sh
```
Expected: postgres-dev starts, health check passes, "No migrations yet; skipping apply step."

- [ ] **Step 7: Verify connection works**

```bash
docker compose -f docker-compose.dev.yml exec postgres-dev psql -U tcg_dev -d tcg_ledger_dev -c '\dt'
```
Expected: "Did not find any relations." (DB exists, no tables yet — correct.)

- [ ] **Step 8: Commit**

```bash
git add docker-compose.dev.yml scripts/dev-bootstrap.sh .gitignore
git commit -m "chore: add dev Postgres compose + bootstrap script"
```

---

### Task 0.4: Install Playwright + write smoke test script

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `scripts/playwright-smoke.mjs`

- [ ] **Step 1: Install Playwright library**

```bash
npm install --save-dev playwright
```
Expected: playwright added to devDependencies.

- [ ] **Step 2: Install Chromium binary**

```bash
npx playwright install chromium
```
Expected: browser binary downloaded (~150MB).

- [ ] **Step 3: Write `scripts/playwright-smoke.mjs`**

This is a ~200-line script. Core structure:

```javascript
// scripts/playwright-smoke.mjs
// Cross-phase smoke tester. Drives a running dev server and asserts every
// retained admin page renders cleanly at both desktop and mobile viewports.
//
// Usage: node scripts/playwright-smoke.mjs [--desktop-only|--mobile-only] [--phase=N]
// Env:
//   BASE_URL       — default http://localhost:3000
//   LOGIN_EMAIL    — default dev@local
//   LOGIN_PASSWORD — default devpassword
//   PHASE          — used for screenshot destination dir

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOGIN_EMAIL = process.env.LOGIN_EMAIL || 'dev@local';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'devpassword';
const PHASE = process.env.PHASE || 'adhoc';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

// Pages to test — updated as phases retarget routes.
// Phase 4 uses the "new" set; if a page doesn't exist yet, the test records
// it as expected-missing rather than failing.
const PAGES = [
  { path: '/admin/login', needsAuth: false, heading: /sign in|log in/i },
  { path: '/admin',               needsAuth: true, heading: /dashboard/i },
  { path: '/admin/collection',    needsAuth: true, heading: /collection/i },
  { path: '/admin/targets',       needsAuth: true, heading: /targets/i },
  { path: '/admin/trade-binder',  needsAuth: true, heading: /trade binder/i },
  { path: '/admin/add-cards',     needsAuth: true, heading: /add cards/i },
  { path: '/admin/ledger',        needsAuth: true, heading: /ledger/i },
  { path: '/admin/users',         needsAuth: true, heading: /team|users/i },
  { path: '/admin/settings',      needsAuth: true, heading: /settings/i },
];

const ERROR_PATTERN = /\b(error|exception|cannot|undefined|NaN)\b/i;

async function runViewport(name, viewport) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const screenshotDir = path.join('docs/superpowers/screenshots', `phase-${PHASE}`);
  await mkdir(screenshotDir, { recursive: true });

  const results = [];

  // Log in once per viewport
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type=email], input[name=email]', LOGIN_EMAIL);
  await page.fill('input[type=password], input[name=password]', LOGIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/admin/, { timeout: 10_000 }).catch(() => {});

  for (const spec of PAGES) {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    const result = { path: spec.path, viewport: name, ok: true, reasons: [] };
    try {
      const response = await page.goto(`${BASE_URL}${spec.path}`, { waitUntil: 'networkidle', timeout: 15_000 });
      if (!response) { result.ok = false; result.reasons.push('no response'); }
      else if (response.status() >= 400) { result.ok = false; result.reasons.push(`HTTP ${response.status()}`); }

      // Heading check
      const headingText = await page.locator('h1, h2').first().innerText().catch(() => '');
      if (!spec.heading.test(headingText)) {
        result.ok = false;
        result.reasons.push(`heading mismatch: got "${headingText}"`);
      }

      // Console error check
      if (consoleErrors.length > 0) { result.ok = false; result.reasons.push(`${consoleErrors.length} console errors`); }
      if (pageErrors.length > 0) { result.ok = false; result.reasons.push(`${pageErrors.length} page errors`); }

      // Visible error text
      const bodyText = await page.locator('body').innerText();
      const placeholderPattern = /placeholder|aria-placeholder/i;
      const nonPlaceholderBody = bodyText.split('\n').filter(l => !placeholderPattern.test(l)).join('\n');
      if (ERROR_PATTERN.test(nonPlaceholderBody)) {
        result.ok = false;
        result.reasons.push('error text visible in body');
      }

      // Focusable element check
      const focusable = await page.locator('button, a, input, select, textarea, [tabindex]').count();
      if (focusable === 0) { result.ok = false; result.reasons.push('no focusable elements'); }

      // Mobile body-overflow check
      if (name === 'mobile') {
        const bodyOverflow = await page.evaluate(() => {
          const b = document.body;
          return b.scrollWidth - b.clientWidth;
        });
        if (bodyOverflow > 1) { result.ok = false; result.reasons.push(`body horizontal overflow ${bodyOverflow}px`); }
      }

      // Screenshot
      const safeName = spec.path.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root';
      await page.screenshot({ path: path.join(screenshotDir, `${safeName}.${name}.png`), fullPage: true });
    } catch (err) {
      result.ok = false;
      result.reasons.push(`exception: ${err.message}`);
    }
    results.push(result);
  }

  await browser.close();
  return results;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const runDesktop = !args.has('--mobile-only');
  const runMobile = !args.has('--desktop-only');

  const all = [];
  if (runDesktop) all.push(...await runViewport('desktop', VIEWPORTS.desktop));
  if (runMobile) all.push(...await runViewport('mobile', VIEWPORTS.mobile));

  const failed = all.filter(r => !r.ok);
  for (const r of all) {
    const marker = r.ok ? '[OK]' : '[FAIL]';
    console.log(`${marker} ${r.viewport.padEnd(7)} ${r.path}${r.ok ? '' : '  ' + r.reasons.join('; ')}`);
  }
  console.log(`\n${all.length - failed.length}/${all.length} smoke checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 4: Verify the script parses**

```bash
node -c scripts/playwright-smoke.mjs
```
Expected: exits 0 with no output.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/playwright-smoke.mjs
git commit -m "chore: add playwright smoke test script + install chromium"
```

---

### Task 0.5: Create `src/_shelved/` placeholder

**Files:**
- Create: `src/_shelved/README.md`

- [ ] **Step 1: Create directory and README**

```bash
mkdir -p src/_shelved
```

Write `src/_shelved/README.md`:
```markdown
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
3. Reconcile against the current Prisma schema. Shelved code references:
   - `legacyInventory` (renamed from `inventory`)
   - `Customer`, `Order`, `OrderItem`, `StoreSettings` (still in schema under SHELVED block)
4. Run `npm run typecheck` and fix the breakage.
5. Run the shelved tests (`npx vitest run src/_shelved/tests`).

## Contents

See `src/_shelved/app/`, `src/_shelved/services/`, `src/_shelved/repositories/`,
`src/_shelved/mappers/`, `src/_shelved/components/`, `src/_shelved/tests/`.

## Shelved from

Commit SHA will be recorded here after Phase 1 commit.
```

- [ ] **Step 2: Commit**

```bash
git add src/_shelved/README.md
git commit -m "chore: create src/_shelved/ placeholder"
```

### Phase 0 Gate

- [ ] Feature branch `pivot/personal-tracker` exists and is checked out
- [ ] `.claude/agents/ux-researcher.md` exists
- [ ] `docker-compose.dev.yml` + `scripts/dev-bootstrap.sh` exist; dev Postgres runs
- [ ] `playwright` in `devDependencies`; Chromium binary installed
- [ ] `scripts/playwright-smoke.mjs` parses cleanly
- [ ] `src/_shelved/README.md` exists
- [ ] `docs/superpowers/reports/PHASE-0-BASELINE.md` records the starting state

---

## Phase 1 — Shelving

**Scope note:** Phase 1 moves files and updates configs ONLY. It does NOT touch `prisma/schema.prisma` (that's Phase 2). The retained `inventory.service.ts`/`inventory.repository.ts`/etc. must still compile against the unchanged Prisma model at the end of this phase.

### Task 1.1: Shelve shop actions

**Files:**
- Move: `src/app/actions/{checkout,customers,order,pos,profile,stripe}.ts` → `src/_shelved/app/actions/`

- [ ] **Step 1: Create target directory**

```bash
mkdir -p src/_shelved/app/actions
```

- [ ] **Step 2: Move the six action files**

```bash
git mv src/app/actions/checkout.ts src/_shelved/app/actions/checkout.ts
git mv src/app/actions/customers.ts src/_shelved/app/actions/customers.ts
git mv src/app/actions/order.ts src/_shelved/app/actions/order.ts
git mv src/app/actions/pos.ts src/_shelved/app/actions/pos.ts
git mv src/app/actions/profile.ts src/_shelved/app/actions/profile.ts
git mv src/app/actions/stripe.ts src/_shelved/app/actions/stripe.ts
```

- [ ] **Step 3: Verify retained actions list**

```bash
ls src/app/actions/
```
Expected: `buylist.ts  dashboard.ts  import-helpers.ts  inventory.ts  settings.ts  team.ts`

- [ ] **Step 4: Do NOT commit yet — next tasks add to the same shelving commit.**

---

### Task 1.2: Shelve shop services

**Files:**
- Move: `src/services/{customer,order,pos,stripe}.service.ts` → `src/_shelved/services/`

- [ ] **Step 1: Create target directory**

```bash
mkdir -p src/_shelved/services
```

- [ ] **Step 2: Move the four service files**

```bash
git mv src/services/customer.service.ts src/_shelved/services/customer.service.ts
git mv src/services/order.service.ts src/_shelved/services/order.service.ts
git mv src/services/pos.service.ts src/_shelved/services/pos.service.ts
git mv src/services/stripe.service.ts src/_shelved/services/stripe.service.ts
```

- [ ] **Step 3: Verify retained services**

```bash
ls src/services/
```
Expected: `buylist.service.ts  catalog.service.ts  dashboard.service.ts  email.service.ts  inventory.service.ts  logging.service.ts  settings.service.ts  team.service.ts`

Note: `email.service.ts` stays (keep infrastructure per spec §3). We'll identify order-specific template files in a later task.

---

### Task 1.3: Shelve shop repositories + mappers

**Files:**
- Move: `src/repositories/{customer,order}.repository.ts` → `src/_shelved/repositories/`
- Move: `src/mappers/{customer,order}.mapper.ts` → `src/_shelved/mappers/`

- [ ] **Step 1: Create target directories**

```bash
mkdir -p src/_shelved/repositories src/_shelved/mappers
```

- [ ] **Step 2: Move files**

```bash
git mv src/repositories/customer.repository.ts src/_shelved/repositories/customer.repository.ts
git mv src/repositories/order.repository.ts src/_shelved/repositories/order.repository.ts
git mv src/mappers/customer.mapper.ts src/_shelved/mappers/customer.mapper.ts
git mv src/mappers/order.mapper.ts src/_shelved/mappers/order.mapper.ts
```

- [ ] **Step 3: Update `src/mappers/index.ts` to drop shelved exports**

Read `src/mappers/index.ts` and remove any `export * from './customer.mapper'` or `export * from './order.mapper'` lines (or their named-export equivalents). Leave all retained mapper exports intact.

---

### Task 1.4: Shelve shop app routes

**Files:**
- Move: entire subtrees to `src/_shelved/app/`

- [ ] **Step 1: Create target directories**

```bash
mkdir -p src/_shelved/app/shop
mkdir -p src/_shelved/app/admin/orders
mkdir -p src/_shelved/app/admin/pos
mkdir -p src/_shelved/app/admin/customers
mkdir -p src/_shelved/app/api/webhooks
mkdir -p src/_shelved/app/api/admin
mkdir -p src/_shelved/app/api/cron
mkdir -p src/_shelved/app/api/auth
mkdir -p src/_shelved/app/api/register
```

- [ ] **Step 2: Move app routes**

```bash
git mv src/app/shop src/_shelved/app/shop_moved && rm -rf src/_shelved/app/shop && mv src/_shelved/app/shop_moved src/_shelved/app/shop
git mv "src/app/admin/(dashboard)/orders" src/_shelved/app/admin/orders_moved && rm -rf src/_shelved/app/admin/orders && mv src/_shelved/app/admin/orders_moved src/_shelved/app/admin/orders
git mv "src/app/admin/(dashboard)/pos" src/_shelved/app/admin/pos_moved && rm -rf src/_shelved/app/admin/pos && mv src/_shelved/app/admin/pos_moved src/_shelved/app/admin/pos
git mv "src/app/admin/(dashboard)/customers" src/_shelved/app/admin/customers_moved && rm -rf src/_shelved/app/admin/customers && mv src/_shelved/app/admin/customers_moved src/_shelved/app/admin/customers
git mv src/app/api/webhooks/stripe src/_shelved/app/api/webhooks/stripe
git mv src/app/api/admin/cleanup src/_shelved/app/api/admin/cleanup
git mv src/app/api/cron src/_shelved/app/api/cron_moved && mv src/_shelved/app/api/cron_moved src/_shelved/app/api/cron
git mv src/app/api/auth/forgot-password src/_shelved/app/api/auth/forgot-password
git mv src/app/api/auth/reset-password src/_shelved/app/api/auth/reset-password
git mv src/app/api/register src/_shelved/app/api/register_moved && mv src/_shelved/app/api/register_moved src/_shelved/app/api/register
```

Note: `git mv` with the `_moved && mv` dance avoids "destination exists" errors where a placeholder dir was pre-created. Simpler equivalent is to skip the pre-creation in Step 1 and `git mv` directly into the parent path — pick whichever is cleaner per-file.

- [ ] **Step 3: Verify retained routes**

```bash
ls "src/app/admin/(dashboard)/"
```
Expected: `add-cards  buylist  error.tsx  inventory  layout.tsx  ledger  loading.tsx  page.tsx  settings  users`

```bash
ls src/app/api/
```
Expected: `auth  inventory` (plus any retained admin ledger export subdir)

---

### Task 1.5: Shelve shop components + cart context

**Files:**
- Move: `src/components/shop/**` → `src/_shelved/components/shop/`
- Move: cart context (find its actual location first)
- Move: order-specific email templates (identify by grepping)

- [ ] **Step 1: Create target directories**

```bash
mkdir -p src/_shelved/components
```

- [ ] **Step 2: Move shop components tree**

```bash
git mv src/components/shop src/_shelved/components/shop
```

- [ ] **Step 3: Identify cart context location**

```bash
grep -rn "CartContext" src/ 2>/dev/null | head -5
```
If found in `src/context/`, move:
```bash
mkdir -p src/_shelved/context
git mv src/context/CartContext.tsx src/_shelved/context/CartContext.tsx
```
If the whole `src/context/` directory only contains cart-related files, move the directory:
```bash
git mv src/context src/_shelved/context
```

- [ ] **Step 4: Identify order-specific email templates**

```bash
ls src/components/emails/ 2>/dev/null
```
Move any of: order-confirmation, order-fulfillment, order-cancellation, order-refund, dispute, welcome (customer welcome) — leave any password-reset template in place since EmailService infra is retained.

```bash
mkdir -p src/_shelved/components/emails/order
# For each order-specific template file:
git mv src/components/emails/<file>.tsx src/_shelved/components/emails/order/<file>.tsx
```

- [ ] **Step 5: Move admin components for shelved sections**

```bash
mkdir -p src/_shelved/components/admin
# If src/components/admin/orders/, admin/pos/, admin/customers/ exist:
git mv src/components/admin/orders src/_shelved/components/admin/orders 2>/dev/null || true
git mv src/components/admin/pos src/_shelved/components/admin/pos 2>/dev/null || true
git mv src/components/admin/customers src/_shelved/components/admin/customers 2>/dev/null || true
```

---

### Task 1.6: Shelve shop test files

**Files:**
- Move: test files that target shelved modules → `src/_shelved/tests/`

- [ ] **Step 1: Create target directory**

```bash
mkdir -p src/_shelved/tests
```

- [ ] **Step 2: Identify and move shop-related test files**

```bash
# Use grep to find test files that import from shelved paths
grep -rl -E 'shop/|customer\.service|order\.service|order\.repository|pos\.service|stripe\.service|customer\.repository|CartContext|checkout-action|stripe-webhook|pos\.ts|customers\.ts|actions/order|actions/stripe|order\.mapper|customer\.mapper' src/tests/ | sort -u
```

For each test file returned, mirror its path under `src/_shelved/tests/` and `git mv` it. Example:
```bash
mkdir -p src/_shelved/tests/actions src/_shelved/tests/services src/_shelved/tests/repositories src/_shelved/tests/mappers src/_shelved/tests/api src/_shelved/tests/components
git mv src/tests/actions/checkout-action.test.ts src/_shelved/tests/actions/checkout-action.test.ts
# ... repeat for each identified file
```

- [ ] **Step 3: Verify no retained test imports shelved code**

```bash
grep -rl -E '_shelved/|\.\./_shelved' src/tests/ 2>/dev/null
```
Expected: empty output. If any hits, those tests either need to be moved too or their imports need to be scrubbed — prefer moving.

---

### Task 1.7: Update build/test/lint excludes

**Files:**
- Modify: `tsconfig.json`
- Modify: `vitest.config.ts`
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Update `tsconfig.json`**

Add `"src/_shelved/**"` to the `exclude` array. If no exclude array exists, add one alongside `include`:

```json
{
  "exclude": ["node_modules", "src/_shelved/**"]
}
```

- [ ] **Step 2: Update `vitest.config.ts`**

Locate the `test` config object and add `exclude`:

```ts
import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  // ...existing config
  test: {
    // ...existing test options
    exclude: [...configDefaults.exclude, 'src/_shelved/**'],
  },
})
```

- [ ] **Step 3: Update `eslint.config.mjs`**

Add `'src/_shelved/**'` to the `ignores` array of the first flat config entry:

```js
export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'src/_shelved/**'],
  },
  // ...rest
]
```

---

### Task 1.8: Delete `vercel.json` and split `src/lib/env.ts`

**Files:**
- Delete: `vercel.json`
- Modify: `src/lib/env.ts`
- Create: `src/_shelved/lib/env.legacy.ts`

- [ ] **Step 1: Delete vercel.json**

```bash
git rm vercel.json
```

- [ ] **Step 2: Read the current `src/lib/env.ts`**

```bash
cat src/lib/env.ts
```

- [ ] **Step 3: Split env variables**

Edit `src/lib/env.ts` to keep only the active vars:
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_BASE_URL`
- `NODEMAILER_HOST`, `NODEMAILER_PORT`, `NODEMAILER_USER`, `NODEMAILER_PASS`, `NODEMAILER_FROM`
- `ADMIN_EMAIL`

Remove (move to legacy):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `CRON_SECRET`

- [ ] **Step 4: Create `src/_shelved/lib/env.legacy.ts`**

```bash
mkdir -p src/_shelved/lib
```

Write a parallel env-validation file for the shelved vars. Match the same Zod-based pattern as `src/lib/env.ts`. Shelved code that imports env can be updated to import from `../lib/env.legacy` during revival.

- [ ] **Step 5: Update any shelved files that currently import `env.ts` for Stripe/cron keys**

```bash
grep -rln "STRIPE_\|CRON_SECRET" src/_shelved/ 2>/dev/null
```
For each match, update the import path to reference `env.legacy` relative to the file's new location (or leave as-is with a comment — shelved code isn't expected to compile, so this is documentation only).

---

### Task 1.9: Clean shop-related code from retained files

**Files:**
- Modify: `src/components/providers.tsx` (if it wraps in CartContext.Provider)
- Modify: `src/app/admin/(dashboard)/layout.tsx` (remove shelved nav entries)
- Modify: `src/middleware.ts` (remove shop redirect logic — stub for now, Phase 3 rewrites)

- [ ] **Step 1: Scan retained code for imports from shelved paths**

```bash
# Find any retained file importing from a shelved location
grep -rln -E 'from .@/(app/shop|app/admin/.*(orders|pos|customers)|app/actions/(checkout|customers|order|pos|profile|stripe)|services/(customer|order|pos|stripe)|repositories/(customer|order)|mappers/(customer|order)|components/shop|context/CartContext)' src/ 2>/dev/null | grep -v _shelved
```

For each hit:
- If it's a provider wrapping CartContext, remove the wrapper but keep the surrounding providers.
- If it's a nav entry for Orders/Customers/POS in `layout.tsx`, delete those nav items (leave a placeholder for Trade Binder — Phase 4 will populate it).
- If middleware imports shop redirect logic, collapse to a basic "no session → /admin/login" check. Full rewrite happens in Phase 3; for now, make the minimum edit to compile.

- [ ] **Step 2: Specifically check `src/middleware.ts`**

Read current content. The existing middleware has three branches: no token / CUSTOMER / non-staff. For Phase 1 we simplify to:
```ts
// Phase 1 minimal: just gate /admin on presence of token. Full shape in Phase 3.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secureCookie: process.env.NODE_ENV === 'production' })
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/admin/login')) return NextResponse.next()
  if (pathname.startsWith('/admin') && !token) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*'] }
```

- [ ] **Step 3: Check `src/components/providers.tsx`**

If it imports and wraps `CartProvider`, remove the wrapper and the import. Keep the rest of the providers intact.

---

### Task 1.10: Verify Phase 1 gate

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```
Expected: passes cleanly. If failures, they MUST be in retained files that still reference shelved modules — fix the reference (either delete the import, stub the usage, or move the file to `_shelved/`).

- [ ] **Step 2: Run vitest**

```bash
npx vitest run
```
Expected: all retained tests pass. Shelved tests are excluded by the vitest config update in Task 1.7.

- [ ] **Step 3: Check git status**

```bash
git status --short
```
Expected: all changes are moves (R prefix), config edits (M prefix), and deletions (D for vercel.json).

- [ ] **Step 4: Record the shelving commit SHA in the shelved README**

```bash
CURRENT_SHA=$(git rev-parse HEAD)
```

Update `src/_shelved/README.md`'s last section:
```
## Shelved from

Commit SHA: <will be filled in post-commit via git commit --amend>
```

We'll record the actual SHA after commit.

- [ ] **Step 5: Commit Phase 1**

```bash
git add -A
git commit -m "refactor: shelve shop/stripe/pos to src/_shelved/"
```

- [ ] **Step 6: Amend the README with the actual SHA**

```bash
SHELVED_SHA=$(git rev-parse HEAD)
# Edit src/_shelved/README.md to set "Commit SHA: $SHELVED_SHA"
git add src/_shelved/README.md
git commit --amend --no-edit
```

### Phase 1 Gate

- [ ] `npm run typecheck` passes
- [ ] `npx vitest run` passes (retained tests only)
- [ ] No retained file imports from `src/_shelved/`
- [ ] `vercel.json` deleted
- [ ] `src/lib/env.ts` split; shelved vars moved to `src/_shelved/lib/env.legacy.ts`
- [ ] Shop nav entries removed from sidebar layout
- [ ] Middleware simplified (temporary Phase 1 form)
- [ ] `prisma/schema.prisma` is UNCHANGED (schema rename happens in Phase 2)

---

## Phase 2 — Schema + Types (architect agent)

### Task 2.0: Dispatch architect agent

**Goal:** A single architect agent performs all of Phase 2 in one dispatch. This task documents the agent brief.

- [ ] **Step 1: Dispatch `feature-dev:code-architect` with the following prompt**

```
You are rewriting the Prisma schema and TypeScript type/DTO contracts for the
TCG Ledger personal-tracker pivot. Full context:

SPEC: docs/superpowers/specs/2026-04-15-personal-tracker-pivot-design.md
      (read sections 2, 3, and 4 carefully)

SCOPE:
  1. Rewrite prisma/schema.prisma:
     - Rename model inventory → model legacyInventory (add @@map("legacy_inventory"))
     - Add new model Card per spec §2 "New tables" subsection (Card block)
     - Add new model Holding per spec §2 "New tables" subsection (Holding block)
     - Modify User: add displayName String?, change role default to "USER",
       add holdings Holding[], quantityLogs quantityLog[], priceLogs priceLog[] relations
     - Modify UserPermissions: remove 5 shop-specific columns
       (inventoryUpdateQty, buylistUpdatePrices, buylistUpdateTargets, ordersFulfill, posAccess)
       keep only inventoryUpdatePrices and addCardsAccess
     - Modify quantityLog: add userId, holdingId (nullable FK), cardSet, reason, actorId;
       rename amount → delta (drop+add, no data to preserve);
       change index to @@index([userId, time(sort: Desc)]), @@index([holdingId]), @@index([cardName])
     - Modify priceLog: add cardId FK, add source String @db.VarChar(32); drop finish column;
       change index to @@index([cardId, time(sort: Desc)])
     - Add a // SHELVED comment block containing the existing Order, OrderItem,
       Customer, StoreSettings models (unchanged from current, just re-homed under
       the SHELVED comment so their tables stay intact in Postgres)
     - Update OrderItem.inventoryId FK to reference legacyInventory (after rename)

  2. Create the Prisma migration (do NOT apply):
     bash scripts/dev-bootstrap.sh   # ensure dev DB is up
     DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" \
       npx prisma migrate dev --create-only --name pivot-card-holding
     Verify prisma/migrations/<timestamp>_pivot-card-holding/migration.sql exists.
     Confirm npx prisma validate passes.

  3. Rewrite src/lib/types.ts:
     - Remove shop input types (CheckoutInput, OrderFilterParams, etc.)
     - Add:
       * CreateHoldingInput { cardId, quantity, condition, notes?, listedForTrade?, tradeNotes? }
       * UpdateHoldingInput { id, quantity?, condition?, notes?, listedForTrade?, tradeNotes?, idealQuantity?, maxQuantity?, acquiredPrice? }
       * CreateCardInput { name, set, setName, collectorNumber, finish, game, rarity, imageSmall?, imageNormal?, scryfallId?, tcgplayerId?, marketPrice? }
       * TradeBinderFilterInput { search?, game?, condition?, showMine?, sort? }
       * HoldingFilterInput { search?, game?, set?, condition?, listedForTrade?, owner? }
     - Update any InventoryInput references to use the new types

  4. Rewrite src/lib/dtos.ts:
     - Remove CustomerDTO, OrderDTO, OrderItemDTO, OrderConfirmationDTO, etc.
     - Add:
       * CardDTO (id, name, set, setName, collectorNumber, finish, game, rarity, imageSmall, imageNormal, marketPrice, marketPriceAt)
       * HoldingDTO (id, userId, card: CardDTO, quantity, condition, notes, listedForTrade, tradeNotes, idealQuantity, maxQuantity, acquiredPrice, acquiredAt)
       * TradeBinderItemDTO (holdingId, card: CardDTO, quantity, condition, owner: { id, displayName, email }, listedAt, tradeNotes)
       * LedgerEntryDTO (id, userId, cardName, cardSet, condition, finish, delta, reason, actorId, time, type: 'quantity'|'price', oldPrice?, newPrice?)
       * UserSlimDTO (id, email, displayName, role)
     - Keep InventoryExportRow-equivalent for now (Phase 3 will retarget it to HoldingExportRow)

  5. Do NOT touch services, repositories, mappers, or any UI files.
  6. Do NOT apply the migration — only create it.

  7. Write docs/superpowers/reports/PHASE-2-REPORT.md documenting:
     - Every schema field added/removed/renamed/modified with its rationale
     - A file-by-file catalog of typecheck failures that will result (this is the
       Phase 3 work list — run `npm run typecheck 2>&1 | tee /tmp/phase2-typecheck.log`
       and include the file list with error counts)
     - Any ambiguity you resolved from the spec, with your reasoning

GATE CRITERIA for Phase 2 (you verify before reporting complete):
  - npx prisma validate passes
  - npx prisma generate produces new client types
  - prisma/migrations/<timestamp>_pivot-card-holding/migration.sql exists
  - PHASE-2-REPORT.md exists at the path above
  - Typecheck failures are EXPECTED — document them, do not try to fix them

DO NOT commit. Main Claude handles the commit after review.

Return when complete with a summary including: migration filename, schema model
count before/after, PHASE-2-REPORT.md path, typecheck failure count by directory.
```

- [ ] **Step 2: Main Claude reviews agent output**

- Read `docs/superpowers/reports/PHASE-2-REPORT.md`
- Spot-check schema against spec §2
- Verify migration file exists
- Verify typecheck failures are scoped to expected directories (`src/services/`, `src/repositories/`, `src/mappers/`, `src/app/admin/`, `src/app/actions/`, `src/tests/`)

- [ ] **Step 3: Commit Phase 2**

```bash
git add prisma/schema.prisma prisma/migrations/ src/lib/types.ts src/lib/dtos.ts docs/superpowers/reports/PHASE-2-REPORT.md
git commit -m "refactor(schema): introduce Card + Holding, update User/ledger"
```

### Phase 2 Gate

- [ ] `npx prisma validate` passes
- [ ] `npx prisma generate` succeeds
- [ ] Migration file exists under `prisma/migrations/`
- [ ] `PHASE-2-REPORT.md` exists with field rationale + typecheck failure catalog
- [ ] Typecheck failures exist (expected) and are limited to: `src/services/`, `src/repositories/`, `src/mappers/`, `src/app/admin/`, `src/app/actions/`, `src/tests/`
- [ ] No agent-authored changes to files outside the Phase 2 scope (schema, types.ts, dtos.ts, PHASE-2-REPORT.md)

---

## Phase 3 — Data Layer Rewrite + Research (parallel, 3 agents)

### Task 3.0: Apply Phase 2 migration to dev DB

**Files:**
- None (just runs migration)

- [ ] **Step 1: Ensure dev Postgres is up**

```bash
bash scripts/dev-bootstrap.sh
```

- [ ] **Step 2: Apply the Phase 2 migration**

```bash
DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" \
  npx prisma migrate deploy
```
Expected: "Applying migration `<timestamp>_pivot-card-holding`"

- [ ] **Step 3: Verify schema is live**

```bash
docker compose -f docker-compose.dev.yml exec postgres-dev psql -U tcg_dev -d tcg_ledger_dev -c '\dt'
```
Expected tables: `Card`, `Holding`, `legacy_inventory`, `USER`, `user_permissions`, `quantityLog`, `priceLog`, and the shelved `orders`, `order_items`, `CUSTOMER`, `store_settings`.

---

### Task 3.1: Dispatch backend rewrite agent

**Goal:** Rewrite the data layer (repositories → services → mappers → auth) to operate on Card+Holding. Runs in background; main Claude also dispatches the two research agents in parallel.

- [ ] **Step 1: Dispatch `feature-dev:code-architect` with the following prompt**

```
You are rewriting the data layer for the TCG Ledger personal-tracker pivot.
Full context:

SPEC: docs/superpowers/specs/2026-04-15-personal-tracker-pivot-design.md
      (read sections 2, 3, 5 carefully — Section 2 data model, Section 3 auth,
       Section 5 trade binder as it defines your listTradeBinder API)
PHASE 2 REPORT: docs/superpowers/reports/PHASE-2-REPORT.md
      (your typecheck failure list lives here)

SCOPE (you touch exactly these files):

RENAMES (use git mv to preserve history):
  - src/repositories/inventory.repository.ts → src/repositories/holding.repository.ts
  - src/services/inventory.service.ts → src/services/holding.service.ts
  - src/services/buylist.service.ts → src/services/personal-targets.service.ts
  - src/mappers/inventory.mapper.ts → src/mappers/holding.mapper.ts

REWRITES (the files you touch):
  - src/repositories/holding.repository.ts (newly renamed — full rewrite)
  - src/repositories/catalog.repository.ts (modify — upsert Card; generalize)
  - src/repositories/log.repository.ts (modify — new quantityLog/priceLog shapes)
  - src/repositories/settings.repository.ts (modify — trim shop fields)
  - src/repositories/team.repository.ts (modify — 2-flag permissions)
  - src/services/holding.service.ts (full rewrite)
  - src/services/personal-targets.service.ts (full rewrite)
  - src/services/catalog.service.ts (modify — upsert Card then Holding)
  - src/services/dashboard.service.ts (modify — per-user + Tailnet aggregates)
  - src/services/settings.service.ts (modify — personal/global prefs)
  - src/services/team.service.ts (modify — 2-flag permissions)
  - src/services/logging.service.ts (modify — new log shape)
  - src/services/email.service.ts (KEEP infrastructure; verify no shop template imports)
  - src/mappers/holding.mapper.ts (full rewrite)
  - src/mappers/dashboard.mapper.ts (modify — new stat DTOs)
  - src/mappers/ledger.mapper.ts (modify — new log DTOs)
  - src/mappers/settings.mapper.ts (modify — trimmed fields)
  - src/mappers/team.mapper.ts (modify — 2 flags)
  - src/mappers/catalog.mapper.ts (modify — returns CardDTO)
  - src/mappers/index.ts (update barrel exports)
  - src/mappers/trade-binder.mapper.ts (NEW)
  - src/lib/auth.ts (rewrite: drop CUSTOMER branch, new session shape)
  - src/lib/auth-guard.ts (rewrite: requireUser, requireAdmin, requireOwnership; shelve requireCustomer)
  - src/middleware.ts (rewrite: single check)

DO NOT TOUCH:
  - src/app/admin/** (UI layer — Phase 4 owns that)
  - src/app/actions/** (action layer — Phase 4 owns that)
  - src/app/api/** (Phase 4 owns)
  - prisma/schema.prisma (already done in Phase 2)
  - src/lib/types.ts, src/lib/dtos.ts (already done in Phase 2)
  - src/_shelved/** (frozen)

LAYERING RULES (non-negotiable):
  - Repositories contain ONLY Prisma calls. No business logic. Use named *_SELECT constants for projections.
  - Services contain ONLY business logic. They call repositories and mappers. They throw errors; they do not return success/error unions.
  - Mappers are pure functions from DB row types to DTOs. No I/O.
  - Auth guards go in src/lib/auth-guard.ts. They fetch session, verify, return session, throw on failure.

KEY INTERFACES YOU MUST IMPLEMENT:

holdingRepository:
  findById(id: string): Promise<(Holding & { card: Card, user: UserSlim }) | null>
  findByUser(userId: string, filter: HoldingFilterInput): Promise<HoldingWithCard[]>
  findListed(filter: TradeBinderFilter & { excludeUserId?: string }): Promise<HoldingWithCardAndUser[]>
    — filters listedForTrade:true AND quantity>0; supports search (Card.name ILIKE),
      game/condition filters, exclude/include owner, sort, pagination (take: 100)
  create(userId: string, input: CreateHoldingInput): Promise<Holding>
  update(id: string, input: UpdateHoldingInput): Promise<Holding>
  delete(id: string): Promise<void>
  upsertFromImport(userId: string, cardId: string, data: { quantity, condition, notes? }): Promise<Holding>
  countByUser(userId: string): Promise<number>
  sumValueByUser(userId: string): Promise<number>   // sum of marketPrice * quantity
  TRADE_BINDER_SELECT: Prisma.HoldingSelect   // named projection for listings

catalogRepository (renamed/modified from current):
  findCardByPrintingKey(key: { name, set, collectorNumber, finish }): Promise<Card | null>
  findCardByScryfallId(scryfallId: string): Promise<Card | null>
  upsertCard(input: CreateCardInput): Promise<Card>
  searchCards(query: string, game?: string, take?: number): Promise<Card[]>

logRepository (renamed/modified from current):
  createQuantityLog(input: { userId, holdingId?, cardName, cardSet, condition?, finish?, delta, reason?, actorId }): Promise<void>
  createPriceLog(input: { cardId, oldPrice, newPrice, source }): Promise<void>
  findQuantityLogByUser(userId: string, filter?: { from?, to?, cardName? }, take?: number): Promise<QuantityLog[]>
  findPriceLogByCard(cardId: string, take?: number): Promise<PriceLog[]>

holdingService:
  listForUser(userId, filter): Promise<HoldingDTO[]>
  getById(id, session): Promise<HoldingDTO>
  create(session, input): Promise<HoldingDTO>
  update(session, id, input): Promise<HoldingDTO>  // calls requireOwnership
  delete(session, id): Promise<void>                // calls requireOwnership
  toggleListing(session, id, listed, notes?): Promise<HoldingDTO>
  listTradeBinder(filter): Promise<TradeBinderItemDTO[]>  // called from trade-binder action
  bulkImportFromCsv(userId, rows): Promise<{ imported: number, failed: Array<{ row, reason }> }>

personalTargetsService:
  listForUser(userId): Promise<HoldingDTO[]>      // returns holdings where ideal>0 or max>0
  updateTargets(session, holdingId, ideal, max): Promise<HoldingDTO>  // requireOwnership

catalogService:
  importFromScryfall(session, scryfallId): Promise<CardDTO>
  importFromPokemon(session, pokemonId): Promise<CardDTO>
  manualCreate(session, input): Promise<CardDTO>
  search(query, game?): Promise<CardDTO[]>
  updateMarketPrice(session, cardId, price): Promise<CardDTO>  // requireAdmin or permissions.inventoryUpdatePrices

dashboardService:
  getPersonalStats(userId): Promise<{ totalCards: int, uniquePrintings: int, totalValueCents: int, recentlyAcquired: HoldingDTO[], topGames: Array<{ game, count }> }>
  getTailnetStats(): Promise<{ totalUsers: int, totalListings: int, trendingCards: Array<{ card: CardDTO, ownerCount: int }>, recentListings: TradeBinderItemDTO[] }>
  // Do NOT include revenue/orders stats — those are shelved

settingsService:
  getGlobal(): Promise<GlobalSettingsDTO>   // app-name, default preferences
  updateGlobal(session, input): Promise<GlobalSettingsDTO>   // requireAdmin

teamService:
  listAll(session): Promise<UserSlimDTO[]>   // requireAdmin
  create(session, input: { email, password, displayName, role }): Promise<UserSlimDTO>   // requireAdmin
  updatePermissions(session, userId, perms): Promise<UserSlimDTO>   // requireAdmin
  deleteUser(session, userId): Promise<void>   // requireAdmin
  updateSelfProfile(session, input: { displayName? }): Promise<UserSlimDTO>

loggingService:
  logQuantityChange(args): Promise<void>
  logPriceChange(args): Promise<void>
  listUserLedger(userId, filter?): Promise<LedgerEntryDTO[]>
  listCardPriceHistory(cardId): Promise<LedgerEntryDTO[]>

auth-guard.ts:
  requireUser(): Promise<Session>        // throws if not authenticated
  requireAdmin(): Promise<Session>       // throws if not ADMIN
  requireOwnership(holdingId: string, userId: string): Promise<void>   // fetches holding, throws unless userId matches or session is ADMIN

auth.ts:
  NextAuth config with credentials provider only.
  Session shape: { id, email, displayName, role, permissions }
  JWT + session callbacks hydrate permissions object (null for full ADMIN access)
  No CUSTOMER branch at all.
  Lowercase email on credentials check for consistency.

middleware.ts:
  Single check: if pathname startsWith /admin and not /admin/login and no token → redirect to /admin/login with callbackUrl.
  Matcher: ['/admin/:path*']

MAPPERS (all pure functions):
  toHoldingDTO(holding: Holding & { card: Card }): HoldingDTO
  toHoldingDTOs(holdings): HoldingDTO[]
  toCardDTO(card: Card): CardDTO
  toCardDTOs(cards): CardDTO[]
  toTradeBinderItemDTO(row: Holding & { card: Card, user: UserSlim }): TradeBinderItemDTO
  toTradeBinderItemDTOs(rows): TradeBinderItemDTO[]
  toLedgerEntryDTO(qLog or pLog): LedgerEntryDTO  (handle both types via discriminator)
  toUserSlimDTO(user): UserSlimDTO
  toDashboardPersonalStats(...)
  toDashboardTailnetStats(...)

CONVENTIONS:
  - Prices: Int cents everywhere.
  - Cache tags preserved from current code (unstable_cache calls — leave them functional but retarget their keys)
  - Named SELECT constants in repositories (HOLDING_LIST_SELECT, HOLDING_DETAIL_SELECT, TRADE_BINDER_SELECT, CARD_LIST_SELECT)
  - Sanitize errors at the service layer — do not leak Prisma deadlock messages etc.

GATE you must pass before reporting complete:
  - npx prisma generate succeeded (Phase 2 already did this, confirm client has Card + Holding types)
  - npm run typecheck passes for:
      src/lib/, src/services/, src/repositories/, src/mappers/, src/middleware.ts
    Failures are EXPECTED in src/app/admin/** and src/app/actions/** and src/tests/** — document them but do not fix them
  - Layering rules not violated (grep src/repositories/ for anything other than prisma imports,
    grep src/services/ for 'NextResponse|cookies()|headers()|auth()' — these should not appear)

Write docs/superpowers/reports/PHASE-3-BACKEND-REPORT.md with:
  - File-by-file summary of changes
  - Any departures from the spec's interfaces and why
  - Remaining typecheck failures outside your scope (path-grouped counts)

DO NOT commit. Main Claude handles the commit after review.
```

---

### Task 3.2: Dispatch code-explorer frontend audit agent (parallel)

- [ ] **Step 1: Dispatch `feature-dev:code-explorer` in parallel with the backend agent**

```
You are auditing the current frontend of a Next.js app that is being pivoted
from a retail TCG storefront to a personal collection tracker. Produce a
detailed markdown report at:

  docs/superpowers/research/frontend-audit.md

SCOPE (read-only audit — you do not modify code):
  - src/app/admin/** (the retained admin UI — your main focus)
  - src/components/admin/** and src/components/ui/**
  - src/components/providers.tsx
  - next.config.ts (for CSP, image domains, etc.)
  - tailwind.config.* and globals.css (theming)
  - package.json (UI dependencies)
  - components.json (shadcn config)

DO NOT audit:
  - src/_shelved/** (shelved; out of scope)
  - Anything under node_modules
  - Tests (they're in a separate audit)

REPORT STRUCTURE:
  1. shadcn/Radix primitive inventory — list every @radix-ui/* and shadcn
     component imported anywhere, with usage counts per component
  2. Per-page component map — for each retained admin page, list the components
     rendered, the props they consume, and the user actions they expose
  3. Tailwind theming audit — color tokens in use, spacing patterns, dark-mode
     coverage (does every page have dark variants?)
  4. Retained vs shelved components — which components under src/components/ui
     or src/components/admin/ are still reachable from retained pages vs
     orphaned now that shop code is shelved
  5. Genericness audit — specific examples (file + line range) where the UI
     feels AI-template-generic: stock muted-gray color schemes, cookie-cutter
     card layouts, generic "Welcome back" headings, dashboard widgets that
     look like Vercel templates, forms that don't have any distinctive
     character. Be concrete — cite specific elements that need character.
  6. Typography audit — current font stack, type scale usage, places where
     type hierarchy is flat
  7. Mobile readiness — for each retained page, assess how close it is to
     working on a 390px-wide viewport (Does it? Partially? Not at all?)

Cite files with paths + line ranges.

DO NOT propose redesigns — that's the frontend-design skill's job in Phase 5.
Your job is to describe what IS, not what SHOULD BE.

You may use the ux-researcher agent's reports once they land, but do not wait
for them — run in parallel.
```

---

### Task 3.3: Dispatch UX researcher agent (parallel)

- [ ] **Step 1: Dispatch the custom `ux-researcher` subagent in parallel**

```
You are performing a comprehensive UX research pass for a Next.js TCG
collection tracker that's being pivoted from a retail storefront to a personal
multi-user tool with a passive trade binder.

SPEC: docs/superpowers/specs/2026-04-15-personal-tracker-pivot-design.md
     (read sections 1, 5, and 6 especially)

DELIVERABLES — three files under docs/superpowers/research/:

1. ux-heuristic-audit.md
   - Heuristic evaluation of every retained admin page using Nielsen's 10 heuristics
   - Pages to audit:
     * /admin/login (src/app/admin/login/page.tsx)
     * /admin (src/app/admin/(dashboard)/page.tsx)
     * /admin/inventory (src/app/admin/(dashboard)/inventory/) — will become /admin/collection
     * /admin/buylist (src/app/admin/(dashboard)/buylist/) — will become /admin/targets
     * /admin/add-cards (src/app/admin/(dashboard)/add-cards/)
     * /admin/ledger (src/app/admin/(dashboard)/ledger/)
     * /admin/users (src/app/admin/(dashboard)/users/)
     * /admin/settings (src/app/admin/(dashboard)/settings/)
     * /admin/(dashboard)/layout.tsx — sidebar navigation
   - For each finding: severity (critical/high/medium/low), file path + component,
     evidence type (code-based/domain-informed), finding, recommendation, effort (S/M/L)
   - Mobile-specific issues called out in a separate section per page (375-428px portrait)
   - Final: "top 10 prioritized findings" table

2. competitive-analysis.md
   - Research and summarize 5 competitors: Deckbox, Moxfield, ManaBox, Dragon Shield
     (the mobile app), Cardsphere
   - For each: core value prop, standout UX patterns, pain points, mobile-first?,
     what their collection-tracking UI does, what their trade/social features look like
   - Synthesis: "patterns we should adopt" and "patterns we should avoid"
   - Concrete: cite specific screen patterns. Use WebFetch/WebSearch as needed.

3. user-journeys.md
   - Three journey maps, each with a mobile variant:
     a) "I just cracked a booster pack — add these 8 cards to my collection"
     b) "I want to browse my friends' trade binders and find something good"
     c) "I want to bulk-update market prices across my Magic collection"
   - For each journey: phases, actions, touchpoints (which routes/components),
     friction points, emotional state, opportunities
   - Mobile variant: same journey done on a phone (physical context differs —
     crack packs on couch with phone, not at desk)

TOOLS: Read, Grep, Glob, WebFetch, WebSearch only. You are read-only.

METHODOLOGY: Follow the profile in .claude/agents/ux-researcher.md. Explicitly
distinguish "evidence-based from reading code" vs "domain-informed recommendation"
in every finding.

DO NOT write code. DO NOT modify anything. Produce research reports only.
```

---

### Task 3.4: Wait for all three agents, then verify Phase 3 gate

- [ ] **Step 1: Wait for all three agents to complete**

If using `run_in_background`, monitor their task IDs. Main Claude can continue other prep work but must not start Phase 4 until all three are done.

- [ ] **Step 2: Read the three research reports and the backend report**

- `docs/superpowers/research/frontend-audit.md`
- `docs/superpowers/research/ux-heuristic-audit.md`
- `docs/superpowers/research/competitive-analysis.md`
- `docs/superpowers/research/user-journeys.md`
- `docs/superpowers/reports/PHASE-3-BACKEND-REPORT.md`

Confirm each has concrete findings (not vague musings) and cites file paths.

- [ ] **Step 3: Run scoped typecheck**

```bash
npm run typecheck 2>&1 | tee /tmp/phase3-typecheck.log
```

- [ ] **Step 4: Verify failures are UI-layer only**

```bash
grep -E 'error TS' /tmp/phase3-typecheck.log | awk -F'(' '{print $1}' | sort -u
```

Every file in the output MUST be under one of:
- `src/app/admin/**`
- `src/app/actions/**`
- `src/app/api/**` (for retained API routes that use shelved services)
- `src/tests/**`

If any failure is under `src/lib/`, `src/services/`, `src/repositories/`, `src/mappers/`, or `src/middleware.ts`, the backend agent missed something — dispatch it again with the specific file list.

- [ ] **Step 5: Commit Phase 3**

```bash
git add -A
git commit -m "refactor(backend): rewrite data layer on Card+Holding"
```

### Phase 3 Gate

- [ ] Backend agent's renames + rewrites complete
- [ ] `npx prisma generate` succeeded (client has Card + Holding types)
- [ ] Typecheck failures scoped to UI layer only (documented in PHASE-3-BACKEND-REPORT.md)
- [ ] All three research reports exist with severity-rated findings
- [ ] Layering rules verified: `grep -r 'NextResponse\|cookies(\|headers(' src/services/` returns nothing meaningful
- [ ] No repository file imports anything other than Prisma

---

## Phase 4 — UI Retargeting (backend-UI agent)

### Task 4.0: Seed dev DB with admin user + fixture cards

**Files:**
- Creates: dev DB rows (ephemeral)

- [ ] **Step 1: Build CLI scripts FIRST (before Phase 4 agent dispatch)**

The Phase 4 agent will need scripts/create-admin.ts to be working against the new schema. Two options:
  A) Main Claude rewrites the four CLI scripts before Phase 4 dispatch
  B) Include CLI scripts in the Phase 4 agent's scope

Choose A — main Claude writes the CLI scripts since they're small and deterministic.

Create:
  - scripts/_lib.ts (shared Prisma client + readline helper)
  - scripts/create-admin.ts (rewritten — creates ADMIN user with displayName)
  - scripts/create-user.ts (NEW — creates USER role)
  - scripts/reset-password.ts (NEW — updates password for existing user)
  - scripts/import-cards.ts (NEW — bulk CSV import)

See Task 4.0b for the implementations.

- [ ] **Step 2: See Task 4.0b for CLI script code. Once 4.0b is done, proceed.**

- [ ] **Step 3: Seed dev admin**

```bash
DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" \
  npx tsx scripts/create-admin.ts --email dev@local --password devpassword --displayName "Dev Admin"
```

- [ ] **Step 4: Create a fixture CSV**

Write `scripts/fixtures/dev-cards.csv`:

```csv
name,set,collectorNumber,finish,game,condition,quantity,notes
Lightning Bolt,LEB,161,nonfoil,magic,NM,2,
Counterspell,LEB,54,nonfoil,magic,NM,1,
Dark Ritual,LEB,98,nonfoil,magic,LP,1,
Black Lotus,LEB,232,nonfoil,magic,NM,1,fixture
Charizard,BASE SET,4,holofoil,pokemon,NM,1,
Pikachu,BASE SET,58,nonfoil,pokemon,LP,3,
Blastoise,BASE SET,2,holofoil,pokemon,NM,1,
Mewtwo,BASE SET,10,holofoil,pokemon,NM,1,
Mox Sapphire,LEB,265,nonfoil,magic,MP,1,
Tarmogoyf,FUT,153,nonfoil,magic,NM,2,
```

- [ ] **Step 5: Import fixture cards**

```bash
DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" \
  npx tsx scripts/import-cards.ts --user dev@local --file scripts/fixtures/dev-cards.csv
```
Expected: "10 cards imported, 0 failed"

- [ ] **Step 6: Verify seed**

```bash
docker compose -f docker-compose.dev.yml exec postgres-dev \
  psql -U tcg_dev -d tcg_ledger_dev -c 'SELECT COUNT(*) FROM "Card"; SELECT COUNT(*) FROM "Holding";'
```
Expected: 10 cards, 10 holdings (may be fewer if the CSV had duplicate printings).

---

### Task 4.0b: Write CLI bootstrap scripts

**Files:**
- Create: `scripts/_lib.ts`, `scripts/create-admin.ts`, `scripts/create-user.ts`, `scripts/reset-password.ts`, `scripts/import-cards.ts`
- Create: `scripts/fixtures/dev-cards.csv`

- [ ] **Step 1: Write `scripts/_lib.ts`**

```ts
// scripts/_lib.ts
// Shared helpers for CLI bootstrap scripts.

import { PrismaClient } from '@prisma/client'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import bcrypt from 'bcryptjs'

export const prisma = new PrismaClient()

export async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input, output })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        args[key] = next
        i++
      } else {
        args[key] = 'true'
      }
    }
  }
  return args
}
```

- [ ] **Step 2: Write `scripts/create-admin.ts`**

```ts
// scripts/create-admin.ts
// Usage: npx tsx scripts/create-admin.ts --email <email> --password <password> --displayName <name>
// If flags omitted, prompts interactively.

import { prisma, prompt, hashPassword, parseArgs } from './_lib'

async function main() {
  const args = parseArgs()
  const email = args.email || (await prompt('Admin email: '))
  const password = args.password || (await prompt('Password: '))
  const displayName = args.displayName || (await prompt('Display name: '))

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    console.error(`ERROR: User ${email} already exists.`)
    process.exit(1)
  }

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: await hashPassword(password),
      displayName: displayName || null,
      role: 'ADMIN',
      permissions: {
        create: {
          inventoryUpdatePrices: true,
          addCardsAccess: true,
        },
      },
    },
    select: { id: true, email: true, displayName: true, role: true },
  })

  console.log(`Created admin: ${user.email} (id=${user.id})`)
  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 3: Write `scripts/create-user.ts`**

Similar pattern to create-admin, but `role: 'USER'` and default permissions with `inventoryUpdatePrices: false, addCardsAccess: true`. Include the same `--email`, `--password`, `--displayName` flags.

- [ ] **Step 4: Write `scripts/reset-password.ts`**

```ts
// scripts/reset-password.ts
// Usage: npx tsx scripts/reset-password.ts --email <email> [--password <newPassword>]

import { prisma, prompt, hashPassword, parseArgs } from './_lib'

async function main() {
  const args = parseArgs()
  const email = args.email || (await prompt('User email: '))
  const password = args.password || (await prompt('New password: '))

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) {
    console.error(`ERROR: No user with email ${email}`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(password) },
  })

  console.log(`Password reset for ${email}`)
  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 5: Write `scripts/import-cards.ts`**

```ts
// scripts/import-cards.ts
// Usage: npx tsx scripts/import-cards.ts --user <email> --file <path.csv>
//
// CSV columns: name,set,collectorNumber,finish,game,condition,quantity,notes
//
// For each row:
//   1. Upsert Card by unique key (name, set, collectorNumber, finish)
//   2. Upsert Holding for (userId, cardId, condition) — adds to quantity if exists
//   3. Log quantity delta

import { prisma, parseArgs } from './_lib'
import { readFile } from 'node:fs/promises'
import { parse } from 'csv-parse/sync'  // if csv-parse unavailable, use Papa.parse from papaparse

type Row = {
  name: string; set: string; collectorNumber: string; finish: string
  game: string; condition: string; quantity: string; notes?: string
}

async function main() {
  const args = parseArgs()
  if (!args.user || !args.file) {
    console.error('Usage: --user <email> --file <path.csv>')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email: args.user.toLowerCase() } })
  if (!user) {
    console.error(`ERROR: No user with email ${args.user}`)
    process.exit(1)
  }

  const csvText = await readFile(args.file, 'utf-8')
  const rows: Row[] = parse(csvText, { columns: true, skip_empty_lines: true, trim: true })

  let imported = 0
  const failed: Array<{ row: Row; reason: string }> = []

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      try {
        const card = await tx.card.upsert({
          where: {
            printing_key: {
              name: row.name,
              set: row.set,
              collectorNumber: row.collectorNumber,
              finish: row.finish,
            },
          },
          create: {
            name: row.name,
            set: row.set,
            setName: row.set,  // caller may not know; set same as set code
            collectorNumber: row.collectorNumber,
            finish: row.finish,
            game: row.game,
            rarity: 'unknown',
          },
          update: {},
        })

        const quantityInt = parseInt(row.quantity, 10) || 1
        const existing = await tx.holding.findUnique({
          where: {
            user_printing_condition: {
              userId: user.id,
              cardId: card.id,
              condition: row.condition || 'NM',
            },
          },
        })

        if (existing) {
          await tx.holding.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + quantityInt },
          })
        } else {
          await tx.holding.create({
            data: {
              userId: user.id,
              cardId: card.id,
              condition: row.condition || 'NM',
              quantity: quantityInt,
              notes: row.notes || null,
            },
          })
        }

        await tx.quantityLog.create({
          data: {
            userId: user.id,
            cardName: row.name,
            cardSet: row.set,
            condition: row.condition || 'NM',
            finish: row.finish,
            delta: quantityInt,
            reason: 'import',
            actorId: user.id,
            time: new Date(),
          },
        })

        imported++
      } catch (err: any) {
        failed.push({ row, reason: err.message })
      }
    }
  })

  console.log(`${imported} cards imported, ${failed.length} failed`)
  if (failed.length > 0) {
    console.log('Failed rows:')
    for (const f of failed) console.log(`  ${f.row.name} (${f.row.set}): ${f.reason}`)
  }
  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
```

Note: The current codebase has `papaparse`, not `csv-parse`. If `csv-parse/sync` is not available, replace the import with `import Papa from 'papaparse'` and use `Papa.parse(csvText, { header: true, skipEmptyLines: true }).data`.

- [ ] **Step 6: Typecheck the scripts**

```bash
npx tsc --noEmit scripts/*.ts
```
Expected: clean. Fix any errors before proceeding.

- [ ] **Step 7: Test each script against dev DB**

(Move to Task 4.0 Step 3 onward — run the seed.)

- [ ] **Step 8: Commit CLI scripts**

```bash
git add scripts/_lib.ts scripts/create-admin.ts scripts/create-user.ts scripts/reset-password.ts scripts/import-cards.ts scripts/fixtures/dev-cards.csv
git commit -m "feat(scripts): add CLI bootstrap scripts for Card+Holding"
```

---

### Task 4.1: Dispatch UI retargeting agent

- [ ] **Step 1: Dispatch `feature-dev:code-architect` (fresh dispatch) with this prompt**

```
You are retargeting the admin UI for the TCG Ledger personal-tracker pivot.
Full context:

SPEC: docs/superpowers/specs/2026-04-15-personal-tracker-pivot-design.md
      (read sections 2, 3, 5, and 8.4 carefully)
PHASE 3 REPORT: docs/superpowers/reports/PHASE-3-BACKEND-REPORT.md
RESEARCH REPORTS (read but don't act on design recommendations — visual design is Phase 5):
  - docs/superpowers/research/frontend-audit.md
  - docs/superpowers/research/ux-heuristic-audit.md

YOUR JOB: Make every retained admin page compile and functionally work against
the new DTOs from the rewritten services. DO NOT visually redesign anything.
DO NOT change layouts beyond what's structurally required. Phase 5 owns the
visual refresh.

SCOPE (you touch exactly these files and create these new ones):

RENAMES (use git mv to preserve history):
  - src/app/admin/(dashboard)/inventory/ → src/app/admin/(dashboard)/collection/
  - src/app/admin/(dashboard)/buylist/ → src/app/admin/(dashboard)/targets/

REWRITES (modify existing):
  - src/app/admin/(dashboard)/collection/page.tsx (renamed) + all its client components
  - src/app/admin/(dashboard)/targets/page.tsx (renamed) + all its client components
  - src/app/admin/(dashboard)/add-cards/page.tsx — consume new catalogService API
  - src/app/admin/(dashboard)/ledger/page.tsx — consume new LedgerEntryDTO
  - src/app/admin/(dashboard)/users/page.tsx — 2-flag permissions only
  - src/app/admin/(dashboard)/settings/page.tsx — trimmed settings
  - src/app/admin/(dashboard)/page.tsx — new dashboard widgets (personal + Tailnet stats)
  - src/app/admin/(dashboard)/layout.tsx — sidebar nav: drop Orders/Customers/POS; keep Dashboard/Collection/Targets/Add Cards/Ledger/Users/Settings; ADD "Trade Binder" between Ledger and Users
  - src/app/admin/login/page.tsx — new auth shape (no CUSTOMER branch)
  - src/app/actions/inventory.ts — RENAME its internals but keep the file path (or rename to src/app/actions/holding.ts — choose one and be consistent). Recommend: rename to src/app/actions/holding.ts via git mv, update all imports.
  - src/app/actions/buylist.ts — rewrite for personalTargetsService
  - src/app/actions/dashboard.ts — consume new stats
  - src/app/actions/import-helpers.ts — Card+Holding upsert helpers (may be largely superseded by the new catalogService; delete if no longer used, otherwise trim)
  - src/app/actions/settings.ts — trimmed
  - src/app/actions/team.ts — 2 flags
  - src/app/api/auth/[...nextauth]/route.ts — updated provider config (just re-exports authHandlers from src/lib/auth.ts)
  - src/app/api/inventory/export/route.ts — rename path to src/app/api/collection/export/route.ts and emit HoldingDTO rows as CSV
  - src/app/api/admin/ledger/export/route.ts — new LedgerEntryDTO shape

NEW FILES (create):
  - src/app/admin/(dashboard)/trade-binder/page.tsx — trade binder page per spec §5
  - src/app/actions/trade-binder.ts — getTradeBinder server action per spec §5
  - src/app/actions/holding.ts — server actions: toggleListing, updateHolding,
    deleteHolding, createHolding, bulkToggleListings (replaces old inventory.ts actions)
  - src/components/CardDetailDialog.tsx — moved from src/_shelved/components/shop/QuickViewDialog.tsx
    (actually: copy + retarget — don't move; shelved code stays frozen). Adapt it to
    consume CardDTO + HoldingDTO and show "Contact owner" affordance (mailto link).

DO NOT TOUCH:
  - prisma/schema.prisma (frozen after Phase 2)
  - src/lib/ (Phase 3 final)
  - src/services/, src/repositories/, src/mappers/ (Phase 3 final)
  - src/middleware.ts (Phase 3 final)
  - src/_shelved/** (frozen)
  - Any visual design / Tailwind classes beyond what's structurally required
  - Typography, color palette, spacing — Phase 5 owns these

SIDEBAR NAV ORDER (update src/app/admin/(dashboard)/layout.tsx):
  1. Dashboard (/admin)
  2. Collection (/admin/collection)
  3. Targets (/admin/targets)
  4. Add Cards (/admin/add-cards)
  5. Ledger (/admin/ledger)
  6. Trade Binder (/admin/trade-binder)
  7. Users (/admin/users) — ADMIN only (hide for USER role)
  8. Settings (/admin/settings) — ADMIN only

TRADE BINDER PAGE (src/app/admin/(dashboard)/trade-binder/page.tsx):
  - Read spec §5 carefully
  - Server component that calls trade-binder action on mount
  - Client subcomponent for: top bar (search, filters, showMine toggle), results grid, left rail
  - Use existing shadcn components (Input, Select, Button, Card, Badge)
  - Results grid: single column on mobile, 3-4 col on desktop (use Tailwind grid classes)
  - Left rail: collapsible, hidden on mobile behind a drawer button (Phase 5 styles this; you just wire the state)
  - Tile click: opens CardDetailDialog with owner info + mailto affordance
  - Filters debounce via use-debounce (already installed)

COLLECTION PAGE (src/app/admin/(dashboard)/collection/page.tsx):
  - Reuse existing TanStack Table setup
  - Columns: image (small), name, set, collectorNumber, finish, condition, quantity, marketPrice, acquiredPrice, trade toggle, actions (edit/delete)
  - Filters: search, game, set, condition, listedForTrade
  - Bulk actions: list for trade, unlist, delete
  - CSV export via the retargeted API route

TARGETS PAGE (src/app/admin/(dashboard)/targets/page.tsx):
  - Lists holdings where idealQuantity > 0 or maxQuantity > 0
  - Columns: name, set, condition, current qty, ideal, max, fill status (e.g., "2/4")
  - Edit inline for ideal/max values
  - No separate buylist intake concept

LAYERING RULES:
  - Actions call services. Services never appear in client components directly.
  - Client components call actions via props or imported server actions.
  - Every mutation action MUST call requireUser or requireAdmin as the first line.
  - Every Holding mutation MUST call requireOwnership(holdingId, session.user.id).
  - Action return shape: { success: true; data: T } | { success: false; error: string }
  - revalidatePath called at the end of mutation actions.

GATE you must pass before reporting complete:
  - npm run typecheck passes for the FULL codebase (including UI and tests — tests may fail on fixtures but typecheck must pass for retained source)
  - npm run lint passes
  - Dev server starts (test with `npm run dev &` then `curl http://localhost:3000/admin/login` — expect HTML, not 500)
  - node scripts/playwright-smoke.mjs --desktop-only passes against the running dev server (use dev@local/devpassword credentials)

BEFORE YOU START:
  - Dev DB is already seeded with admin user (dev@local / devpassword) and 10 fixture cards.
  - You can start the dev server with `npm run dev` anytime for manual testing.

Write docs/superpowers/reports/PHASE-4-REPORT.md covering:
  - Every page retargeted, with a short note on the DTO flow
  - New pages created (trade binder, retargeted collection/targets)
  - New actions created
  - Any layering rule violations you found in the backend layer (report back to main Claude)
  - Playwright smoke output (passing pages list)

DO NOT commit. Main Claude handles the commit after verification.
```

- [ ] **Step 2: Main Claude verification — typecheck full**

```bash
npm run typecheck
```
Expected: clean (zero errors across the whole codebase except test fixtures).

- [ ] **Step 3: Main Claude verification — lint**

```bash
npm run lint
```
Expected: clean.

- [ ] **Step 4: Main Claude verification — dev server starts**

```bash
npm run dev &
DEV_PID=$!
sleep 8
curl -sf http://localhost:3000/admin/login > /dev/null && echo "OK" || echo "FAIL"
kill $DEV_PID 2>/dev/null
```

- [ ] **Step 5: Main Claude verification — desktop Playwright smoke**

```bash
npm run dev &
DEV_PID=$!
sleep 8
PHASE=4 LOGIN_EMAIL=dev@local LOGIN_PASSWORD=devpassword node scripts/playwright-smoke.mjs --desktop-only
SMOKE_EXIT=$?
kill $DEV_PID 2>/dev/null
test $SMOKE_EXIT -eq 0 && echo "SMOKE OK" || echo "SMOKE FAIL"
```

Expected: all pages pass desktop smoke.

- [ ] **Step 6: Commit Phase 4**

```bash
git add -A
git commit -m "refactor(ui): retarget admin pages to Card+Holding; add trade binder"
```

### Phase 4 Gate

- [ ] `npm run typecheck` passes cleanly for full codebase
- [ ] `npm run lint` passes
- [ ] Dev server responds on `/admin/login`
- [ ] Playwright desktop smoke passes for all retained pages
- [ ] Trade binder page renders (even if the fixture data makes it empty)
- [ ] Sidebar nav reflects the new ordering; no Orders/Customers/POS entries
- [ ] `PHASE-4-REPORT.md` exists

---

## Phase 5 — Visual Refresh + Mobile (frontend-design skill)

### Task 5.1: Invoke frontend-design skill

The `frontend-design` skill is a full workflow — it handles moodboarding, typography, motion, layout, component design. Main Claude invokes it with a design brief.

- [ ] **Step 1: Write the design brief**

Save to `docs/superpowers/briefs/phase-5-design-brief.md`:

```markdown
# Phase 5 Frontend Design Brief

## Context

Retargeted TCG collection tracker, admin-facing, Tailnet-scoped. Dev admin
seeded at dev@local/devpassword with 10 fixture cards. Phase 4 has retargeted
all pages to compile and render against new Card+Holding DTOs — you are now
applying the visual refresh and mobile responsive work.

## Stack

- Next.js 16.1, React 19.2, TypeScript 5
- Tailwind CSS 4
- shadcn/ui + Radix UI primitives (already installed — stay with these)
- next-themes (light/dark, both modes must work)
- React Compiler enabled
- Lucide icons

## Priority pages (full visual refresh + mobile)

1. `/admin/login` — currently generic auth card; needs distinctive TCG-aware landing
2. `/admin` (dashboard) — currently revenue-chart layout retargeted; needs "collection at a glance" feel with personal + Tailnet stats
3. `/admin/trade-binder` — brand new page; most design attention; grid of listed cards with good empty state
4. `/admin/collection` — power-user density preserved; better type hierarchy, cleaner filters
5. Card detail modal (src/components/CardDetailDialog.tsx) — desktop centered dialog, mobile full-screen sheet

## Minimal-touch pages (responsive only, no visual redesign beyond what's structurally necessary)

- `/admin/ledger`, `/admin/targets`, `/admin/add-cards`, `/admin/users`, `/admin/settings`

## Responsive requirements

Every retained page must work in iOS Safari + Android Chrome at 375-428px
portrait and 667-926px landscape. Specific patterns per spec §6.2:
- Sidebar → hamburger drawer on mobile
- TanStack tables → card-per-row below md breakpoint
- Card detail modal → full-screen sheet on mobile
- Touch targets: 44x44 px minimum

## Research inputs

Read these before designing:
- docs/superpowers/research/frontend-audit.md (code-based current state)
- docs/superpowers/research/ux-heuristic-audit.md (pain points)
- docs/superpowers/research/competitive-analysis.md (Deckbox/Moxfield/ManaBox patterns)
- docs/superpowers/research/user-journeys.md (the three core journeys)

## Out of scope

- No new component library (stay with shadcn + Radix)
- No new animation library unless you can prove it's needed (Tailwind + CSS transitions preferred)
- No PWA / service worker / offline mode
- No mobile app
- No i18n / translations
- No custom illustrations or original artwork
- No design system documentation site

## Success criteria

- Playwright smoke passes at both 1440x900 and 390x844 viewports
- No body horizontal overflow on any page at 390px
- All touch targets >= 44x44 on mobile
- Dark mode works on every priority page
- The login page does NOT look like a default shadcn template
- The dashboard does NOT look like a Vercel template
```

- [ ] **Step 2: Invoke the frontend-design skill**

```
Skill: frontend-design
Brief: docs/superpowers/briefs/phase-5-design-brief.md
```

Follow the skill's own workflow. When it finishes, it will have applied the design changes directly to the code.

- [ ] **Step 3: Main Claude verification — typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Main Claude verification — lint**

```bash
npm run lint
```

- [ ] **Step 5: Main Claude verification — full Playwright smoke (desktop + mobile)**

```bash
npm run dev &
DEV_PID=$!
sleep 8
PHASE=5 LOGIN_EMAIL=dev@local LOGIN_PASSWORD=devpassword node scripts/playwright-smoke.mjs
SMOKE_EXIT=$?
kill $DEV_PID 2>/dev/null
test $SMOKE_EXIT -eq 0 && echo "SMOKE OK" || echo "SMOKE FAIL"
```

Expected: all pages pass at BOTH viewports.

- [ ] **Step 6: Review screenshots**

```bash
ls docs/superpowers/screenshots/phase-5/
```
Should contain desktop + mobile screenshots of every page.

- [ ] **Step 7: Commit Phase 5**

```bash
git add -A
git commit -m "feat(ui): visual refresh + mobile responsive"
```

### Phase 5 Gate

- [ ] `npm run typecheck` + `npm run lint` pass
- [ ] Playwright smoke passes at 1440×900 AND 390×844 viewports
- [ ] Screenshots captured to `docs/superpowers/screenshots/phase-5/`
- [ ] `PHASE-5-REPORT.md` written (either by the skill or by main Claude summarizing)
- [ ] Dark mode functional on priority pages

---

## Phase 6 — Tests (test agent)

### Task 6.1: Dispatch test agent

- [ ] **Step 1: Dispatch `feature-dev:code-reviewer` (best tool match for test writing) with this prompt**

```
You are writing and updating the test suite for the TCG Ledger personal-tracker
pivot. Full context:

SPEC: docs/superpowers/specs/2026-04-15-personal-tracker-pivot-design.md
PHASE 0 BASELINE: docs/superpowers/reports/PHASE-0-BASELINE.md
PHASE 3 BACKEND REPORT: docs/superpowers/reports/PHASE-3-BACKEND-REPORT.md
PHASE 4 REPORT: docs/superpowers/reports/PHASE-4-REPORT.md

Your job has three parts:

PART 1: UPDATE EXISTING FIXTURES + TESTS

All tests under src/tests/ that reference the old `inventory` types need to
be updated. Use Glob + Grep to find them:

  grep -rln 'InventoryItemDTO\|inventory.service\|inventory.repository\|inventory.mapper\|BuylistItem\|buylist.service' src/tests/

For each test file:
  - Update imports to the new services/mappers (holding.service, holding.mapper,
    personal-targets.service, etc.)
  - Update fixture builders: replace makeMockInventory() with makeMockHolding() +
    makeMockCard(); the former should return a Holding with a nested Card
  - Update assertions: new DTO shapes (HoldingDTO has a nested card: CardDTO)
  - Rename test files to match renamed source files (inventory.mapper.test.ts → holding.mapper.test.ts)

PART 2: ADD NEW TESTS

Write new test files per spec §5 "Tests (new for trade binder)":

1. src/tests/services/holding.service.trade-binder.test.ts
   - listTradeBinder filters by game (all/magic/pokemon)
   - listTradeBinder filters by condition
   - listTradeBinder search matches Card.name substring
   - listTradeBinder excludes user when excludeUserId is set
   - listTradeBinder includes user when excludeUserId is undefined
   - listTradeBinder only returns listedForTrade=true AND quantity>0
   - listTradeBinder respects sort order

2. src/tests/repositories/holding.repository.test.ts
   - findListed produces the expected Prisma query shape (use prisma mock)
   - findByUser scopes to a single user
   - create, update, delete round-trip
   - countByUser returns correct count
   - sumValueByUser multiplies marketPrice * quantity

3. src/tests/actions/trade-binder.test.ts
   - getTradeBinder calls requireUser
   - Returns { success: true, data: [...] } on happy path
   - Returns { success: false, error: ... } when service throws
   - excludeUserId wired correctly from showMine flag

4. src/tests/actions/holding.test.ts
   - toggleListing calls requireOwnership
   - toggleListing revalidates /admin/collection AND /admin/trade-binder
   - Returns discriminated union result shape
   - Non-owner gets error result (does not crash)

5. src/tests/mappers/trade-binder.mapper.test.ts
   - toTradeBinderItemDTOs maps every field
   - Handles missing imageSmall (falls back to imageNormal or null)
   - Handles null tradeNotes
   - Handles user with null displayName (falls back to email local-part)

6. src/tests/services/auth-guard.test.ts
   - requireUser throws when no session
   - requireAdmin throws when role is USER
   - requireOwnership throws when holding belongs to different user
   - requireOwnership allows ADMIN on any holding
   - requireOwnership throws when holding does not exist

7. src/tests/middleware/middleware.test.ts (update existing)
   - No-token request to /admin/collection → redirect to /admin/login with callbackUrl
   - Request to /admin/login with no token → passes through
   - Request to any other path → passes through (matcher config limits to /admin/)

8. src/tests/api/collection-export.test.ts (renamed from inventory-export)
   - Unauthenticated request → 401
   - Authenticated request → 200 with CSV body
   - CSV body contains expected headers (Name,Set,Condition,Quantity,MarketPrice,...)
   - Only returns the calling user's holdings

PART 3: RESPONSIVE TEST UTILITY

Create src/tests/utils/viewport.ts:

```ts
// Test helper for matchMedia-based responsive component tests.
// Usage:
//   import { setViewport } from '../utils/viewport'
//   setViewport('mobile')   // or 'desktop'
//   render(<Component />)

export type Viewport = 'desktop' | 'mobile'

export function setViewport(size: Viewport) {
  const width = size === 'desktop' ? 1440 : 390
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true })
  window.matchMedia = (query: string) => ({
    matches: size === 'mobile' && /max-width:\s*(\d+)px/.test(query)
      ? parseInt(RegExp.$1, 10) >= width
      : size === 'desktop' && /min-width:\s*(\d+)px/.test(query)
      ? parseInt(RegExp.$1, 10) <= width
      : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as any
  window.dispatchEvent(new Event('resize'))
}

afterEach(() => {
  // Reset to desktop after each test if the test set a viewport
})
```

Use it in at least one component test — add src/tests/components/collection-table-responsive.test.tsx:

```ts
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { setViewport } from '../utils/viewport'
import { CollectionTable } from '@/components/admin/CollectionTable'  // adjust path

describe('CollectionTable responsive', () => {
  it('renders a table at desktop viewport', () => {
    setViewport('desktop')
    render(<CollectionTable data={[]} />)
    expect(screen.queryByRole('table')).toBeTruthy()
  })
  it('renders card-per-row layout at mobile viewport', () => {
    setViewport('mobile')
    render(<CollectionTable data={[]} />)
    // The card-per-row layout should NOT render a <table>
    expect(screen.queryByRole('table')).toBeFalsy()
  })
})
```

GATE you must pass before reporting complete:
  - npx vitest run — full suite GREEN
  - Test count delta: compare against PHASE-0-BASELINE.md; after excluding the
    shelved tests, retained-test count should be within ±10% of baseline
    (minus shelved, plus new trade binder / auth-guard / responsive tests)

Write docs/superpowers/reports/PHASE-6-REPORT.md with:
  - Before/after test count (total, retained, shelved, new)
  - List of new test files created
  - List of renamed test files
  - Any tests you skipped with reasoning
  - Coverage: which new services/actions/mappers now have tests vs which don't

DO NOT commit. Main Claude handles the commit.
```

- [ ] **Step 2: Main Claude verification — test suite**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 3: Main Claude verification — test count sanity check**

```bash
npx vitest run 2>&1 | grep -E 'Test Files|Tests' | tail -5
```
Compare against PHASE-0-BASELINE.md. Expected: within ±10% of (baseline - shelved + new).

- [ ] **Step 4: Commit Phase 6**

```bash
git add -A
git commit -m "test: update fixtures, add trade binder + auth-guard + responsive coverage"
```

### Phase 6 Gate

- [ ] `npx vitest run` passes full suite
- [ ] Test count within baseline ±10%
- [ ] New test files exist for: trade binder (service, action, mapper), auth-guard (4 variants), responsive utility (1 component example)
- [ ] `PHASE-6-REPORT.md` exists with coverage map

---

## Phase 7 — Independent Review (code-reviewer agent)

### Task 7.1: Dispatch code-reviewer agent

- [ ] **Step 1: Dispatch `feature-dev:code-reviewer` with minimal context**

```
You are performing an independent code review of a large refactor. Do NOT
read any phase reports — form your own opinion from the diff and the spec.

SPEC: docs/superpowers/specs/2026-04-15-personal-tracker-pivot-design.md
BASE: main branch commit (git merge-base origin/main HEAD)
HEAD: current HEAD on branch pivot/personal-tracker

Get the diff:
  git diff $(git merge-base main HEAD)...HEAD --stat
  git diff $(git merge-base main HEAD)...HEAD (full)

REVIEW CHECKLIST (cover every item):

1. Layering rules — NO violations allowed:
   - grep -rn 'import.*@prisma/client' src/app/actions/  → should only appear in _shelved; active actions only import services
   - grep -rn 'NextResponse\|cookies(\|headers(' src/services/  → should return no meaningful hits
   - grep -rn 'NextResponse\|Request\|Response' src/repositories/  → should return no hits
   - grep -rn 'bcrypt\|jwt' src/services/  → should only appear in auth-related services (none outside _shelved)
   - Services return DTOs or throw; they do NOT return { success } tuples
   - Actions return { success } tuples

2. Forbidden references in active code (not _shelved):
   - grep -rln 'legacyInventory\|LegacyInventory' src/ | grep -v _shelved — must be empty
   - grep -rln 'stripe\|Stripe' src/ | grep -v _shelved | grep -v node_modules — must be empty
   - grep -rln 'vercel\|Vercel' src/ | grep -v _shelved | grep -v node_modules — check carefully
   - grep -rln 'neon\|Neon' src/ | grep -v _shelved | grep -v node_modules — check carefully
   - grep -rln 'OrderItem\|Customer\|StoreSettings' src/ | grep -v _shelved — must be empty in active code
   - grep -rln 'from .*CartContext' src/ | grep -v _shelved — must be empty

3. Auth enforcement on mutations:
   - Every server action in src/app/actions/ that mutates data (create/update/delete)
     MUST call requireUser or requireAdmin as the first line
   - Every action that mutates a Holding MUST call requireOwnership
   - Verify by opening each action file and checking

4. Env var consistency:
   - src/lib/env.ts has: DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_BASE_URL,
     NODEMAILER_HOST, NODEMAILER_PORT, NODEMAILER_USER, NODEMAILER_PASS, NODEMAILER_FROM,
     ADMIN_EMAIL
   - No other env vars are required by active code
   - Shelved code references env.legacy.ts

5. Dead imports / unused exports:
   - Look for imports that are no longer used
   - Look for exports that nothing references
   - Flag suspected dead code but don't DELETE — just report

6. Route consistency:
   - /admin/inventory should NOT exist (renamed to /admin/collection)
   - /admin/buylist should NOT exist (renamed to /admin/targets)
   - /admin/orders, /admin/customers, /admin/pos should NOT exist (shelved)
   - /admin/trade-binder MUST exist and be reachable from sidebar
   - /shop/** must not be routable (all under _shelved)

7. Schema integrity:
   - prisma/schema.prisma has Card, Holding, legacyInventory, and the SHELVED block
   - No orphan Prisma models (models defined but not used by any active code)
     EXCEPT the SHELVED block
   - The migration under prisma/migrations/ matches the schema

8. Test coverage spot check:
   - Every service under src/services/ has at least one test file
   - Every server action under src/app/actions/ has at least one test file
   - No test file imports from _shelved/
   - Run npx vitest run and confirm 100% green

9. Documentation integrity:
   - src/_shelved/README.md lists a shelved-from commit SHA
   - PHASE-*-REPORT.md files exist under docs/superpowers/reports/
   - Research reports exist under docs/superpowers/research/

SEVERITY DEFINITIONS:
  - critical — refactor is broken or a security issue exists
  - high — explicit spec requirement unmet, or layering rule violated
  - medium — smell/risk/tech-debt but not blocking
  - low — polish/nit

Write docs/superpowers/reports/PHASE-7-REVIEW-REPORT.md with all findings.

GATE:
  - Zero critical
  - Zero high
  - Medium findings either fixed inline (if trivial) or noted with deferral
    justification
```

- [ ] **Step 2: Main Claude reads PHASE-7-REVIEW-REPORT.md**

- [ ] **Step 3: If zero critical + zero high, proceed. Otherwise, fix and re-run Phase 7.**

For each critical or high finding:
- Main Claude fixes directly (or dispatches a narrow agent with a specific patch)
- Commits fix: `git commit -m "fix: address phase-7 review finding — <summary>"`
- Re-runs typecheck + lint + vitest + Playwright smoke
- Re-runs the code-reviewer agent for a second pass

- [ ] **Step 4: Commit any fixes as a single commit (if any)**

```bash
git add -A
git commit -m "fix: address phase-7 review findings"
```

### Phase 7 Gate

- [ ] `PHASE-7-REVIEW-REPORT.md` exists
- [ ] Zero critical findings
- [ ] Zero high findings
- [ ] Medium findings addressed inline or deferred with written justification
- [ ] Full verification commands all green: typecheck, lint, vitest, Playwright smoke (both viewports)

---

## Phase 8 — Deploy Handoff (MANUAL)

### Task 8.1: Prepare deployment artifacts

**Files:**
- Create: `docker-compose.yml` (production)
- Create: `Makefile`
- Create: `docs/DEPLOYMENT.md`
- Modify: `next.config.ts` (add `output: "standalone"`)
- Modify: `package.json` (remove `stripe` dep if still present)

- [ ] **Step 1: Write production `docker-compose.yml`**

See spec §7.2 for the full file. Place at repo root.

- [ ] **Step 2: Write `Makefile`**

See spec §7.4 for the full target list. Include all 18 targets.

- [ ] **Step 3: Update `next.config.ts`**

Add `output: "standalone"` to the config export. Remove Stripe entries from `contentSecurityPolicy` (script-src and img-src).

- [ ] **Step 4: Remove `stripe` dep from package.json**

```bash
npm uninstall stripe
```
If `stripe` is still referenced anywhere in active code, revisit — it shouldn't be.

- [ ] **Step 5: Write `docs/DEPLOYMENT.md`**

Include:
- Spec §7.6 bootstrap steps (11 steps)
- Environment variable template
- Backup cron line
- NPM proxy config instructions
- Pi-hole DNS entry format
- Troubleshooting section: container logs, DB shell, common issues

- [ ] **Step 6: Verify build works with standalone output**

```bash
npm run build
ls .next/standalone/
ls .next/static/
```
Expected: standalone directory exists with server.js.

- [ ] **Step 7: Commit Phase 8 artifacts**

```bash
git add docker-compose.yml Makefile next.config.ts package.json package-lock.json docs/DEPLOYMENT.md
git commit -m "chore: add prod docker-compose, Makefile, deployment docs"
```

---

### Task 8.2: Stop and hand off to user

- [ ] **Step 1: Print the handoff message**

```
=======================================================================
 PHASES 0-7 COMPLETE — READY FOR MANUAL DEPLOY
=======================================================================

 Branch:   pivot/personal-tracker
 Commits:  <list the phase commits>
 Tests:    all green
 Smoke:    passing at desktop + mobile viewports

 To deploy to the Pi, follow docs/DEPLOYMENT.md:
   1. SSH to the Pi and create /opt/tcg-ledger/
   2. Copy docker-compose.yml and .env to the Pi
   3. docker compose up -d postgres
   4. make deploy
   5. make migrate
   6. docker compose up -d app
   7. make create-admin
   8. Configure NPM proxy for tcg.goonlabs
   9. Add Pi-hole DNS entry
   10. Add backup cron
   11. Smoke test tcg.goonlabs in browser + on your phone via Tailscale

 When deploy succeeds, merge to main:
   git checkout main
   git merge --no-ff pivot/personal-tracker
   git tag v0.1.0-pivot
=======================================================================
```

- [ ] **Step 2: STOP. Do not run make deploy in the autonomous run.**

### Phase 8 Gate (manual, after user runs make deploy)

- [ ] `tcg.goonlabs` loads over HTTPS from Fedora browser
- [ ] Login works with the admin user created via `make create-admin`
- [ ] Trade binder page loads (empty is fine)
- [ ] Collection page loads and shows zero cards (fresh prod DB)
- [ ] Same from iPhone on Tailnet
- [ ] Nightly backup cron ran once successfully (test with a manual invocation)
- [ ] `pivot/personal-tracker` merged to `main`, tagged `v0.1.0-pivot`

---

## Plan Self-Review

After writing the full plan above, walked the checklist:

**Spec coverage:**
- §1 Scope & Goals → Phase 1 (shelving), 3 (backend), 4 (UI) — covered
- §2 Data Model → Phase 2 — covered
- §3 Auth & User Model → Phase 3 (guards, auth.ts, middleware) — covered
- §4 Shelving Strategy → Phase 1 — covered exhaustively
- §5 Trade Binder → Phase 3 (service), Phase 4 (UI), Phase 6 (tests) — covered
- §6 Frontend / UX → Phase 3 (research dispatch), Phase 5 (design) — covered
- §7 Hosting & Deploy → Phase 8 — covered
- §8 Execution Plan → Phases 0-8 — 1:1 mapping
- §9 Testing & Regression → Phase 6 + embedded gate checks in every phase — covered
- §10 Out of Scope → enforced via Phase 7 reviewer checklist

**Placeholder scan:**
- One TBD in Task 0.3 Step 5 ("Create .env.local template") — user setup, not agent work; OK as prose instruction
- No TODO/"implement later"/"fill in details" left

**Type consistency:**
- `HoldingDTO` shape matches between types.ts definition, repository select, mapper output, and test fixtures
- `TradeBinderItemDTO` matches between service interface and mapper
- `requireOwnership(holdingId, userId)` signature consistent across guard definition, usage in toggleListing action, and reviewer check

**Known gaps:**
- Phase 8 manual tasks assume the user will run `make deploy` — no agent runs it
- The frontend-design skill's actual output is opaque from here; we trust it to respect the brief

If issues found during execution, update the plan inline and continue.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-personal-tracker-pivot.md`.
