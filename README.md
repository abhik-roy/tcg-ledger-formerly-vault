<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

# TCG Ledger

Self-hosted collection tracker and trade binder for Magic: The Gathering and Pokémon TCG. Designed for a small group of friends on a shared network. Runs on a Raspberry Pi.

## What it does

Users sign up, add cards to their collection from a pre-seeded catalog (96K Magic + 20K Pokémon), and list cards for trade with an asking price. Others browse the trade binder, make offers combining cash and cards from their own binder, and the listing owner accepts or declines. Accepted trades automatically update both parties' collections. Either side can void a completed trade to reverse it.

The catalog is populated from [Scryfall](https://scryfall.com) and the [Pokémon TCG API](https://pokemontcg.io) with card images and market prices included.

## Stack

<img src="https://img.shields.io/badge/-Next.js_16-000?logo=nextdotjs" /> <img src="https://img.shields.io/badge/-React_19-61DAFB?logo=react&logoColor=000" /> <img src="https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=fff" /> <img src="https://img.shields.io/badge/-PostgreSQL_16-4169E1?logo=postgresql&logoColor=fff" /> <img src="https://img.shields.io/badge/-Prisma-2D3748?logo=prisma" /> <img src="https://img.shields.io/badge/-Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=fff" /> <img src="https://img.shields.io/badge/-Radix_UI-161618?logo=radixui" /> <img src="https://img.shields.io/badge/-Vitest-6E9F18?logo=vitest&logoColor=fff" /> <img src="https://img.shields.io/badge/-Docker-2496ED?logo=docker&logoColor=fff" /> <img src="https://img.shields.io/badge/-Tailscale-000?logo=tailscale" />

UI is built on [shadcn/ui](https://ui.shadcn.com) with DM Sans and JetBrains Mono. Auth is NextAuth v5 (JWT, credentials with self-registration). Deployment uses Next.js standalone output, rsynced to the Pi and run inside Docker Compose.

## Architecture

```
Server Action  →  Service  →  Repository  →  PostgreSQL
     ↑                              ↓
 auth guard                     Prisma ORM
 input validation               named SELECTs
 cache revalidation
```

Each layer has a single responsibility. Actions handle auth and return `{ success, data | error }`. Services contain business logic and return DTOs. Repositories are Prisma-only. Mappers are pure functions that shape DB rows into DTOs.

## Data model

```
Card              one row per printing (name + set + collector# + finish)
  └─ Holding      per-user ownership (quantity, condition, ask price, trade status)
       ├─ TradeOffer       offers combining cash + cards
       │    └─ TradeOfferCard   cards included in an offer
       └─ quantityLog / priceLog   append-only audit trail
```

`Card` is the shared catalog. `Holding` is personal. A user can own multiple Holdings of the same Card in different conditions. Market price lives on `Card`; acquired price lives on `Holding`.

Listings have an ask type (`custom` dollar amount, `percent` of market, or `trade_only`) and ask value. Offers reference the listing and include a cash amount plus zero or more cards from the offeror's own trade binder. Accepted offers atomically update both parties' holdings in a Prisma transaction.

Users have an `ADMIN` or `USER` role. `UserPermissions` provides two granular flags: `inventoryUpdatePrices` and `addCardsAccess`.

## Pages

| Route                 | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `/admin`              | Dashboard with personal and network-wide stats                      |
| `/admin/collection`   | Your cards, inline editable, ask price controls, CSV export         |
| `/admin/trade-binder` | Listings across all users with make offer / accept / decline / void |
| `/admin/targets`      | Cards you want, with ideal/max quantities                           |
| `/admin/add-cards`    | Search the 116K card catalog, add to collection                     |
| `/admin/ledger`       | Audit log of all quantity and price changes                         |
| `/admin/users`        | User management (admin only)                                        |
| `/admin/settings`     | App config and password change                                      |

Mobile responsive with a hamburger drawer, card layouts below `md`, and bottom-sheet dialogs.

## Setup

### Prerequisites

- Node.js 22+
- Docker (or Podman with podman-compose)

### Development

```bash
npm install --legacy-peer-deps

# Start dev Postgres
bash scripts/dev-bootstrap.sh

# Configure environment
cp .env.example .env.local
# Set DATABASE_URL and AUTH_SECRET at minimum

# Apply schema
DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" npx prisma migrate deploy

# Seed 116K cards from Scryfall + Pokémon API (~10 min)
DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" npx tsx scripts/seed-catalog.ts

# Create admin account
DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" npx tsx scripts/create-admin.ts

npm run dev
```

App runs at `http://localhost:3000/admin`.

### Production (Raspberry Pi)

Two environments on the same Pi, same Postgres, different databases:

|          | Prod                      | Test                                 |
| -------- | ------------------------- | ------------------------------------ |
| Port     | 3001                      | 3002                                 |
| Database | `tcg_ledger`              | `tcg_ledger_test`                    |
| Deploy   | `make deploy` (from main) | `make deploy-test` (from any branch) |

```bash
make deploy             # build + rsync + restart prod
make deploy-test        # build + rsync + restart test
make migrate            # apply migrations to prod DB
make migrate-test       # apply migrations to test DB
make create-admin       # bootstrap admin on prod
make status             # container health
make logs               # tail prod app logs
make test-logs          # tail test app logs
make db-backup          # pg_dump to external drive
```

Full walkthrough in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Public access via [Tailscale Funnel](https://tailscale.com/kb/1223/funnel):

```bash
sudo tailscale funnel --bg --https=443 3001
```

### Tests

```bash
npx vitest run      # 130 tests across 11 files
npm run typecheck
npm run lint
```

## Project structure

```
prisma/                     schema + migrations
scripts/                    CLI tools (create-admin, seed-catalog, import-cards, etc.)
src/
  app/admin/                pages and layouts
  app/actions/              server actions
  app/api/                  API routes (CSV export, auth)
  services/                 business logic
  repositories/             data access (Prisma)
  mappers/                  DB row → DTO
  components/admin/         UI components
  components/ui/            shadcn primitives
  lib/                      auth, guards, types, DTOs
  tests/                    vitest suite
docker-compose.yml          prod + test stack
docker-compose.dev.yml      dev Postgres
Makefile                    build/deploy/manage
```

Shelved retail code (shop, Stripe, POS, orders) lives in `src/_shelved/`, excluded from build/test/lint. See [src/\_shelved/README.md](src/_shelved/README.md) for revival.
