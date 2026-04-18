# Design: Personal TCG Collection Tracker + Trade Binder Pivot

**Date:** 2026-04-15
**Status:** Approved, pending implementation
**Author:** Abhik + Claude (brainstorming session)
**Supersedes:** The existing `TCG Ledger` storefront + POS architecture
**Execution model:** Autonomous agent run across Phases 0–7; Phase 8 (Pi deploy) stays manual.

---

## 1. Scope & Goals

### What we're building

A self-hosted, multi-user personal TCG collection tracker with a passive trade binder, intended for Abhik + friends on his Tailnet. Conceptually closer to Deckbox / ManaBox than to a retail storefront. The existing TCG Ledger codebase is being pivoted, not thrown away: the admin shell, auth scaffolding, Scryfall/Pokemon import, ledger infrastructure, and test harness are all retained and retargeted. The storefront, checkout, POS, order management, and Stripe integration are shelved (not deleted) so they can be revived later.

### What we're keeping from TCG Ledger

- The entire admin UI shell (layout, sidebar, auth gate, table components, shadcn primitives)
- Inventory management UI, retargeted to "My Collection"
- Scryfall / Pokemon TCG import flow at `/admin/add-cards`
- Ledger pages, retargeted to per-user quantity history and per-card price history
- Dashboard analytics, retargeted to per-user + Tailnet-wide stats
- Team management, retargeted to "invite friends, grant permissions"
- Settings, retargeted to per-user + global preferences
- The append-only logging infrastructure (`quantityLog`, `priceLog`)
- The strict Action → Service → Repository → Mapper layering
- NextAuth v5 JWT auth (credentials provider only; email reset deferred)
- Vitest + jsdom + React Testing Library test harness, fixture builders, and vi.mock patterns

### What we're shelving to `src/_shelved/`

- `/shop/**` storefront routes (browse, cart, checkout, profile, customer login/register/forgot/reset)
- Checkout, cart, profile pages
- Stripe service, webhook route, all Stripe-related code
- POS admin module
- Order management (`/admin/orders`, `order.service`, `order.repository`, `OrderItem` references)
- Customer model and all Customer-related code
- Order-specific email templates (confirmation, fulfillment, refund, dispute, welcome)
- All shop/order/stripe/pos test files
- `vercel.json` (deleted outright — no replacement cron needed)

### What we're adding new

- `Card` table (printing-level catalog, one row per unique printing)
- `Holding` table (per-user ownership: who has what, quantity, condition, trade flag)
- `/admin/trade-binder` page (phase 1 passive listing)
- Tailnet-wide dashboard widgets
- Dockerized Postgres 16 + `docker-compose.yml` at `/opt/tcg-ledger/`
- `Makefile` with build/deploy/migrate/logs/backup targets
- Four CLI bootstrap scripts (`create-admin`, `create-user`, `import-cards`, `reset-password`)
- `output: "standalone"` in `next.config.ts`
- Custom `.claude/agents/ux-researcher.md` agent for Phase 3 UX work
- Playwright smoke test script at `scripts/playwright-smoke.mjs`

### Explicit non-goals for this refactor

- No structured trade proposals (phase 2, deferred)
- No wishlist matching (phase 2, deferred)
- No payment processing, checkout, or Stripe in live code
- No public-facing storefront
- No migration of existing Neon data (fresh start)
- No mobile app or PWA
- No price auto-refresh from Scryfall
- No email-based password reset (CLI reset only)
- No OAuth / Tailnet header auth
- No structured trades, chat, notifications, or follow-another-user social features

See Section 10 for the full exclusion list.

### Success criteria

1. Abhik and at least one friend can log in, import a collection from CSV, and see each other's listed cards via the trade binder.
2. All retained admin modules compile, typecheck, lint, and pass their updated tests.
3. `make deploy` from Fedora results in a working app reachable at `tcg.goonlabs` via NPM on the Pi.
4. `legacyInventory` + shelved code exists in `src/_shelved/` and does NOT participate in build/tests/lint.
5. Zero references to Stripe, Vercel, or Neon in active (non-shelved) code.

---

## 2. Data Model

### New tables

```prisma
model Card {
  id              String   @id @default(cuid())
  // Printing identity
  name            String   @db.VarChar(255)
  set             String   @db.VarChar(255)
  setName         String   @db.VarChar(255)
  collectorNumber String   @db.VarChar(64)
  finish          String   @db.VarChar(32)          // "nonfoil", "foil", "etched"
  game            String   @db.VarChar(32)          // "magic", "pokemon"
  // Catalog metadata (single source of truth)
  rarity          String   @db.VarChar(32)
  imageSmall      String?  @db.VarChar(512)
  imageNormal     String?  @db.VarChar(512)
  scryfallId      String?  @unique
  tcgplayerId     String?
  marketPrice     Int?                              // cents; updated out-of-band
  marketPriceAt   DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  holdings        Holding[]

  @@unique([name, set, collectorNumber, finish], name: "printing_key")
  @@index([name])
  @@index([set])
  @@index([game])
  // GIN trigram indexes on name/set remain out-of-band (scripts/create-gin-indexes.sql)
}

model Holding {
  id             String   @id @default(cuid())
  userId         String
  cardId         String
  quantity       Int      @default(1)
  condition      String   @default("NM") @db.VarChar(8)
  notes          String?  @db.VarChar(512)
  listedForTrade Boolean  @default(false)
  tradeNotes     String?  @db.VarChar(512)
  idealQuantity  Int      @default(0)
  maxQuantity    Int      @default(0)
  acquiredPrice  Int?
  acquiredAt     DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  card           Card     @relation(fields: [cardId], references: [id], onDelete: Restrict)

  @@unique([userId, cardId, condition], name: "user_printing_condition")
  @@index([userId])
  @@index([cardId])
  @@index([listedForTrade])
  @@index([userId, listedForTrade])
}
```

### Key decisions and rationale

- **Unique key is `(name, set, collectorNumber, finish)` not `scryfallId`** — scryfallId is null for Pokemon cards. The four-tuple is stable across both games.
- **Holding uniqueness includes `condition`** — one user can own an NM copy and an LP copy of the same printing as separate rows.
- **`marketPrice` lives on Card, `acquiredPrice` lives on Holding** — market price is shared (update once, everyone sees it); purchase price is personal.
- **`listedForTrade` is a bool, not a separate table** — phase 1 passive listing per Question 5. Phase 2 adds `TradeOffer` additively.
- **`Card → Holding` is `onDelete: Restrict`** — can't delete a Card if anyone owns it.
- **Finish as string column, not enum** — can be normalized later if needed.

### Modified existing tables

**User** gains `displayName: String?` and `role` defaults to `"USER"` (not `"ADMIN"`). Adds `holdings`, `quantityLogs`, `priceLogs` relations.

**UserPermissions** shrinks from 7 flags to 2:
- `inventoryUpdatePrices` — can override market prices on Cards
- `addCardsAccess` — can use Scryfall/Pokemon import

The shop-specific flags (`inventoryUpdateQty`, `buylistUpdatePrices`, `buylistUpdateTargets`, `ordersFulfill`, `posAccess`) are removed.

**quantityLog** gains `userId`, `holdingId` (nullable FK), `cardSet`, `reason`, `actorId`. `amount` renames to `delta`. Index becomes `(userId, time DESC)`. Since the target DB is freshly created, column rename is implemented as drop+add (no data preservation needed).

**priceLog** gains `cardId` FK and `source` field. Drops `finish` column (now derived from `Card.finish` via the FK). Index becomes `(cardId, time DESC)`. Since the target database is a freshly-created Postgres container with no existing rows (see Section 1: "No migration of existing Neon data"), the schema change applies to empty tables and there is nothing to migrate.

### Renamed / shelved

- `model inventory` → `model legacyInventory` (referenced only by shelved code)
- `model Order`, `model OrderItem`, `model Customer`, `model StoreSettings` remain in the schema under a clearly-marked `// SHELVED` block; tables stay in Postgres untouched.

### Migration strategy

A single Prisma migration:
1. `ALTER TABLE inventory RENAME TO legacy_inventory`
2. `CREATE TABLE "Card"`
3. `CREATE TABLE "Holding"`
4. Alter `USER`: add `displayName`, change `role` default
5. Alter `user_permissions`: drop 5 columns
6. Alter `quantityLog`: add columns, rename `amount` → `delta`
7. Alter `priceLog`: add `cardId` FK, add `source`
8. Leave shelved tables untouched

No data migration — starting from an empty Postgres container.

---

## 3. Auth & User Model

**Provider:** NextAuth v5 JWT, single credentials provider (email + password). No email provider, no OAuth, no Tailnet header auth.

**Roles:**
- `ADMIN` — full access, manages other users, edits any Card catalog metadata
- `USER` — full access to own Holdings, read-only access to other users' *listed* Holdings via the trade binder

**Permissions:** `UserPermissions` stays but shrinks to 2 flags (see Section 2). Ownership over own data is implicit from being a `USER`.

**Session shape:**
```ts
session.user = {
  id: string
  email: string
  displayName: string | null
  role: "ADMIN" | "USER"
  permissions: { inventoryUpdatePrices: boolean; addCardsAccess: boolean } | null
}
```

**Guards in `src/lib/auth-guard.ts`:**
- `requireAdmin()` — ADMIN only
- `requireUser()` — any authenticated user (replaces `requireStaff`)
- `requireOwnership(holdingId, userId)` — checks `holding.userId === userId || role === "ADMIN"`; used on every Holding mutation
- `requireCustomer()` — shelved to `src/_shelved/lib/auth-guard.legacy.ts`

**Middleware:** `src/middleware.ts` simplifies to single check — no token → redirect to `/admin/login`. No CUSTOMER branch, no shop redirect logic.

**Password reset — deliberate gap.** CLI-only (`scripts/reset-password.ts`). No email-based reset flow in this refactor. Retained Nodemailer infrastructure makes it cheap to add later.

**CLI bootstrap scripts:**
- `scripts/create-admin.ts` — rewritten for new schema; bootstraps the first admin
- `scripts/create-user.ts` — new; invites a friend with email + password + displayName
- `scripts/reset-password.ts` — new; CLI backstop for forgotten passwords
- `scripts/import-cards.ts` — new; bulk CSV import (`--user <email> --file mycards.csv`), upserts Card via Scryfall lookup then upserts Holding, wrapped in a Prisma transaction

All four share `scripts/_lib.ts` for Prisma client + readline prompts.

---

## 4. Shelving Strategy

**Target:** `src/_shelved/`. Underscore prefix sorts to top of listings and signals "not part of live app."

**Structure mirrors the original paths** so revival is a straight file move:

```
src/_shelved/
├── README.md                    # Revive checklist
├── app/
│   ├── shop/                    # ← src/app/shop/**
│   ├── admin/orders/            # ← src/app/admin/(dashboard)/orders/
│   ├── admin/pos/               # ← src/app/admin/(dashboard)/pos/
│   ├── api/webhooks/stripe/
│   ├── api/admin/cleanup/
│   ├── api/cron/cleanup-orders/
│   ├── api/auth/forgot-password/
│   ├── api/auth/reset-password/
│   └── actions/                 # checkout, order, pos, stripe, profile
├── services/                    # order, pos, stripe, email.templates.order
├── repositories/                # order
├── mappers/                     # order
├── components/
│   ├── shop/
│   ├── admin/orders/
│   ├── admin/pos/
│   └── emails/order/
├── context/CartContext.tsx
├── lib/auth-guard.legacy.ts
└── tests/                       # parallel tree
```

**Build/test/lint exclusion:**
- `tsconfig.json` — add `src/_shelved/**` to `exclude`
- `vitest.config.ts` — add to `test.exclude`
- `eslint.config.mjs` — add to `ignores`

Next.js automatically ignores `_`-prefixed directories in the app router, so shelved routes disappear from the router without further config.

**Prisma schema SHELVED block:** `Order`, `OrderItem`, `Customer`, `StoreSettings` stay in `schema.prisma` under a clearly-marked `// SHELVED` comment block. Tables in Postgres remain untouched so shelved code compiles if re-enabled.

**Env vars split:**
- `src/lib/env.ts` — active vars only: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL`, `NODEMAILER_*`, `ADMIN_EMAIL`
- `src/_shelved/lib/env.legacy.ts` — `STRIPE_*`, `CRON_SECRET`

**`vercel.json`:** deleted outright.

**`next.config.ts`:** CSP entries for Stripe (`js.stripe.com`, Stripe image domains) removed. Scryfall + Pokemon TCG image domains retained. Add `output: "standalone"`.

**`src/_shelved/README.md`** explains the directory, points to `tsconfig`/`vitest`/`eslint` exclude entries, gives a 5-step revive checklist, and records the shelved-from commit SHA.

---

## 5. Trade Binder (Phase 1: Passive Listing)

**Concept:** Users toggle `Holding.listedForTrade = true` with optional `tradeNotes`. A new page shows everyone's listed Holdings across the Tailnet. No proposals, no state machine, no atomic swaps. Contact is out-of-band.

**New route:** `/admin/trade-binder` under the existing admin shell. New sidebar entry between "Ledger" and "Team".

### Page layout

**Top bar (sticky):**
- Debounced search box (Card.name ILIKE, backed by GIN trigram index)
- Game filter (`all | magic | pokemon`)
- Condition filter (`all | NM | LP | MP | HP | DMG`)
- "Show mine" toggle (default off)
- "My listings" jump link
- Sort: `Recently listed | Name A-Z | Set | Owner`

**Results grid:**
- One tile per Holding row (not per Card — multiple owners = multiple tiles)
- Tile shows: card image, name, set code, condition badge, quantity (if > 1), finish badge, owner displayName, "listed N days ago", tradeNotes snippet
- Click tile → card detail modal (moved from shop's QuickViewDialog to `src/components/CardDetailDialog.tsx`)
- Modal shows full details, owner info, "Contact owner" (copy email / mailto)

**Left rail (collapsible):**
- Owner list with counts
- Set list with counts
- Filters over the current result set

### Data flow

```ts
// src/app/actions/trade-binder.ts
// Follows the existing codebase convention: discriminated-union result shape.
export async function getTradeBinder(
  params: TradeBinderFilterInput,
): Promise<{ success: true; data: TradeBinderItemDTO[] } | { success: false; error: string }> {
  try {
    const session = await requireUser()
    const validated = TradeBinderFilterSchema.parse(params)
    const data = await holdingService.listTradeBinder({
      ...validated,
      excludeUserId: validated.showMine ? undefined : session.user.id,
    })
    return { success: true, data }
  } catch (err) {
    return { success: false, error: sanitizeError(err) }
  }
}
```

Service delegates to `holdingRepository.findListed()`, which filters `listedForTrade: true AND quantity > 0`, scopes by game/condition/search/excludeUserId, selects via `TRADE_BINDER_SELECT` constant, and orders by `updatedAt DESC` or `card.name ASC`. Indexes `@@index([listedForTrade])` and `@@index([userId, listedForTrade])` cover hot paths.

### Toggle listing

On `/admin/collection`, each TanStack row gets a "Trade" column with checkbox + pencil icon. Bulk actions: "List selected for trade" / "Unlist selected."

```ts
// src/app/actions/holding.ts
export async function toggleListing(holdingId: string, listed: boolean, notes?: string) {
  const session = await requireUser()
  await requireOwnership(holdingId, session.user.id)
  const result = await holdingService.updateListing(holdingId, listed, notes)
  revalidatePath("/admin/collection")
  revalidatePath("/admin/trade-binder")
  return { success: true, data: result }
}
```

**Staleness:** `quantity > 0` filter in `findListed` auto-hides sold-out listings. No cron needed.

**Notifications:** explicitly NOT in phase 1. No emails, no badges, no wishlist matching.

### Tests (new for trade binder)

| Test | File | Type |
|---|---|---|
| `listTradeBinder` filters/excludes correctly | `services/holding.service.test.ts` | Unit |
| `findListed` query shape | `repositories/holding.repository.test.ts` | Unit |
| `toggleListing` calls requireOwnership + revalidates | `actions/holding.test.ts` | Action |
| `toTradeBinderItemDTOs` fallbacks | `mappers/trade-binder.mapper.test.ts` | Unit |
| Page renders + filters update query | `components/TradeBinderPage.test.tsx` | Component |
| Unauthenticated redirect | `middleware/middleware.test.ts` | Middleware |
| `listTradeBinder` auth check | `actions/trade-binder.test.ts` | Action |

---

## 6. Frontend / UX Refresh

### 6.1 Dedicated UX researcher agent

Created at `.claude/agents/ux-researcher.md` in Phase 0.

**Profile:** Senior UX researcher specializing in collector/hobbyist applications. Explicit methodology: heuristic evaluation → user journey mapping → competitive analysis → IA audit → accessibility sweep → prioritized recommendations.

**Required knowledge:** Nielsen heuristics, Fitts's Law, WCAG 2.2 AA, touch-target sizing, mobile responsive patterns, dark-mode considerations, TCG collector domain (Deckbox / Moxfield / ManaBox / Dragon Shield / Cardsphere pain points and patterns).

**Output format:** Structured markdown with severity ratings, file-path citations, and a clear split between "evidence-based finding" and "domain-informed recommendation."

**Tools granted:** `Read, Grep, Glob, WebFetch, WebSearch` only. Read-only agent.

### 6.2 Mobile web view in scope

**In scope:** All retained pages must work in mobile browsers (iOS Safari + Android Chrome, 375–428px portrait, 667–926px landscape, standard tablet breakpoints).

**Out of scope:** Native apps, PWA, offline mode, service workers, push notifications.

**Per-page responsive plan:**

| Page | Desktop | Mobile |
|---|---|---|
| Login | Centered auth card | Full-width, large touch targets |
| Dashboard | Multi-column widget grid | Single column, most important widget first, charts horizontally scrollable |
| Trade binder | 3–4 col grid + left rail + top bar | Single col grid, rail → filter drawer, sticky search |
| Collection view | Dense TanStack table | Card-per-row below `md`; sort/filter → bottom-sheet modal |
| Card detail modal | Centered dialog 60% viewport | Full-screen sheet sliding from bottom |
| Sidebar nav | Fixed left rail | Hamburger drawer (Radix Dialog) overlay |
| Add cards | Search + grid + add panel | Full-width search, results as list |
| Ledger | Dense table | Card-per-row with day-grouped headers |

**Touch targets:** 44×44 px minimum for all tappable elements. Typography: default Tailwind scale, body text `text-base` on mobile (never below `text-sm`).

### 6.3 Research deliverables (Phase 3, parallel)

**UX researcher** produces three reports under `docs/superpowers/research/`:

1. `ux-heuristic-audit.md` — Nielsen heuristic eval of every retained page, severity-rated findings with file-path citations, mobile-specific issues called out separately.
2. `competitive-analysis.md` — 5 competitors (Deckbox, Moxfield, ManaBox, Dragon Shield, Cardsphere), strengths/weaknesses, patterns to adopt/avoid.
3. `user-journeys.md` — 3 journey maps (pack crack add, trade binder browse, bulk price update), each with a mobile variant, annotated with friction points.

**Code-explorer agent** produces `frontend-audit.md` — inventory of shadcn/Radix primitives, per-page component map, Tailwind theming audit, retained/replaced/shelved component list, genericness audit.

These four reports form the design brief for Phase 5.

### 6.4 Priority pages for visual design pass

Pages getting full visual refresh:
1. Login
2. Dashboard
3. Trade binder
4. Collection view (preserves power-user density)
5. Card detail modal

Pages getting minimal-touch (functional, not redesigned):
- Ledger
- Team management
- Settings
- Add cards (empty-state polish only)

### 6.5 Design system pins

- shadcn/Radix + Tailwind 4 (no component library swap)
- `next-themes` for light/dark, both modes work
- Typography and color palette are deliverables of the design pass
- React Compiler stays enabled
- No new animation library unless proven necessary
- No mobile/PWA, no i18n, no custom illustrations, no design system doc

---

## 7. Hosting & Deploy

**Target host:** Raspberry Pi 5 at `192.168.1.20` (Tailnet `100.65.248.44`).
**Install root:** `/opt/tcg-ledger/`.
**Build location:** Fedora workstation (avoids slow arm64 `next build`).
**Runtime artifact:** Next.js standalone output (`output: "standalone"` in `next.config.ts`).

### 7.1 Pi directory layout

```
/opt/tcg-ledger/
├── docker-compose.yml
├── .env                    # 0600, owned by melkor
├── app/                    # rsynced build artifacts
│   ├── server.js
│   ├── .next/
│   ├── public/
│   ├── node_modules/
│   └── prisma/
├── postgres-data/          # Postgres 16 volume
└── logs/
```

### 7.2 docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16
    container_name: tcg-ledger-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: tcg
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: tcg_ledger
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    networks: [tcg-net]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tcg -d tcg_ledger"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: node:22-bookworm-slim
    container_name: tcg-ledger-app
    restart: unless-stopped
    working_dir: /app
    command: ["node", "server.js"]
    environment:
      DATABASE_URL: postgres://tcg:${POSTGRES_PASSWORD}@postgres:5432/tcg_ledger
      AUTH_SECRET: ${AUTH_SECRET}
      NEXTAUTH_URL: https://tcg.goonlabs
      NEXT_PUBLIC_BASE_URL: https://tcg.goonlabs
      NODEMAILER_HOST: ${NODEMAILER_HOST}
      NODEMAILER_PORT: ${NODEMAILER_PORT}
      NODEMAILER_USER: ${NODEMAILER_USER}
      NODEMAILER_PASS: ${NODEMAILER_PASS}
      NODEMAILER_FROM: ${NODEMAILER_FROM}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      NODE_ENV: production
      PORT: 3000
      HOSTNAME: 0.0.0.0
    ports:
      - "127.0.0.1:${APP_PORT:-3001}:3000"
    volumes:
      - ./app:/app:ro
    depends_on:
      postgres:
        condition: service_healthy
    networks: [tcg-net]

networks:
  tcg-net:
    driver: bridge
```

**Key decisions:**
- Stock `node:22-bookworm-slim` + read-only bind mount, no custom Dockerfile
- Port `127.0.0.1:3001:3000` — localhost only, never exposed to LAN
- Secrets in `.env` file on the Pi (0600, owned by `melkor`)
- Postgres healthcheck gates app startup

### 7.3 Reverse proxy (manual, one-time)

1. NPM proxy host: `tcg.goonlabs` → `http://127.0.0.1:${APP_PORT}` (default `APP_PORT=3001`, set in `.env`)
2. WebSockets Support enabled
3. SSL via NPM's built-in Let's Encrypt
4. Pi-hole `pihole.toml` hosts array: `tcg.goonlabs 100.65.248.44` (Tailnet IP so 5G works)

### 7.4 Makefile (targets summary)

| Target | Action |
|---|---|
| `make dev` | Local Next.js dev server |
| `make test` | `npx vitest run` |
| `make typecheck` | `npm run typecheck` |
| `make build` | `npm run build` on Fedora |
| `make deploy` | Build + rsync .next/standalone, .next/static, public, prisma to Pi; restart app container |
| `make migrate` | `prisma migrate deploy` inside app container |
| `make db-shell` | `psql` inside postgres container |
| `make db-backup` | `pg_dump | gzip` → `/mnt/seagate/tcg-ledger-backups/tcg-<ts>.sql.gz` |
| `make db-restore FILE=...` | `gunzip | psql` |
| `make logs` / `make logs-db` | `docker compose logs -f` |
| `make restart` / `make down` / `make up` / `make status` | compose lifecycle |
| `make create-admin` / `make create-user` / `make reset-password` | CLI bootstrap |

### 7.5 Backup strategy

**Pi crontab (two entries):**
```
# Nightly backup at 04:00
0 4 * * * cd /opt/tcg-ledger && docker compose exec -T postgres pg_dump -U tcg tcg_ledger | gzip > /mnt/seagate/tcg-ledger-backups/tcg-$(date +\%Y\%m\%d).sql.gz
# Weekly cleanup of backups older than 30 days, Sundays at 05:00
0 5 * * 0 find /mnt/seagate/tcg-ledger-backups -name 'tcg-*.sql.gz' -mtime +30 -delete
```

Durability: Seagate is USB HDD, Pi OS is SD card — different media, won't fail together.

### 7.6 Bootstrap flow (documented in `docs/DEPLOYMENT.md`)

1. `mkdir -p /opt/tcg-ledger /mnt/seagate/tcg-ledger-backups`
2. Copy `docker-compose.yml` to Pi
3. Create `.env` with required secrets
4. `docker compose up -d postgres`
5. `make deploy` from Fedora
6. `make migrate`
7. `docker compose up -d app`
8. `make create-admin`
9. Configure NPM proxy host + SSL
10. Configure Pi-hole DNS
11. Add backup cron to Pi crontab

### 7.7 Secrets management

`.env` on the Pi, 0600, owned by `melkor`. Never committed. No Vault / Doppler / SOPS — overkill for personal Tailnet scope.

---

## 8. Refactor Execution Plan

**Execution mode:** Fully autonomous Phases 0–7. Phase 8 (Pi deploy) stops with a "ready to deploy, run `make deploy`" message and is performed manually.

**Core principles:**
1. One phase at a time; no overlap across layer boundaries.
2. Every phase ends with an automated verification gate.
3. Agents get tight scopes with explicit file lists.
4. Main Claude owns the merge seam — agents never commit directly.
5. One checkpoint commit per phase; failed phases roll back cleanly.

### 8.0 Phase 0 — Pre-flight (main Claude, sequential)

1. Create `.claude/agents/ux-researcher.md`
2. Write this design doc, commit it
3. Create feature branch: `pivot/personal-tracker`
4. Snapshot baseline test count and typecheck state
5. `npm install` fresh, confirm lockfile healthy
6. Add Playwright: `npm install --save-dev playwright` **and** `npx playwright install chromium` (the browser binary is separate from the library — the gate will fail at runtime without this step)
7. Write `scripts/playwright-smoke.mjs`
8. Create `src/_shelved/` with placeholder README
9. Create `docker-compose.dev.yml` at repo root with a single `postgres:16` service bound to `127.0.0.1:5433` (non-standard port so it doesn't clash with any existing local Postgres), volume at `./.dev-postgres-data` (gitignored), DB name `tcg_ledger_dev`, user/password from `.env.local`
10. Write `scripts/dev-bootstrap.sh` that: starts the dev Postgres container, waits for healthcheck, runs `npx prisma migrate deploy` (will be a no-op on first run since no migration exists yet — that's fine, subsequent phases will have one), and prints connection info
11. Update `.gitignore` to exclude `.dev-postgres-data/`, `docs/superpowers/screenshots/`

**Gate:** Design doc committed, agent file exists, branch checked out, baseline recorded, Playwright library + Chromium binary both installed, `docker-compose.dev.yml` and `scripts/dev-bootstrap.sh` exist.

**Wall-clock:** 30–45 min (was 15 — underestimate; Playwright install + dev Postgres setup adds real time).

### 8.1 Phase 1 — Shelving (main Claude, sequential)

Pure file moves + config edits, no agent dispatches (agent autonomy would waste tokens re-deciding what's obvious from Section 4).

**Critical scope note:** Phase 1 does **NOT** touch `prisma/schema.prisma`. The schema rename (`inventory` → `legacyInventory`) and the introduction of `Card`/`Holding` both happen atomically in Phase 2. If Phase 1 renamed the model, the retained `inventory.service.ts`/`inventory.repository.ts`/etc. (which still import `inventory` from `@prisma/client`) would fail typecheck. Keeping the schema untouched in Phase 1 means Phase 1's gate can pass cleanly against the existing model.

1. Move files to `src/_shelved/` per Section 4 layout
2. Update `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`
3. Delete `vercel.json`
4. Split `src/lib/env.ts` (shelved vars move to `_shelved/lib/env.legacy.ts`)
5. Write `src/_shelved/README.md`
6. Run typecheck

**Gate:**
- `npm run typecheck` passes (schema is unchanged; retained code still compiles)
- `npx vitest run` passes (retained tests only; shelved tests excluded)
- `git diff --stat` is purely file moves + config edits
- Commit: `refactor: shelve shop/stripe/pos to src/_shelved/`

### 8.2 Phase 2 — Schema + types (architect agent, sequential)

**Agent:** `feature-dev:code-architect`

**Scope:**
- Rename `model inventory` → `model legacyInventory` in `schema.prisma` and add the SHELVED block for `Order`/`OrderItem`/`Customer`/`StoreSettings` (the full schema work Phase 1 deferred)
- Write new Prisma schema per Section 2 (Card, Holding, updated User/UserPermissions/quantityLog/priceLog)
- `npx prisma migrate dev --create-only --name pivot-card-holding` against the dev Postgres from Phase 0 to produce migration SQL (no apply)
- Rewrite `src/lib/types.ts` and `src/lib/dtos.ts`
- Does NOT touch services/repos/mappers/UI
- Does NOT apply migration
- Produces `docs/superpowers/reports/PHASE-2-REPORT.md`

**Gate:**
- `npx prisma validate` passes
- `npx prisma generate` succeeds (new Prisma client types generated)
- Migration file exists under `prisma/migrations/`
- `npm run typecheck` is **expected to fail** at this gate — the retained `inventory.service.ts`/`inventory.repository.ts`/`inventory.mapper.ts`/`buylist.service.ts`/`catalog.service.ts`/`dashboard.service.ts` and the admin UI pages all still reference the old `inventory` model and the old DTO shapes. Main Claude catalogs the failures (file-by-file list in PHASE-2-REPORT.md) as the Phase 3 work list. The autonomous runner does **not** halt on this failure; it is a documented, expected state.
- Main Claude reviews PHASE-2-REPORT.md against Section 2
- Commit: `refactor(schema): introduce Card + Holding, update User/ledger`

### 8.3 Phase 3 — Data layer rewrite + research (parallel: 3 agents)

**Preamble (main Claude, before agent dispatch):**
- Run `bash scripts/dev-bootstrap.sh` to start dev Postgres
- Run `npx prisma migrate deploy` to apply the Phase 2 migration to dev DB
- Confirm schema is live via `npx prisma db execute --stdin <<< '\dt'` or equivalent

**Backend agent (`feature-dev:code-architect`):**
- Rename and rewrite repositories (`inventory.repository.ts` → `holding.repository.ts`)
- Rename and rewrite services (`inventory.service.ts` → `holding.service.ts`; `buylist.service.ts` → `personal-targets.service.ts`; rewrite `catalog.service.ts` and `dashboard.service.ts` in place)
- Rename and rewrite mappers (`inventory.mapper.ts` → `holding.mapper.ts`; update `dashboard.mapper.ts`, `ledger.mapper.ts`)
- Rewrite `src/lib/auth-guard.ts` (add `requireUser`, `requireOwnership`; shelve `requireCustomer`)
- Rewrite `src/lib/auth.ts` (drop CUSTOMER branch, new session shape)
- Rewrite `src/middleware.ts` (simplify to single check)
- Does NOT touch UI files under `src/app/admin/**` — that's Phase 4
- Produces `docs/superpowers/reports/PHASE-3-BACKEND-REPORT.md`

**Code-explorer agent (`feature-dev:code-explorer`, read-only, parallel, background):**
- Current-state frontend audit
- Output: `docs/superpowers/research/frontend-audit.md`

**UX researcher agent (custom, read-only, parallel, background):**
- Three reports: heuristic audit, competitive analysis, user journeys (each with mobile variants)
- Output: three files under `docs/superpowers/research/`

**Gate:**
- `npm run typecheck` passes for **non-UI code**. Specifically: `src/lib/**`, `src/services/**`, `src/repositories/**`, `src/mappers/**`, `scripts/**`, and `src/middleware.ts` all typecheck clean. **Expected failures remain only under `src/app/admin/**`** (UI layer still imports from old paths); those are Phase 4 work. Main Claude verifies the failure set is exactly UI-layer.
- Dev DB schema matches latest Prisma client (migration successfully applied)
- All three research reports exist with concrete, severity-rated findings (not hand-wavy)
- Commit: `refactor(backend): rewrite data layer on Card+Holding`

### 8.4 Phase 4 — UI retargeting (backend-UI agent, sequential)

**Agent:** `feature-dev:code-architect` (fresh dispatch, UI-focused scope)

**Scope:**
- Retarget `/admin/inventory` → `/admin/collection`
- Retarget `/admin/buylist` → `/admin/targets` (route rename, semantics shift from store-buying-targets to personal-collection-targets; sidebar label becomes "Targets")
- Retarget `/admin/add-cards` for new catalog flow
- Retarget `/admin/dashboard` for new stats
- Retarget `/admin/ledger` for new DTOs
- Simplify `/admin/team` to ADMIN/USER + 2 flags
- Retarget `/admin/settings`
- Update `/admin/login`
- Build new `/admin/trade-binder` page per Section 5
- Update sidebar nav
- Does NOT change visual design or responsive layout (Phase 5 owns that)
- Produces `PHASE-4-REPORT.md`

**Preamble (main Claude, before agent dispatch):**
- Confirm dev Postgres is running (`docker compose -f docker-compose.dev.yml ps`)
- Run `scripts/create-admin.ts` against dev DB with a known test email/password (e.g. `dev@local` / `devpassword`) — the Playwright smoke script uses these credentials to log in
- Use `scripts/import-cards.ts` to seed a small fixture set (~20 cards across Magic + Pokemon) into the dev admin's collection, so trade binder / collection / dashboard pages have something to render

**Gate:**
- `npm run typecheck` passes for the **full codebase** (UI now retargeted, no remaining failures)
- `npm run lint` passes
- Dev server starts (`npm run dev` in background)
- Playwright desktop smoke passes at 1440×900 viewport: scripted walk of every retained page, logging in with the seeded dev admin credentials
- Commit: `refactor(ui): retarget admin pages to Card+Holding`

### 8.5 Phase 5 — Visual refresh + mobile (frontend-design skill, sequential)

**Skill:** `frontend-design`, briefed with UX researcher reports, frontend audit, Phase 4 retargeted pages as canvas, Section 6 priority list, mobile breakpoint requirements.

**Scope:**
- Visual refresh of 5 priority pages (login, dashboard, trade binder, collection view, card detail modal)
- Responsive layouts for every retained page
- Sidebar → mobile drawer
- Card detail modal → mobile full-screen sheet
- Touch target audit + fixes
- Typography + color palette decisions
- Produces `PHASE-5-REPORT.md`

**Gate:**
- `npm run typecheck` passes
- `npm run lint` passes
- Playwright smoke passes at **both** desktop (1440×900) and mobile (390×844) viewports
- Screenshots captured to `docs/superpowers/screenshots/phase-5/`
- Commit: `feat(ui): visual refresh + mobile responsive`

### 8.6 Phase 6 — Tests (test agent, sequential)

**Agent:** `feature-dev:code-reviewer` (best match for test-writing tool access) or `general-purpose` fallback.

**Scope:**
- Update fixture builders for new User/Holding/Card shapes
- Update every retained test file that referenced old inventory types
- Write new coverage for `requireOwnership`, `listTradeBinder`, `findListed`, `toggleListing`, `toTradeBinderItemDTOs`
- Smoke tests for 5 priority pages
- Responsive test utility (matchMedia mock helper)
- Catalog test count delta vs Phase 0 baseline
- Produces `PHASE-6-REPORT.md`

**Gate:**
- `npx vitest run` full suite green
- Test count within baseline ±10% after accounting for shelved tests + new trade binder tests
- Commit: `test: update fixtures, add trade binder coverage`

### 8.7 Phase 7 — Independent review (code-reviewer agent, sequential)

**Agent:** `feature-dev:code-reviewer`. Deliberately gets no context from prior phases; reads design doc + full diff.

**Checks:**
- Layering rules not violated (no Prisma in actions, no auth in services, no HTTP in repos)
- No live-code references to `legacyInventory`, `Order`, `OrderItem`, `Customer`, `StoreSettings`, Stripe, Vercel
- No dead imports or unused exports
- Env var changes consistent
- ADMIN/USER role checks on every mutation endpoint
- `requireOwnership` on every Holding mutation
- Produces `PHASE-7-REVIEW-REPORT.md`

**Gate:**
- Zero `critical`, zero `high` findings
- Medium findings either fixed inline or explicitly deferred with justification
- Commit: any fixes as `fix: address phase-7 review findings`

### 8.8 Phase 8 — Deploy + bootstrap (MANUAL, user runs)

After Phase 7 passes, main Claude stops with:

> "Ready to deploy. Phases 0-7 complete, all gates green, `pivot/personal-tracker` branch ready to merge. Run `make deploy` from the tcg-ledger directory when you want to ship it. See `docs/DEPLOYMENT.md` for the one-time Pi bootstrap steps."

Manual steps (per Section 7.6): Pi directory prep, `.env`, postgres up, deploy, migrate, app up, `create-admin`, NPM proxy, Pi-hole DNS, backup cron, smoke test, merge to main, tag `v0.1.0-pivot`.

### 8.9 Agent dispatch summary

| Phase | Agents | Run style |
|---|---|---|
| 0 | 0 | main Claude |
| 1 | 0 | main Claude |
| 2 | 1 (architect) | sequential |
| 3 | 3 (backend + code-explorer + ux-researcher) | parallel |
| 4 | 1 (backend-UI) | sequential |
| 5 | `frontend-design` skill | sequential |
| 6 | 1 (test) | sequential |
| 7 | 1 (code-reviewer) | sequential |
| 8 | 0 | manual |

Total: 7 agent dispatches + 1 skill invocation.

### 8.10 Rollback strategy

Each phase is its own commit. Failure: `git reset --hard <previous-phase-commit>`, diagnose, re-dispatch. Problem in design itself: stop, update design doc, resume from updated section.

### 8.11 Wall-clock estimate

| Phase | Estimated time |
|---|---|
| 0 | 30–45 min |
| 1 | 30 min |
| 2 | 45 min |
| 3 | 60–90 min |
| 4 | 60–75 min (includes dev DB seed) |
| 5 | 90–120 min |
| 6 | 45 min |
| 7 | 30 min |
| Total | 6.5–9 hours (budget 10–11 with reruns) |

---

## 9. Testing & Regression Strategy

### 9.1 Baseline

Phase 0 snapshots the retained-code test count and typecheck state. Phase 6 verifies retained-code tests are at or above baseline. Shelved tests are excluded from the delta.

### 9.2 Gate commands

Every phase gate runs:
```
npm run typecheck
npm run lint
npx vitest run
node scripts/playwright-smoke.mjs       # Phases 4+ only
```

Non-zero exit on any command halts the phase with a failure report.

### 9.3 Test categories

| Category | Coverage |
|---|---|
| Unit (services, mappers) | mocked repos; business logic correctness |
| Unit (repositories) | mocked Prisma / schema-shape checks; query regressions |
| Action tests | mocked services + auth; guard wiring, revalidation |
| API route tests | HTTP-level with req/res; auth + signature checks |
| Component tests | React Testing Library; prop flow, interactions |
| Playwright smoke | dev server, headless; pages render + no console errors |
| Mobile viewport smoke | Playwright 390×844; no horizontal scroll on `<body>` |

### 9.4 Playwright smoke script

`scripts/playwright-smoke.mjs`, ~200 lines. Reads `PHASE_N` from env (for screenshot destination) and `VIEWPORT=desktop|mobile|both` (defaulting to `both`). Logs in with dev credentials (`dev@local` / `devpassword`) seeded in Phase 4 preamble. Per page it asserts:
1. HTTP 200
2. No console errors
3. No unhandled rejections
4. Expected heading/title text present
5. No visible `/error|exception|cannot|undefined|NaN/i` outside input placeholders
6. At least one interactive element focusable
7. At mobile viewport: `document.body` has no horizontal overflow (`scrollWidth <= clientWidth`). **Inner containers** (e.g., a chart wrapper `<div>` with `overflow-x: auto`) are permitted to scroll — the rule only forbids the page body itself from overflowing the viewport, because that's the signal of a broken responsive layout.
8. Captures screenshot to `docs/superpowers/screenshots/phase-<N>/<page>.<viewport>.png`

### 9.5 Accepted risks (things NOT tested automatically)

- Visual regression / pixel-diffs
- E2E flows with real DB writes
- Load / perf testing
- Cross-browser beyond Chromium
- Real-device mobile testing (replaced with viewport emulation; real-device check happens post-Phase-8)
- Subjective "does this feel right to use" evaluation (manual check post-deploy)

---

## 10. Out of Scope

### 10.1 Feature exclusions

- Structured trade proposals
- Wishlist / want-list matching
- In-app messaging / chat
- Notifications (in-app, email, or push)
- Price auto-refresh from Scryfall / TCGPlayer
- Price history charting
- Deck builder / deck lists
- Collection valuation over time
- Social features (likes, comments, activity feed, follows, profiles)
- Public sharing / shareable binder links
- Public storefront / buy-sell (shelved, not deleted)
- Buylist as store-intake (semantics removed; fields repurposed to personal targets)
- POS terminal
- Order management
- Stripe / payments
- Multi-tenancy / organizations
- Card grading / slab tracking
- Foreign-language tracking as first-class field
- Signed / altered / misprint tracking beyond `notes`
- Bulk lot tracking
- Sealed product tracking
- Non-TCG collectibles

### 10.2 Infrastructure exclusions

- PWA / service worker / offline mode
- Native iOS or Android app
- Push notifications
- Email-based password reset (CLI only)
- OAuth / SSO / Tailnet header auth
- Rate limiting / CAPTCHA / bot protection
- GDPR / account deletion UI
- User-facing data export
- Admin meta-action audit log
- Observability beyond container logs
- Database replicas / HA
- Zero-downtime deploys
- Staging environment
- CI/CD via GitHub Actions
- Secret management beyond `.env`
- Container image registry
- Custom health endpoints beyond Postgres healthcheck
- Log rotation beyond Docker's defaults

### 10.3 Development / tooling exclusions

- Storybook
- MSW
- Visual regression testing (beyond screenshot capture)
- Lighthouse / perf budgets
- axe-core / automated a11y
- i18n / translations
- Feature flag system
- Monorepo / workspace split

### 10.4 Refactor-scope exclusions

- Renaming `/admin/` to `/(app)/` or `/`
- Rewriting ledger/team/settings UIs (minimal-touch only)
- Extracting price refresh into separate service
- Generalizing Card → Item for non-TCG collectibles
- Splitting Prisma client singleton
- Dep upgrades beyond adding Playwright and removing Stripe/Vercel-related packages
- Server actions ↔ API routes conversion
- Multi-file Prisma schema

---

## Appendix A — Open Questions Resolved During Brainstorming

| # | Question | Decision |
|---|---|---|
| 1 | Scope of "personal inventory" | C-like: personal TCG tracker, multi-user via accounts |
| 2 | Auth model | A: invite-based accounts with passwords |
| 3 | Where to host | C: Pi runtime, Fedora builds, standalone output + rsync |
| 4 | Data model | B: Card + Holding normalization (not per-user inventory rows) |
| 5 | Trade binder mechanics | D: passive listings now, structured proposals later |
| 6 | Shop shelving strategy | B: move to `src/_shelved/`, exclude from build/tests/lint |
| 7 | Stripe / Nodemailer handling | B: shelve Stripe, keep Nodemailer infrastructure |
| 8 | Database hosting | A: Docker Postgres container on the Pi |
| 9 | Seeding / bootstrap | A: CLI scripts only, no Prisma seed file |
| 10 | Deploy mechanics | C: Makefile with build/deploy/migrate/logs/backup targets |
| 11 | Frontend work scope | Added: UX researcher + frontend-design skill in dedicated phase |
| 12 | Mobile scope | Added: mobile web view in scope, no PWA / native |
| 13 | Execution gates | Fully autonomous Phases 0–7; manual `make deploy` for Phase 8 |

---

## Appendix B — File Inventory Deltas (condensed)

**New files:**
- `.claude/agents/ux-researcher.md`
- `docker-compose.dev.yml` (dev Postgres at `127.0.0.1:5433`)
- `scripts/dev-bootstrap.sh` (starts dev DB, applies migrations)
- `docs/superpowers/specs/2026-04-15-personal-tracker-pivot-design.md` (this doc)
- `docs/superpowers/research/ux-heuristic-audit.md` (Phase 3)
- `docs/superpowers/research/competitive-analysis.md` (Phase 3)
- `docs/superpowers/research/user-journeys.md` (Phase 3)
- `docs/superpowers/research/frontend-audit.md` (Phase 3)
- `docs/superpowers/screenshots/phase-*/` (Phases 4–5)
- `docs/DEPLOYMENT.md`
- `docker-compose.yml` (also deployed to `/opt/tcg-ledger/` on Pi)
- `Makefile`
- `scripts/playwright-smoke.mjs`
- `scripts/_lib.ts`
- `scripts/create-user.ts`
- `scripts/reset-password.ts`
- `scripts/import-cards.ts`
- `src/app/admin/(dashboard)/trade-binder/page.tsx` (inside the existing `(dashboard)` route group)
- `src/app/actions/trade-binder.ts`
- `src/app/actions/holding.ts`
- `src/services/holding.service.ts`
- `src/services/personal-targets.service.ts`
- `src/repositories/holding.repository.ts`
- `src/mappers/holding.mapper.ts`
- `src/mappers/trade-binder.mapper.ts`
- `src/components/CardDetailDialog.tsx`
- `src/_shelved/README.md` + full mirrored tree
- Phase reports: `PHASE-*.md` (kept under `docs/superpowers/reports/`)

**Renamed:**
- `prisma` `model inventory` → `model legacyInventory`
- Various test files following their source files

**Renamed (additional detail):**
- `src/repositories/inventory.repository.ts` → `src/repositories/holding.repository.ts`
- `src/services/inventory.service.ts` → `src/services/holding.service.ts`
- `src/services/buylist.service.ts` → `src/services/personal-targets.service.ts`
- `src/mappers/inventory.mapper.ts` → `src/mappers/holding.mapper.ts`
- `src/app/admin/(dashboard)/inventory/` → `src/app/admin/(dashboard)/collection/`
- `src/app/admin/(dashboard)/buylist/` → `src/app/admin/(dashboard)/targets/`
- Test files mirror their source rename (e.g., `inventory.mapper.test.ts` → `holding.mapper.test.ts`)

**Modified:**
- `prisma/schema.prisma` — all the Section 2 changes
- `src/lib/auth.ts`, `src/lib/auth-guard.ts`, `src/middleware.ts`
- `src/lib/types.ts`, `src/lib/dtos.ts`
- `src/lib/env.ts`
- `src/services/catalog.service.ts` — upserts Card + Holding instead of inventory rows
- `src/services/dashboard.service.ts` — per-user + Tailnet-wide aggregates
- `next.config.ts` — add `output: "standalone"`, trim CSP (remove Stripe entries)
- `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs` — add `src/_shelved/**` excludes
- `package.json` — add `playwright` devDependency, remove `stripe` dependency
- Retained `src/app/admin/**` pages — retargeted in Phase 4, redesigned in Phase 5
- Ledger tables and their consumers (repos, services, mappers, UI)

**Deleted:**
- `vercel.json`

**Shelved (moved to `src/_shelved/`):**
- See Section 4 for the complete list

---

## Appendix C — Glossary

- **Holding** — a row representing "this user owns N copies of this specific printing in this condition"
- **Card** — a row representing "this printing exists" (catalog-level, shared across users)
- **Trade binder** — the page showing all Holdings flagged `listedForTrade = true` across all users
- **Personal targets** — what used to be called "buylist" (`idealQuantity`, `maxQuantity`), repurposed from "what the store wants to buy" to "what I want in my collection"
- **Legacy inventory** — the original `inventory` table, renamed and referenced only by shelved shop code
- **Shelved** — code that has been moved to `src/_shelved/`, excluded from build/tests/lint, but preserved in the tree for future revival

---

## Status

- [x] Brainstorming complete (all 13 questions resolved)
- [x] Design presented section-by-section, approved
- [x] Spec written
- [ ] Self-review pass
- [ ] User review of written spec
- [ ] Handoff to `writing-plans` skill
- [ ] Phase 0 begins
