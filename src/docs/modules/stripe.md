# Stripe Module

## Purpose

Online payment processing via Stripe Checkout. Creates checkout sessions with server-side price/stock validation, reserves inventory atomically at session creation, and handles post-payment reconciliation and expired-session cleanup.

## Exported Functions

### Controller (`actions/stripe.ts`)

| Function                            | Auth        | Description                     |
| ----------------------------------- | ----------- | ------------------------------- |
| `createStripeSession(data)`         | Any session | Create Stripe checkout session  |
| `createOrderFromSession(sessionId)` | Any session | Verify payment and get order ID |

### Webhook (`api/webhooks/stripe/route.ts`)

| Handler | Event                                   | Description                                                                                                         |
| ------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `POST`  | `checkout.session.completed`            | Marks order as PAID with final Stripe amounts; sends confirmation email; returns **500** on error so Stripe retries |
| `POST`  | `checkout.session.expired`              | Restores reserved inventory and cancels the PENDING order; returns 200 (definitive state)                           |
| `POST`  | `checkout.session.async_payment_failed` | Same as expired: restores inventory and cancels the PENDING order; returns 200                                      |

### Service (`stripe.service.ts`)

| Method                              | Description                                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `createCheckoutSession(data)`       | Validate prices, lock and decrement inventory, create PENDING order, create Stripe session                                         |
| `verifyOrderFromSession(sessionId)` | Verify payment status, return full order DTO; sends confirmation email if webhook hasn't fired yet (`emailConfirmationSent` guard) |

## Key Types

- `StripeCheckoutInput` -- `{ items, email }`
- `VerifiedCheckoutItem` -- Server-validated item with DB-verified price and quantity

## Business Rules

- All item prices are re-verified against the database before creating a Stripe session (prevents client-side price manipulation)
- **Inventory is reserved (decremented) atomically inside a `prisma.$transaction` at session creation** using `SELECT FOR UPDATE` row-level locking — this prevents overselling under concurrent load
- A `PENDING` order is created inside the same transaction as the inventory reservation; the Stripe session is created outside the transaction only after stock is confirmed
- The Stripe session ID is stored on the order (`stripeSessionId`) for deduplication and expiry correlation
- Shipping is fixed at $4.99 ("Standard Shipping", 3–5 business days)
- On `checkout.session.completed`, `OrderService.processStripePayment` updates the order to `PAID` with final Stripe amounts — inventory is **not** decremented again (already done at session creation)
- On `checkout.session.completed` **processing errors**, the webhook returns **500** so Stripe retries — the order stays PENDING until the retry succeeds
- On `checkout.session.expired` or `checkout.session.async_payment_failed`, `OrderService.handleExpiredSession` restores all reserved stock and cancels the `PENDING` order; it is a no-op for already-processed orders
- On expired/failed handler errors, the webhook returns 200 — these are definitive states and retrying the handler won't help; use the admin cleanup endpoint for manual reconciliation
- `POST /api/admin/cleanup` provides a safety-net cleanup for stale PENDING orders not covered by webhooks (ADMIN/TEAM roles only)
