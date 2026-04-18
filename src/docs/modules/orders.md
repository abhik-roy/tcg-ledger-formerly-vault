# Orders Module

## Purpose

Admin order management including listing, fulfillment (marking as shipped), Stripe webhook payment processing, and expired-session stock restoration.

## Exported Functions

### Controller (`actions/order.ts`)

| Function                                               | Auth  | Description                  |
| ------------------------------------------------------ | ----- | ---------------------------- |
| `getPendingOrderCount()`                               | Staff | Count of PENDING/PAID orders |
| `getAdminOrders(page, limit)`                          | Staff | Paginated order listing      |
| `fulfillOrderAction(orderId, trackingNumber, carrier)` | Staff | Mark order as shipped        |

### Service (`order.service.ts`)

| Method                                           | Description                                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `getPendingOrderCount()`                         | Count pending/paid orders                                                                                                    |
| `getAdminOrders(page, limit)`                    | Paginated admin listing                                                                                                      |
| `fulfillOrder(orderId, trackingNumber, carrier)` | Mark as COMPLETED with shipping info                                                                                         |
| `processStripePayment(orderId, session)`         | Idempotent: updates order to PAID with final Stripe amounts and sends confirmation email                                     |
| `handleExpiredSession(orderId)`                  | Restores reserved inventory and cancels a PENDING order when the Stripe session expires or async payment fails               |
| `cancelStalePendingOrders(olderThanMinutes?)`    | Batch-cancels PENDING orders older than the threshold (default 30 min); restores inventory for each; returns count cancelled |

### Repository (`order.repository.ts`)

| Method                                | Description                                                   |
| ------------------------------------- | ------------------------------------------------------------- |
| `countByStatuses(statuses)`           | Count orders by status array                                  |
| `findManyPaginated(skip, take)`       | Paginated with items                                          |
| `findById(id, includeItems)`          | Find by ID                                                    |
| `fulfillOrder(id, data)`              | Update status and shipping                                    |
| `create(data)`                        | Create order with items                                       |
| `update(id, data)`                    | Update order                                                  |
| `findStalePending(olderThanMinutes)`  | PENDING orders older than threshold (used by cleanup utility) |
| `findByCustomerAndTimeWindow(params)` | Ledger correlation query                                      |
| `findRecent(limit)`                   | Recent orders for dashboard                                   |
| `aggregateRevenue()`                  | Total revenue aggregate                                       |
| `groupByStatus()`                     | Status distribution                                           |
| `getTopSellers(limit)`                | Top selling items                                             |
| `transaction(fn)`                     | Interactive transaction wrapper                               |

## Key Types

- `AdminOrderDTO` -- Full order with items
- `OrderItemDTO` -- Single line item
- `FulfillOrderInput` -- `{ orderId, trackingNumber?, carrier? }`

## Business Rules

- Fulfillment sets status to "COMPLETED", records carrier, tracking number, and shipped date
- **Inventory is reserved (decremented) at Stripe session creation**, not at payment processing — `processStripePayment` only updates the order status and final amounts
- Stripe payment processing is idempotent: skips orders already in PAID or COMPLETED status
- On `checkout.session.expired`, `handleExpiredSession` restores all reserved inventory and cancels the PENDING order; it is a no-op for PAID, COMPLETED, or CANCELLED orders
- The webhook handler returns 200 even on processing errors to prevent Stripe from retrying indefinitely
- Order confirmation email is sent after successful `processStripePayment`; a flag (`emailConfirmationSent`) prevents duplicate sends
- `verifyOrderFromSession` (called from the success page) also sends a confirmation email if `emailConfirmationSent` is false — this covers cases where the `checkout.session.completed` webhook fires after the customer is redirected to the success page
- `checkout.session.async_payment_failed` is handled identically to `checkout.session.expired`: `handleExpiredSession` restores inventory and cancels the PENDING order
- `cancelStalePendingOrders` is a safety net for orders not covered by webhooks (e.g. pre-webhook orders, webhook delivery failures); invoke via `POST /api/admin/cleanup`
- Admin cleanup endpoint (`POST /api/admin/cleanup`) requires ADMIN or TEAM role; accepts optional `{ olderThanMinutes }` body (default 30)
