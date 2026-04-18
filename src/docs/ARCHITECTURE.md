# Architecture Documentation

## 1. System Overview

TCG Vault is a Next.js 16 full-stack application for managing a Trading Card Game retail store. It provides two primary interfaces:

- **Storefront** (`/shop/*`) -- Public-facing card browsing, cart, checkout, and customer account management.
- **Admin Back-Office** (`/admin/*`) -- Protected inventory management, order fulfillment, buylist management, POS terminal, team management, analytics dashboard, and ledger audit trail.

The application uses a PostgreSQL database accessed through Prisma ORM, NextAuth v5 for authentication, and Stripe for online payment processing.

## 2. Layer Architecture

The backend follows a strict **Controller -> Service -> Repository** pattern:

```
Request
  |
  v
+---------------------------+
| Controller Layer          |  src/app/actions/*.ts  (Server Actions)
| (Auth + Revalidation)     |  src/app/api/**        (API Routes)
+---------------------------+
  |
  v
+---------------------------+
| Service Layer             |  src/services/*.service.ts
| (Business Logic + DTOs)   |
+---------------------------+
  |
  v
+---------------------------+
| Repository Layer          |  src/repositories/*.repository.ts
| (Pure Data Access)        |
+---------------------------+
  |
  v
+---------------------------+
| Database                  |  PostgreSQL via Prisma
+---------------------------+
```

### 2.1 Layer Rules

| Layer | May Import | Must NOT Import |
|-------|-----------|-----------------|
| Controller | Services, lib (auth, dtos, types), next/cache | Prisma directly, other controllers |
| Service | Repositories, other services, lib (dtos, types) | Prisma directly, next/cache, next auth |
| Repository | Prisma client only | Services, controllers, Next.js APIs |

### 2.2 Key Principles

- **Auth is the controller's job.** Repositories and services never call `auth()`, `requireStaff()`, or `requireAdmin()`.
- **Revalidation is the controller's job.** `revalidatePath()` and `revalidateTag()` are only called in controller/action files.
- **DTOs are the service's job.** Repositories return raw Prisma types. Services map them to DTOs.
- **Repositories are pure data access.** Zero business logic, zero DTO mapping.
- **Prices are always cents.** Stored as integers in the database. Services and DTOs pass cents. UI divides by 100 for display.

## 3. Module Breakdown

### 3.1 Inventory
- **Purpose:** CRUD operations for the store's card inventory.
- **Repository:** `inventory.repository.ts` -- paginated queries, stock updates, buylist queries, set grouping.
- **Service:** `inventory.service.ts` -- DTO mapping, add-from-catalog, add-from-CSV, stock updates with logging, set caching.
- **Controller:** `actions/inventory.ts` -- auth + service delegation + revalidation.

### 3.2 Orders
- **Purpose:** Order management, fulfillment, and Stripe payment processing.
- **Repository:** `order.repository.ts` -- CRUD, pagination, aggregates, time-window queries.
- **Service:** `order.service.ts` -- pending count, admin listing, fulfillment, Stripe payment processing.
- **Controller:** `actions/order.ts` -- auth + service delegation + revalidation.

### 3.3 Buylist
- **Purpose:** Buy-side management. Defines what cards the store wants to buy and at what price.
- **Repository:** Shares `inventory.repository.ts` (buylist is a view over inventory).
- **Service:** `buylist.service.ts` -- paginated buylist queries, stats computation, DTO mapping.
- **Controller:** `actions/buylist.ts` -- auth + service delegation + revalidation.

### 3.4 Customers
- **Purpose:** Customer listing, order history, and aggregate statistics.
- **Repository:** `customer.repository.ts` -- paginated customers, orders by customer.
- **Service:** `customer.service.ts` -- customer listing, order history, ledger correlation.
- **Controller:** `actions/customers.ts` -- auth + service delegation.

### 3.5 Catalog
- **Purpose:** Read-only card catalog seeded from Scryfall/Pokemon TCG APIs.
- **Repository:** `catalog.repository.ts` -- search by name, find by ID, paginated browse.
- **Service:** `catalog.service.ts` -- paginated search with DTO mapping.
- **Controller:** Accessed via `InventoryService.searchCatalog()` through `actions/inventory.ts`.

### 3.6 Logging (Ledger)
- **Purpose:** Immutable audit trail for all stock and price changes.
- **Repository:** `log.repository.ts` -- create quantity/price logs, retrieve by card/time window.
- **Service:** `logging.service.ts` -- log quantity/price, combined ledger entries, order correlation.
- **Controller:** Accessed via `actions/inventory.ts` (getLedgerEntries, getCardLedgerAction, getOrderForLedgerEntry).

### 3.7 POS (Point of Sale)
- **Purpose:** In-store register for walk-in customers.
- **Repository:** Shares `inventory.repository.ts` and `order.repository.ts`.
- **Service:** `pos.service.ts` -- POS inventory search, transactional order creation, PIN verification.
- **Controller:** `actions/pos.ts` -- auth + service delegation + revalidation.

### 3.8 Stripe
- **Purpose:** Online payment processing via Stripe Checkout.
- **Repository:** Shares `inventory.repository.ts` and `order.repository.ts`.
- **Service:** `stripe.service.ts` -- checkout session creation with price validation, order verification.
- **Controller:** `actions/stripe.ts` -- auth + service delegation.
- **Webhook:** `api/webhooks/stripe/route.ts` -- signature verification + `OrderService.processStripePayment()`.

### 3.9 Team
- **Purpose:** Admin and team member account management.
- **Repository:** `team.repository.ts` -- User CRUD, permission upsert/delete.
- **Service:** `team.service.ts` -- invite, update, delete, password reset with bcrypt.
- **Controller:** `actions/team.ts` -- requireAdmin + service delegation + revalidation.

### 3.10 Settings
- **Purpose:** Store configuration (name, tax rate, POS PIN, currency).
- **Repository:** `settings.repository.ts` -- singleton find/upsert.
- **Service:** `settings.service.ts` -- get/update settings, own password change.
- **Controller:** `actions/settings.ts` -- requireAdmin + service delegation + revalidation.

### 3.11 Dashboard
- **Purpose:** Admin home page with aggregate statistics and charts.
- **Repository:** Uses `order.repository.ts`, `inventory.repository.ts`, `customer.repository.ts`.
- **Service:** `dashboard.service.ts` -- 8-query parallel aggregation, chart data computation.
- **Controller:** `actions/dashboard.ts` -- requireStaff + service delegation.

## 4. Data Flow Diagrams

### 4.1 Admin Inventory Update

```
Admin UI (InventoryTable)
  |
  | updateQuickStock(id, qty, price)
  v
actions/inventory.ts (Controller)
  |-- requireStaff()
  |-- InventoryService.updateStock(id, qty, price)
  |     |-- InventoryRepository.findByIdForStockUpdate(id)
  |     |-- InventoryRepository.update(id, { quantity, storeprice })
  |     |-- LoggingService.logQuantity(name, diff, "Admin Manual Update", foilType)
  |     |     |-- LogRepository.createQuantityLog(...)
  |     |-- LoggingService.logPrice(name, oldPrice, newPrice, ...)
  |           |-- LogRepository.createPriceLog(...)
  |-- revalidatePath("/admin/inventory")
  |
  v
{ success: true }
```

### 4.2 Stripe Checkout Flow

```
Customer Cart (CartContext)
  |
  | createStripeSession({ items, email, total })
  v
actions/stripe.ts (Controller)
  |-- auth() -- verify session
  |-- StripeService.createCheckoutSession({ items, email })
  |     |-- InventoryRepository.findForStripeVerification(id) [for each item]
  |     |-- OrderRepository.create({ ... status: "PENDING" })
  |     |-- stripe.checkout.sessions.create(...)
  |     |-- OrderRepository.update(orderId, { stripeSessionId })
  |
  v (redirect to Stripe)

Stripe -> Webhook POST
  |
  v
api/webhooks/stripe/route.ts
  |-- stripe.webhooks.constructEvent(body, sig, secret)
  |-- OrderService.processStripePayment(orderId, session)
  |     |-- OrderRepository.findById(orderId, includeItems: true)
  |     |-- OrderRepository.transaction(async tx => {
  |     |     tx.order.update({ status: "PAID" })
  |     |     tx.inventory.update({ decrement }) [per item]
  |     |     LogRepository.createQuantityLogInTransaction(tx, ...) [per item]
  |     |   })
  |
  v
NextResponse(null, { status: 200 })
```

### 4.3 POS Order

```
POS UI (POSClient)
  |
  | createPOSOrderAction(params)
  v
actions/pos.ts (Controller)
  |-- requireStaff()
  |-- POSService.createOrder(params)
  |     |-- OrderRepository.transaction(async tx => {
  |     |     verify stock [per item]
  |     |     tx.order.create(...)
  |     |     tx.inventory.update({ decrement }) [per item]
  |     |   })
  |     |-- LogRepository.createQuantityLog(...) [per item, parallel]
  |-- revalidatePath("/admin/orders")
  |-- revalidatePath("/admin/inventory")
  |
  v
{ success: true, orderId, change }
```

## 5. Database Model Summary

| Model | Prisma Name | Table | Primary Key | Notes |
|-------|-------------|-------|-------------|-------|
| User | `User` | `USER` | `cuid()` | Admin/team accounts |
| UserPermissions | `UserPermissions` | `user_permissions` | `cuid()` | Granular TEAM permissions |
| StoreSettings | `StoreSettings` | `store_settings` | `"singleton"` | Store config |
| Customer | `Customer` | `CUSTOMER` | `cuid()` | Shopper accounts |
| Order | `Order` | `orders` | `cuid()` | Full orders |
| OrderItem | `OrderItem` | `order_items` | `cuid()` | Line items within orders |
| Card | `Card` | `card` | varchar(255) | Read-only catalog |
| inventory | `inventory` | `inventory` | auto-increment int | Active stock |
| quantityLog | `quantityLog` | `quantityLog` | auto-increment int | Quantity audit trail |
| priceLog | `priceLog` | `priceLog` | auto-increment int | Price audit trail |

### Key Relationships

- `Customer` 1:N `Order` (via customerId)
- `Order` 1:N `OrderItem` (via orderId, cascade delete)
- `User` 1:1 `UserPermissions` (via userId, cascade delete)

### Price Storage

All monetary values are stored as **integers representing cents**. Examples:
- $5.99 is stored as `599`
- $0.50 is stored as `50`
- Convert: `Math.round(dollars * 100)` before writing; `cents / 100` for display.

## 6. Authentication Model

### Provider
NextAuth v5 (beta) with JWT strategy. No session table -- all state is in the JWT.

### Auth Tables
- **`User` (USER)** -- Admin and team accounts. Roles: `"ADMIN"`, `"TEAM"`.
- **`Customer` (CUSTOMER)** -- Shopper accounts. Role: `"CUSTOMER"`.

A `loginType` credential determines which table to check during login.

### Role Hierarchy

| Role | Admin Panel | POS | Shop | Team Mgmt | Settings |
|------|------------|-----|------|-----------|----------|
| ADMIN | Full | Full | N/A | Full | Full |
| TEAM | Per-permission | Per-permission | N/A | None | None |
| CUSTOMER | None | None | Full | None | None |

### Permission Matrix (TEAM role)

| Permission | Controls |
|-----------|----------|
| `inventoryUpdatePrices` | Can edit store prices |
| `inventoryUpdateQty` | Can edit stock quantities |
| `addCardsAccess` | Can add new cards from catalog |
| `buylistUpdatePrices` | Can edit buy prices |
| `buylistUpdateTargets` | Can set ideal/max quantities |
| `ordersFulfill` | Can mark orders as shipped |
| `posAccess` | Can use the POS terminal |

### Auth Guard Functions

- `requireStaff()` -- Allows ADMIN or TEAM. Used for most admin actions.
- `requireAdmin()` -- ADMIN only. Used for team management and settings.

Both are defined in `src/lib/auth-guard.ts` and called exclusively in the controller layer.

## 7. Key Design Decisions

### 7.1 Server Actions as Controllers
Server Actions (`"use server"` functions) serve as the controller layer. They are thin wrappers that handle auth, delegate to services, revalidate caches, and return results. This keeps Next.js-specific concerns out of the business logic.

### 7.2 Buylist as an Inventory View
Rather than a separate table, buylist data (`idealQuantity`, `maxQuantity`, `buyPrice`) lives on the `inventory` table. This avoids data synchronization issues and lets a single inventory update affect both the stock view and the buylist view.

### 7.3 Separate User and Customer Tables
Admin users and shoppers are in different tables (`USER` vs `CUSTOMER`) rather than a unified users table. This provides clean separation of concerns and prevents accidental role mixing.

### 7.4 Ledger-Based Audit Trail
All stock and price changes are logged to `quantityLog` and `priceLog` tables. These are append-only -- rows are never updated or deleted. This creates an immutable audit trail for inventory reconciliation.

### 7.5 Client-Side Cart
The shopping cart is persisted to `localStorage` (not the database). This avoids authenticated-only cart requirements and reduces server load. Cart data is validated server-side during checkout.

### 7.6 Idempotent Webhook Processing
The Stripe webhook handler checks order status before processing. If an order is already `PAID` or `COMPLETED`, it returns 200 without re-processing. This prevents double-charging from webhook retries.

## 8. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth JWT signing secret |
| `NEXTAUTH_SECRET` | Yes | Alias for AUTH_SECRET |
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signature verification |
| `NEXT_PUBLIC_BASE_URL` | Yes | Application base URL (for Stripe redirects) |
| `GMAIL_USER` | No | Gmail address for Nodemailer |
| `GMAIL_APP_PASSWORD` | No | Gmail app password for Nodemailer |
| `ADMIN_EMAIL` | No | Recipient for buylist hit notifications |
| `POS_EXIT_PIN` | No | Fallback POS exit PIN (default: "1234") |

## 9. Testing Strategy

### Unit Tests
- Service methods with mocked repositories
- Pure functions (e.g., `BuylistService.computeStats()`)
- DTO mapping logic

### Integration Tests
- Repository methods against a test database
- Server Actions with mocked auth and services

### Test Location
Tests live in `src/tests/` mirroring the source structure:
- `src/tests/services/` -- Service unit tests
- `src/tests/repositories/` -- Repository integration tests

### Running Tests
```bash
npx vitest              # Run all tests
npx vitest run src/tests/services/buylist-service.test.ts  # Single file
```
