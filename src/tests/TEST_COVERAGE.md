# Test Suite Coverage — TCG Vault

**Framework:** Vitest v4 · **Environment:** jsdom · **Total:** 302 tests across 19 suites · **Status:** All passing

Run with:

```bash
cd FRONT-END/my-card-store
npx vitest run                        # one-shot
npx vitest run --reporter=verbose     # with full test names
npx vitest                            # watch mode
npx vitest run src/tests/path/file    # single file
```

---

## Summary Table

| Suite            | File                                  | Tests   | Category          | Source Under Test                          |
| ---------------- | ------------------------------------- | ------- | ----------------- | ------------------------------------------ |
| DashboardService | `services/dashboard-service.test.ts`  | 21      | Service / Unit    | `src/services/dashboard.service.ts`        |
| CustomerService  | `services/customer-service.test.ts`   | 13      | Service / Unit    | `src/services/customer.service.ts`         |
| BuylistService   | `services/buylist-service.test.ts`    | 19      | Service / Unit    | `src/services/buylist.service.ts`          |
| EmailService     | `services/email-service.test.ts`      | 16      | Service / Unit    | `src/services/email.service.ts`            |
| OrderService     | `services/order-service.test.ts`      | 35      | Service / Unit    | `src/services/order.service.ts`            |
| StripeService    | `services/stripe-service.test.ts`     | 19      | Service / Unit    | `src/services/stripe.service.ts`           |
| Inventory Mapper | `mappers/inventory.mapper.test.ts`    | 31      | Mapper / Unit     | `src/mappers/inventory.mapper.ts`          |
| Checkout Action  | `actions/checkout.test.ts`            | 19      | Action / Unit     | `src/app/actions/checkout.ts`              |
| Middleware       | `middleware.test.ts`                  | 13      | Middleware / Unit | `src/middleware.ts`                        |
| Stripe Webhook   | `api/stripe-webhook.test.ts`          | 12      | API / Unit        | `src/app/api/webhooks/stripe/route.ts`     |
| Register API     | `api/register.test.ts`                | 16      | API / Unit        | `src/app/api/register/route.ts`            |
| Admin Cleanup    | `api/admin-cleanup.test.ts`           | 9       | API / Unit        | `src/app/api/admin/cleanup/route.ts`       |
| Customer Utils   | `utils/customer-utils.test.ts`        | 10      | Unit              | Logic from `CustomersTable.tsx`            |
| CustomersTable   | `components/CustomersTable.test.tsx`  | 12      | Component / RTL   | `src/components/admin/CustomersTable.tsx`  |
| CustomersClient  | `components/CustomersClient.test.tsx` | 14      | Component / RTL   | `src/components/admin/CustomersClient.tsx` |
| ShopLoginForm    | `components/ShopLoginForm.test.tsx`   | 10      | Component / RTL   | `src/app/shop/login/page.tsx`              |
| UserMenu         | `components/UserMenu.test.tsx`        | 16      | Component / RTL   | `src/components/shop/UserMenu.tsx`         |
| AdminLoginPage   | `components/AdminLoginPage.test.tsx`  | 6       | Component / RTL   | `src/app/admin/login/page.tsx`             |
| ThemeToggle      | `components/ThemeToggle.test.tsx`     | 11      | Component / RTL   | `src/components/ui/theme-toggle.tsx`       |
| **Total**        |                                       | **302** |                   |                                            |

---

## Suite 1 — DashboardService

**File:** `src/tests/services/dashboard-service.test.ts`
**Source:** `src/services/dashboard.service.ts`
**Strategy:** Pure unit tests. All Prisma models mocked via `vi.mock('@/lib/prisma')`.

### Overview Stats

| #   | Test                                                       | What it verifies                                             |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | returns totalRevenue from the aggregate sum                | `_sum.totalAmount` passed through as `overview.totalRevenue` |
| 2   | returns 0 totalRevenue when aggregate returns null         | `?? 0` guard prevents null leaking to the UI                 |
| 3   | sums all status counts for totalOrders                     | Sum of all `_count.id` values across every status group      |
| 4   | extracts pendingOrders from the PENDING status count       | `statusCounts['PENDING']` extracted correctly                |
| 5   | returns 0 pendingOrders when there are no PENDING orders   | `?? 0` guard when PENDING key is absent                      |
| 6   | returns totalCustomers from customer.count                 | `prisma.customer.count()` result surfaced                    |
| 7   | returns totalInventoryItems from inventory.count           | `prisma.inventory.count()` result surfaced                   |
| 8   | calculates avgOrderValue as revenue divided by totalOrders | `50000 / 10 = 5000 cents`                                    |
| 9   | returns 0 avgOrderValue when there are no orders           | Division-by-zero guard                                       |

### Recent Orders

| #   | Test                                                                | What it verifies                                                              |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 10  | maps customerEmail, totalAmount, status, fulfillment, and itemCount | DTO correctly reshapes raw Prisma result including `_count.items → itemCount` |
| 11  | returns an empty array when there are no orders                     | `recentOrders` is `[]` not undefined                                          |

### Top Sellers

| #   | Test                                                           | What it verifies                                |
| --- | -------------------------------------------------------------- | ----------------------------------------------- |
| 12  | maps name, setName, totalSold, and revenue correctly           | `orderItem.groupBy` aggregates correctly mapped |
| 13  | returns 0 for totalSold and revenue when \_sum values are null | `_sum.quantity ?? 0` and `_sum.price ?? 0`      |
| 14  | returns an empty array when there are no order items           | Empty-state safe                                |

### Chart Data

| #   | Test                                                                   | What it verifies                                               |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| 15  | returns 7 data points for the default 7-day window                     | Default `chartDays = 7` produces 7 `RevenueChartPoint` entries |
| 16  | returns the correct number of points when a custom day count is passed | `getStats(30)` produces 30 chart points                        |
| 17  | sums today's revenue into the last chart point                         | Orders bucketed into final chart point by `yyyy-MM-dd` key     |
| 18  | sets maxChartValue to the highest daily total                          | `maxChartValue` equals largest single-day revenue              |
| 19  | returns maxChartValue of 1 when all days have zero revenue             | SVG divide-by-zero guard                                       |

### Low Stock

| #   | Test                                                          | What it verifies                                                     |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| 20  | returns mapped low stock items with the correct shape         | `name`, `storeprice`, `quantity`, `setname`, `condition` all present |
| 21  | returns an empty array when no high-value items are low stock | Empty-state safe                                                     |

---

## Suite 2 — CustomerService

**File:** `src/tests/services/customer-service.test.ts`
**Source:** `src/services/customer.service.ts`
**Strategy:** Pure unit tests. Prisma fully mocked.

### `getPaginatedCustomers`

| #   | Test                                                         | What it verifies                                        |
| --- | ------------------------------------------------------------ | ------------------------------------------------------- |
| 1   | maps customer data with correct orderCount and lifetimeSpend | Counts orders and sums `totalAmount`                    |
| 2   | builds OR where clause when query is provided                | `where.OR` contains email/firstName/lastName conditions |
| 3   | does not include OR clause when query is empty               | No unnecessary filter                                   |
| 4   | calculates correct skip for page 2                           | Page 2 × page size 20 → `skip: 20`                      |
| 5   | returns 0 lifetimeSpend for customer with no orders          | Edge case: empty orders array                           |
| 6   | calculates correct totalPages                                | `ceil(45 / 20) = 3`                                     |

### `getOrdersForCustomer`

| #   | Test                                                  | What it verifies                              |
| --- | ----------------------------------------------------- | --------------------------------------------- |
| 7   | queries by both customerId and customerEmail using OR | Handles linked accounts and guest orders      |
| 8   | includes items in the query                           | `include: { items: true }` fetches line items |

### `getOverviewStats`

| #   | Test                                               | What it verifies                                      |
| --- | -------------------------------------------------- | ----------------------------------------------------- |
| 9   | returns 0 avgOrderValue when there are no orders   | Division-by-zero guard                                |
| 10  | calculates avgOrderValue correctly                 | `30000 / 3 = 10000 cents`                             |
| 11  | excludes CANCELLED orders from revenue calculation | `{ status: { not: 'CANCELLED' } }` in aggregate where |

### `getLedgerEntriesForItem`

| #   | Test                                             | What it verifies                                   |
| --- | ------------------------------------------------ | -------------------------------------------------- |
| 12  | queries within 5-minute window around order time | `gte = orderTime - 5min`, `lte = orderTime + 5min` |
| 13  | only retrieves negative quantity changes (sales) | `amount: { lt: 0 }` filter                         |

---

## Suite 3 — BuylistService

**File:** `src/tests/services/buylist-service.test.ts`
**Source:** `src/services/buylist.service.ts`
**Strategy:** Pure unit tests. Prisma fully mocked.

### `computeStats` (pure, no DB)

| #   | Test                                                              | What it verifies                       |
| --- | ----------------------------------------------------------------- | -------------------------------------- |
| 1   | counts items with idealQuantity > 0 as totalOnBuylist             | Items with a target set counted        |
| 2   | counts items where currentStock < idealQuantity as needingRestock | Below-target items                     |
| 3   | counts items where currentStock >= maxQuantity as atCapacity      | At/above max; `maxQuantity=0` excluded |
| 4   | returns 0 for all stats when the array is empty                   | Empty-state safe                       |
| 5   | handles null quantity by treating it as 0                         | Null stock → 0                         |
| 6   | does not count a not-set item (idealQuantity=0) as needingRestock | No target → excluded from restock      |

### `getPaginatedItems`

| #   | Test                                                            | What it verifies                   |
| --- | --------------------------------------------------------------- | ---------------------------------- |
| 7   | maps inventory rows to BuylistItemDTOs with correct field names | All DTO fields mapped correctly    |
| 8   | uses imagenormal over imagesmall for the image field            | Buylist prefers `imagenormal`      |
| 9   | falls back to imagesmall when imagenormal is null               | Fallback image                     |
| 10  | returns null image when both image fields are null              | Both null → `image: null`          |
| 11  | defaults null quantity to 0 in currentStock                     | Null DB field → `currentStock: 0`  |
| 12  | defaults null condition to NM                                   | Null → `"NM"`                      |
| 13  | calculates correct totalPages                                   | `ceil(120 / 50) = 3`               |
| 14  | calculates skip correctly for page 3                            | `(3-1) * 50 = skip: 100`           |
| 15  | includes a search OR clause when query is provided              | `{ OR: [{ name: { contains } }] }` |
| 16  | does not include OR clause when query is empty                  | `where.OR` absent                  |
| 17  | adds idealQuantity > 0 filter when status is 'buying'           | `{ idealQuantity: { gt: 0 } }`     |
| 18  | adds idealQuantity === 0 filter when status is 'not_set'        | `{ idealQuantity: 0 }`             |
| 19  | returns stats from $queryRaw with correct counts                | BigInt → number conversion         |

---

## Suite 4 — EmailService

**File:** `src/tests/services/email-service.test.ts`
**Source:** `src/services/email.service.ts`
**Strategy:** Nodemailer mocked via `vi.hoisted`. `@react-email/render` mocked to return static HTML.

### `sendBuylistHit`

| #   | Test                                                   | What it verifies                             |
| --- | ------------------------------------------------------ | -------------------------------------------- |
| 1   | calls transporter.sendMail with correct subject        | Subject is `"Buylist Hit: <cardName>"`       |
| 2   | sends to the ADMIN_EMAIL env var                       | `to` field matches `process.env.ADMIN_EMAIL` |
| 3   | uses NODEMAILER_FROM for the from field                | `from` contains `NODEMAILER_FROM` value      |
| 4   | includes rendered HTML in the html field               | `html` field is the rendered email string    |
| 5   | does not throw when sendMail rejects (fire-and-forget) | Resolves without throwing on SMTP failure    |
| 6   | logs error to console when sendMail fails              | `console.error` called with the error        |
| 7   | works without an image (optional field)                | No crash when `image` is absent              |

### `sendOrderConfirmation`

| #   | Test                                                    | What it verifies                          |
| --- | ------------------------------------------------------- | ----------------------------------------- |
| 8   | sends email to order.customerEmail                      | `to` matches `order.customerEmail`        |
| 9   | subject contains the last 8 chars of orderId uppercased | Short order code in subject line          |
| 10  | uses NODEMAILER_FROM for the from field                 | `from` contains `NODEMAILER_FROM`         |
| 11  | includes rendered HTML in the html field                | `html` is the rendered string             |
| 12  | does not throw when sendMail rejects (fire-and-forget)  | Resolves without throwing                 |
| 13  | silently skips when customerEmail is empty string       | `sendMail` not called for empty email     |
| 14  | silently skips when customerEmail is falsy              | `sendMail` not called for undefined email |
| 15  | works with PICKUP fulfillment                           | No crash for in-store pickup orders       |
| 16  | works with SHIPPING fulfillment and address fields      | No crash with address fields set          |

---

## Suite 5 — OrderService

**File:** `src/tests/services/order-service.test.ts`
**Source:** `src/services/order.service.ts`
**Strategy:** `OrderRepository`, `LogRepository`, and `EmailService` fully mocked. Transactions are simulated by calling the callback directly.

### `getPendingOrderCount`

| #   | Test                                                        | What it verifies              |
| --- | ----------------------------------------------------------- | ----------------------------- |
| 1   | calls OrderRepository.countByStatuses with PENDING and PAID | Status array passed correctly |

### `getAdminOrders`

| #   | Test                                               | What it verifies                |
| --- | -------------------------------------------------- | ------------------------------- |
| 2   | calculates skip correctly for page 1               | `skip = 0` for page 1           |
| 3   | calculates skip correctly for page 2 with limit 10 | `skip = 10` for page 2          |
| 4   | calculates totalPages correctly                    | `ceil(25/10) = 3`               |
| 5   | returns orders from the repository                 | Orders and total passed through |
| 6   | uses default page=1 and limit=10 when not provided | Defaults respected              |

### `fulfillOrder`

| #   | Test                                                 | What it verifies                                 |
| --- | ---------------------------------------------------- | ------------------------------------------------ |
| 7   | calls OrderRepository.fulfillOrder with correct data | Status=COMPLETED, carrier, trackingNumber passed |
| 8   | defaults carrier to USPS when not provided           | `carrier: "USPS"` when arg omitted               |
| 9   | defaults carrier to USPS when empty string is passed | `carrier: "USPS"` when arg is `""`               |
| 10  | sets trackingNumber to null when not provided        | `trackingNumber: null`                           |
| 11  | includes a shippedAt date                            | `shippedAt` is a `Date` instance                 |

### `processStripePayment`

| #   | Test                                                                   | What it verifies                                          |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| 12  | returns early if order is not found                                    | No transaction called                                     |
| 13  | skips processing if order is already PAID (idempotency)                | No transaction called                                     |
| 14  | skips processing if order is already COMPLETED (idempotency)           | No transaction called                                     |
| 15  | updates order status to PAID within the transaction                    | `tx.order.update` called with `status: "PAID"`            |
| 16  | calculates tax correctly from amount_total - amount_subtotal           | `tax = 11000 - 10000 = 1000`                              |
| 17  | does not decrement inventory (pre-reserved at session creation)        | `tx.inventory.update` not called                          |
| 18  | does not log quantity changes (pre-logged at session creation)         | `LogRepository.createQuantityLogInTransaction` not called |
| 19  | uses order totalAmount when session amount_total is null               | Falls back to `order.totalAmount`                         |
| 20  | calls sendOrderConfirmation after successful processing                | Email sent once                                           |
| 21  | does NOT call sendOrderConfirmation when emailConfirmationSent is true | Idempotency guard                                         |
| 22  | sets emailConfirmationSent to true via OrderRepository.update          | Flag updated after sending                                |
| 23  | does NOT update emailConfirmationSent when email was already sent      | No redundant update                                       |

### `handleExpiredSession`

| #   | Test                                                              | What it verifies                                                |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| 24  | restores inventory for all items in a PENDING order               | `tx.inventory.update` called with `{ increment }` for each item |
| 25  | logs each restore with STRIPE_EXPIRED: prefix and positive amount | Log entries with positive amounts                               |
| 26  | cancels the order (sets status to CANCELLED)                      | `tx.order.update` with `status: "CANCELLED"`                    |
| 27  | is a no-op when order is not found                                | No transaction called                                           |
| 28  | is a no-op when order is already PAID                             | No transaction called                                           |
| 29  | is a no-op when order is already CANCELLED                        | No transaction called                                           |

### `cancelStalePendingOrders`

| #   | Test                                                   | What it verifies                                                        |
| --- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| 30  | calls findStalePending with the given olderThanMinutes | `OrderRepository.findStalePending` called with correct arg              |
| 31  | uses 30 minutes as the default threshold               | Default arg → `findStalePending(30)`                                    |
| 32  | calls handleExpiredSession for each stale order        | `handleExpiredSession` called once per stale order ID                   |
| 33  | returns the count of successfully cancelled orders     | Return value equals number of successful cancellations                  |
| 34  | returns 0 when there are no stale orders               | Empty result → count 0                                                  |
| 35  | skips a failed order and continues processing the rest | One failure → 2 cancelled; all 3 `handleExpiredSession` calls attempted |

---

## Suite 6 — StripeService

**File:** `src/tests/services/stripe-service.test.ts`
**Source:** `src/services/stripe.service.ts`
**Strategy:** Stripe SDK, Prisma `$transaction`, `InventoryRepository`, `OrderRepository`, `LogRepository`, and `EmailService` fully mocked. Transaction callback executed directly.

### `createCheckoutSession`

| #   | Test                                                                     | What it verifies                                                                                 |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | returns the Stripe checkout URL on happy path                            | `{ url }` returned from Stripe session                                                           |
| 2   | creates a PENDING order inside the transaction before the Stripe session | `tx.order.create` called before `stripe.checkout.sessions.create`                                |
| 3   | stores stripeSessionId on the order after session creation               | `OrderRepository.update` called with `stripeSessionId`                                           |
| 4   | throws when an item is not found in inventory                            | Error: `"Item N not found or has no price"`                                                      |
| 5   | throws when an item has no price                                         | Same error for null `storeprice`                                                                 |
| 6   | throws when there is insufficient stock (from locked row in transaction) | Error: `"Insufficient stock for <name>"`                                                         |
| 7   | passes orderId in Stripe session metadata                                | `metadata.orderId` is the DB order ID                                                            |
| 8   | calculates subtotal correctly for multiple items                         | `(100*3) + (250*1) = 550`                                                                        |
| 9   | treats null quantity as zero stock (from locked row)                     | Null quantity → insufficient stock error                                                         |
| 10  | decrements inventory inside the transaction for each item                | `tx.inventory.update` with `{ decrement }` per item                                              |
| 11  | logs quantity reservation inside the transaction                         | `LogRepository.createQuantityLogInTransaction` with negative amount and `STRIPE_RESERVE:` prefix |
| 12  | does not create Stripe session when stock check fails in transaction     | `stripe.checkout.sessions.create` not called                                                     |
| 13  | calls findAndLockForUpdate for each item in the transaction              | `SELECT FOR UPDATE` called once per item                                                         |

### `verifyOrderFromSession`

| #   | Test                                                                            | What it verifies                                                                |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 14  | returns success and orderId when payment_status is paid                         | `{ success: true, orderId, order }`                                             |
| 15  | returns failure when payment_status is not paid                                 | `{ success: false, error: "Payment not completed" }`                            |
| 16  | returns failure when orderId is missing from metadata                           | `{ success: false, error: "Order reference not found" }`                        |
| 17  | returns failure when order is not found in the database                         | `{ success: false, error: "Order not found" }`                                  |
| 18  | sends confirmation email when emailConfirmationSent is false (webhook fallback) | `EmailService.sendOrderConfirmation` called; `OrderRepository.update` sets flag |
| 19  | does NOT send confirmation email when emailConfirmationSent is true             | Email not sent; `OrderRepository.update` not called                             |

---

## Suite 7 — Inventory Mapper

**File:** `src/tests/mappers/inventory.mapper.test.ts`
**Source:** `src/mappers/inventory.mapper.ts`
**Strategy:** Pure unit tests. No mocks, no I/O.

### `toInventoryItemDTO`

| #   | Test                                                                   | What it verifies              |
| --- | ---------------------------------------------------------------------- | ----------------------------- |
| 1   | maps all fields correctly from a complete row                          | All 14+ DTO fields mapped     |
| 2   | defaults null quantity to 0                                            | Null → `quantity: 0`          |
| 3   | defaults null storeprice to 0                                          | Null → `price: 0`             |
| 4   | defaults null condition to NM                                          | Null → `"NM"`                 |
| 5   | defaults null foiltype to nonfoil                                      | Null → `"nonfoil"`            |
| 6   | defaults empty setname to Unknown Set                                  | `""` → `"Unknown Set"`        |
| 7   | defaults null game to magic                                            | Null → `"magic"`              |
| 8   | defaults null rarity to null                                           | Null passes through as `null` |
| 9   | uses imagesmall when both images are present (inventory prefers small) | `imagesmall` priority         |
| 10  | falls back to imagenormal when imagesmall is null                      | Fallback to `imagenormal`     |
| 11  | returns null image when both image fields are null                     | Both null → `image: null`     |

### `toBuylistItemDTO`

| #   | Test                                                 | What it verifies              |
| --- | ---------------------------------------------------- | ----------------------------- |
| 12  | maps all fields correctly                            | All DTO fields present        |
| 13  | uses imagenormal over imagesmall for the image field | Buylist prefers `imagenormal` |
| 14  | falls back to imagesmall when imagenormal is null    | Fallback                      |
| 15  | returns null image when both image fields are null   | Both null → `image: null`     |
| 16  | defaults null quantity to 0 in currentStock          | Null → `currentStock: 0`      |
| 17  | defaults null condition to NM                        | Null → `"NM"`                 |
| 18  | defaults null foiltype to nonfoil                    | Null → `"nonfoil"`            |
| 19  | defaults null storeprice to 0                        | Null → `storePrice: 0`        |

### `toBuylistOverviewStats`

| #   | Test                              | What it verifies                        |
| --- | --------------------------------- | --------------------------------------- |
| 20  | converts bigint values to numbers | Raw SQL `BigInt` → JS number            |
| 21  | handles zero bigints correctly    | `BigInt(0)` → `0`                       |
| 22  | handles large bigint values       | `BigInt(999999)` without precision loss |

### `toPOSInventoryItemDTO`

| #   | Test                                                 | What it verifies                     |
| --- | ---------------------------------------------------- | ------------------------------------ |
| 23  | maps all fields correctly                            | All DTO fields mapped                |
| 24  | uses imagenormal over imagesmall for the image field | POS prefers `imagenormal`            |
| 25  | falls back to imagesmall when imagenormal is null    | Fallback                             |
| 26  | returns null image when both image fields are null   | Both null → `image: null`            |
| 27  | defaults null condition to NM                        | Null → `"NM"`                        |
| 28  | defaults null foiltype to nonfoil                    | Null → `"nonfoil"`                   |
| 29  | defaults null storeprice to 0                        | Null → `price: 0`                    |
| 30  | defaults null quantity to 0                          | Null → `quantity: 0`                 |
| 31  | defaults empty setname to empty string               | POS preserves `""` (no substitution) |

---

## Suite 8 — Checkout Action

**File:** `src/tests/actions/checkout.test.ts`
**Source:** `src/app/actions/checkout.ts`
**Strategy:** `prisma.$transaction`, `auth`, `revalidatePath`, and `EmailService` mocked. Transaction callback executed directly via mock.

| #   | Test                                                              | What it verifies                                                 |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | returns success with orderId on a valid order                     | `{ success: true, orderId, order }`                              |
| 2   | calls revalidatePath after a successful order                     | `/admin/orders`, `/admin/inventory`, `/admin/ledger` revalidated |
| 3   | sets customerId from session when role is CUSTOMER                | `customerId` from auth session                                   |
| 4   | sets customerId to null when user is not authenticated            | Guest orders                                                     |
| 5   | sets customerId to null when user is ADMIN (not CUSTOMER)         | Admin-placed orders have no customerId                           |
| 6   | returns failure when stock is insufficient                        | Error contains "Insufficient stock"                              |
| 7   | returns failure when inventory item is not found                  | Same error for missing row                                       |
| 8   | defaults fulfillment to PICKUP when not SHIPPING                  | Non-SHIPPING → `"PICKUP"`                                        |
| 9   | sets fulfillment to SHIPPING when explicitly specified            | `"SHIPPING"` passes through                                      |
| 10  | defaults fulfillment to PICKUP when not provided                  | Omitted → `"PICKUP"`                                             |
| 11  | applies Math.round to subtotal, tax, and total                    | Floating-point safe                                              |
| 12  | decrements inventory for each item                                | `tx.inventory.update` with `{ decrement }`                       |
| 13  | creates a quantity log entry for each item                        | `tx.quantityLog.create` with `CUSTOMER:` prefix                  |
| 14  | returns failure with error message when transaction throws        | Error message propagated                                         |
| 15  | does not call revalidatePath when the order fails                 | No revalidation on failure                                       |
| 16  | calls EmailService.sendOrderConfirmation after a successful order | Email sent once                                                  |
| 17  | passes the correct customerEmail to sendOrderConfirmation         | Email matches order data                                         |
| 18  | passes the correct mapped items to sendOrderConfirmation          | Items have correct shape                                         |
| 19  | does NOT call sendOrderConfirmation when the transaction fails    | No email on failure                                              |

---

## Suite 9 — Middleware

**File:** `src/tests/middleware.test.ts`
**Source:** `src/middleware.ts`
**Strategy:** `next-auth/jwt` `getToken` mocked. `NextRequest` constructed directly.

| #   | Test                                                                                  | What it verifies                      |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | allows ADMIN to access /admin/inventory                                               | No redirect (no `location` header)    |
| 2   | allows TEAM to access /admin/inventory                                                | Same                                  |
| 3   | redirects unauthenticated user from /admin/inventory to /admin/login with callbackUrl | 307 with `callbackUrl` param          |
| 4   | redirects unauthenticated user from /admin/orders to /admin/login with callbackUrl    | Same for `/admin/orders`              |
| 5   | redirects CUSTOMER from /admin/inventory to /                                         | 307 to root, not to `/admin/login`    |
| 6   | redirects a user with an unknown role from /admin/inventory to /                      | 307 to root                           |
| 7   | allows unauthenticated user to access /admin/login                                    | No redirect                           |
| 8   | redirects already-authenticated ADMIN from /admin/login to /admin/inventory           | 307 to inventory                      |
| 9   | redirects already-authenticated TEAM from /admin/login to /admin/inventory            | Same                                  |
| 10  | allows CUSTOMER to view /admin/login                                                  | CUSTOMER is not staff; passes through |
| 11  | allows unauthenticated user to access non-admin paths                                 | No redirect for `/shop/browse`        |
| 12  | allows any authenticated user to access non-admin paths                               | No redirect for `/shop/profile`       |
| 13  | allows access to the root path without authentication                                 | No redirect for `/`                   |

---

## Suite 10 — Stripe Webhook

**File:** `src/tests/api/stripe-webhook.test.ts`
**Source:** `src/app/api/webhooks/stripe/route.ts`
**Strategy:** Stripe SDK, `next/headers`, and `OrderService` mocked.

| #   | Test                                                                                            | What it verifies                                              |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | returns 200 and calls processStripePayment for checkout.session.completed                       | Payment delegation and response code                          |
| 2   | returns 400 when signature verification fails                                                   | Invalid signature → 400 with error text                       |
| 3   | returns 200 without processing for non-checkout events                                          | Unhandled event types ignored                                 |
| 4   | returns 200 without processing when orderId is missing from metadata                            | Missing metadata guard                                        |
| 5   | returns 500 when processStripePayment throws so Stripe retries the payment event                | Error surfaces as 500 so Stripe retries on transient failures |
| 6   | reads the raw body from the request                                                             | `req.text()` called; passed to `constructEvent`               |
| 7   | calls handleExpiredSession with orderId from metadata (expired)                                 | Expiry handling delegation                                    |
| 8   | returns 200 even when handleExpiredSession throws (expired)                                     | Definitive state; 200 returned so Stripe doesn't retry        |
| 9   | does not call handleExpiredSession when orderId is missing from metadata (expired)              | Guard for missing metadata                                    |
| 10  | calls handleExpiredSession with orderId from metadata (async_payment_failed)                    | Failed async payment handled identically to expiry            |
| 11  | returns 200 even when handleExpiredSession throws (async_payment_failed)                        | Same resilience pattern                                       |
| 12  | does not call handleExpiredSession when orderId is missing from metadata (async_payment_failed) | Guard for missing metadata                                    |

---

## Suite 11 — Register API

**File:** `src/tests/api/register.test.ts`
**Source:** `src/app/api/register/route.ts`
**Strategy:** `next/headers`, `@/lib/prisma`, and `bcryptjs` mocked. Unique IPs provided per test to avoid the in-memory rate-limit map accumulating across tests.

| #   | Test                                                               | What it verifies                                                                        |
| --- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 1   | creates a customer and returns user data on valid registration     | 200 with `{ user }` JSON                                                                |
| 2   | returns 400 when email is missing                                  | `{ message: "Email and password are required." }`                                       |
| 3   | returns 400 when password is missing                               | Same message                                                                            |
| 4   | returns 400 when email already exists                              | `{ message: "Registration failed…" }` (not 409)                                         |
| 5   | splits a full name into firstName and lastName                     | `"Jane Smith"` → `firstName: "Jane"`, `lastName: "Smith"`                               |
| 6   | handles multi-word last names correctly                            | `"Mary Jane Watson"` → `lastName: "Jane Watson"`                                        |
| 7   | sets lastName to null when only a single name is provided          | Single token → `lastName: null`                                                         |
| 8   | handles missing name gracefully (firstName and lastName both null) | No name field → both null                                                               |
| 9   | hashes the password before storing                                 | `bcrypt.hash` called with correct args; hashed value stored                             |
| 10  | returns 429 when the IP has exceeded the rate limit                | After 5 attempts, 6th returns 429 with rate-limit message                               |
| 11  | returns 500 when Prisma throws an unexpected error                 | `{ message: "An unexpected error occurred…" }` + `console.error` called                 |
| 12  | returns 400 for invalid email format                               | Non-RFC email → "Please provide a valid email address."                                 |
| 13  | returns 400 for password shorter than 8 characters                 | 6-char password → "Password must be between 8 and 128 characters."                      |
| 14  | returns 400 for password without a number or special character     | All-letter password → "Password must contain at least one number or special character." |
| 15  | returns 400 for name exceeding 100 characters                      | 101-char name → "Name must be 100 characters or fewer."                                 |
| 16  | returns 400 for email longer than 255 characters                   | 259-char email → "Please provide a valid email address."                                |

---

## Suite 12 — Customer Utils

**File:** `src/tests/utils/customer-utils.test.ts`
**Source:** Logic extracted from `src/components/admin/CustomersTable.tsx`
**Strategy:** Pure unit tests. No imports, no mocks.

### `getInitials`

| #   | Test                                                       | What it verifies                              |
| --- | ---------------------------------------------------------- | --------------------------------------------- |
| 1   | returns initials from firstName and lastName               | `"Jane Doe"` → `"JD"`                         |
| 2   | returns initials from firstName only when lastName is null | `"Jane"` → `"J"`                              |
| 3   | returns initials from email when both name fields are null | `"user@example.com"` → `"UE"` (splits on `@`) |
| 4   | uppercases the initials                                    | Lowercase input → uppercase result            |
| 5   | returns at most 2 characters                               | Always ≤ 2 characters                         |

### Cents Formatting

| #   | Test                            | What it verifies                      |
| --- | ------------------------------- | ------------------------------------- |
| 6   | formats 1500 cents as 15.00     | `(1500 / 100).toFixed(2) === "15.00"` |
| 7   | formats 0 cents as 0.00         | Zero → `"0.00"`                       |
| 8   | formats 99 cents as 0.99        | Sub-dollar → `"0.99"`                 |
| 9   | rounds correctly for odd cents  | `4599` → `"45.99"`                    |
| 10  | formats large amounts correctly | `1250000` → `"12500.00"`              |

---

## Suite 13 — Admin Cleanup API

**File:** `src/tests/api/admin-cleanup.test.ts`
**Source:** `src/app/api/admin/cleanup/route.ts`
**Strategy:** `@/lib/auth` and `@/services/order.service` mocked. Verifies auth guard and delegation to `cancelStalePendingOrders`.

| #   | Test                                                             | What it verifies                                           |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | returns 401 when no session exists                               | Unauthenticated → 401 with `"Unauthorized"`                |
| 2   | returns 401 when role is CUSTOMER                                | Non-staff role → 401                                       |
| 3   | returns 200 with cancelled count for ADMIN role                  | ADMIN → 200 with `{ cancelled, message }`                  |
| 4   | returns 200 with cancelled count for TEAM role                   | TEAM → 200 (both staff roles accepted)                     |
| 5   | passes olderThanMinutes from body to cancelStalePendingOrders    | Body `{ olderThanMinutes: 60 }` → service called with `60` |
| 6   | defaults to 30 minutes when olderThanMinutes is not provided     | Missing body → service called with `30`                    |
| 7   | defaults to 30 minutes when olderThanMinutes is zero or negative | `{ olderThanMinutes: 0 }` → service called with `30`       |
| 8   | returns a human-readable message in the response                 | `message` contains count and `"stale pending orders"`      |
| 9   | uses singular 'order' when exactly 1 order is cancelled          | `cancelled: 1` → `"Cancelled 1 stale pending order."`      |

---

## Suite 14 — CustomersTable

**File:** `src/tests/components/CustomersTable.test.tsx`
**Source:** `src/components/admin/CustomersTable.tsx`
**Strategy:** React Testing Library. No router mocks required — component is pure presentational.

| #   | Test                                                                         | What it verifies                                          |
| --- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | renders customer full name when firstName and lastName are set               | `"Jane Doe"` visible in the table row                     |
| 2   | renders email as primary display when name fields are null                   | Email shown in name column when firstName/lastName absent |
| 3   | displays lifetime spend formatted as dollars                                 | `1500` cents → `"$15.00"`                                 |
| 4   | displays $0.00 for customer with zero lifetime spend                         | `0` cents → `"$0.00"`                                     |
| 5   | shows empty state when customers array is empty                              | `"No customers found"` rendered                           |
| 6   | calls onSelectCustomer with the correct customer when Details button clicked | Callback called with customer object                      |
| 7   | calls onSelectCustomer when row is clicked                                   | Row click also fires the callback                         |
| 8   | applies selected row highlight when selectedCustomerId matches               | `bg-primary` class on the matching row                    |
| 9   | renders order count badge                                                    | Badge shows `orderCount` value                            |
| 10  | renders initials avatar with first letters of name                           | `"Jane Doe"` → avatar shows `"JD"`                        |
| 11  | renders initials from email when name is null                                | `"user@example.com"` → avatar shows `"UE"`                |
| 12  | renders multiple customers                                                   | All rows visible when multiple customers passed           |

---

## Suite 15 — CustomersClient

**File:** `src/tests/components/CustomersClient.test.tsx`
**Source:** `src/components/admin/CustomersClient.tsx`
**Strategy:** RTL with `vi.useFakeTimers()` for debounce testing. `next/navigation` and `CustomerDetailPanel` mocked.

| #   | Test                                                                  | What it verifies                                         |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | renders total customer count in header                                | `"25 customers"` text rendered                           |
| 2   | disables Previous button on page 1                                    | `Prev` button disabled when `currentPage === 1`          |
| 3   | disables Next button on last page                                     | `Next` button disabled when `currentPage === totalPages` |
| 4   | calls router.push with next page when Next is clicked                 | `/admin/customers?page=2` pushed                         |
| 5   | calls router.push with prev page when Prev is clicked                 | `/admin/customers?page=1` pushed from page 2             |
| 6   | debounces search input and calls router.push with q param after 400ms | No push before 400ms; push with `?q=jane&page=1` after   |
| 7   | does not push before debounce delay completes                         | 300ms advance → no push                                  |
| 8   | removes q param when search is cleared                                | Clearing input pushes URL without `q=`                   |
| 9   | shows the detail panel when a customer is selected                    | `detail-panel` appears after clicking a customer row     |
| 10  | hides the detail panel when it is closed                              | Panel disappears after `Close Panel` clicked             |
| 11  | displays page info text                                               | `"2 / 5"` rendered for page 2 of 5                       |
| 12  | enables Next button when not on last page                             | `Next` not disabled on page 1 of 3                       |
| 13  | enables Previous button when not on first page                        | `Prev` not disabled on page 2 of 3                       |
| 14  | renders the search input field                                        | Placeholder `"Search by name or email…"` present         |

---

## Suite 16 — ShopLoginForm

**File:** `src/tests/components/ShopLoginForm.test.tsx`
**Source:** `src/app/shop/login/page.tsx`
**Strategy:** RTL. `next-auth/react` (`signIn`) and `next/navigation` mocked. Tests the login form rendered inside the shop login page.

| #   | Test                                                         | What it verifies                                                         |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1   | renders email and password fields                            | Both inputs present                                                      |
| 2   | renders email field with type="email"                        | `type="email"` attribute set                                             |
| 3   | renders a Sign In button                                     | Submit button present                                                    |
| 4   | has a link to /shop/register                                 | Register link present with correct `href`                                |
| 5   | calls signIn with email, password, and loginType: "customer" | `signIn("credentials", { ..., loginType: "customer", redirect: false })` |
| 6   | does NOT call signIn with username key                       | `callArgs` has `email`, not `username`                                   |
| 7   | redirects to /shop on successful login with no callbackUrl   | `router.push("/shop")` called after success                              |
| 8   | shows error message on invalid credentials                   | `"Invalid email or password"` shown for `CredentialsSignin` error        |
| 9   | shows error message when signIn throws                       | `"Something went wrong"` shown on network error                          |
| 10  | disables the button while loading                            | Submit button disabled while `signIn` is pending                         |

---

## Suite 17 — UserMenu

**File:** `src/tests/components/UserMenu.test.tsx`
**Source:** `src/components/shop/UserMenu.tsx`
**Strategy:** RTL. `next-auth/react` (`useSession`, `signOut`) and `next/link` mocked. Three auth-state describe blocks.

### Unauthenticated

| #   | Test                                         | What it verifies                  |
| --- | -------------------------------------------- | --------------------------------- |
| 1   | renders a Sign in link to /shop/login        | Link `href="/shop/login"` present |
| 2   | does NOT link to /api/auth/signin            | NextAuth default URL not used     |
| 3   | shows no user name or avatar when logged out | No customer name text rendered    |

### Authenticated Customer

| #   | Test                                                         | What it verifies                            |
| --- | ------------------------------------------------------------ | ------------------------------------------- |
| 4   | renders user initials in avatar                              | `"JD"` shown for Jane Doe                   |
| 5   | renders user name                                            | `"Jane Doe"` text visible                   |
| 6   | dropdown is hidden by default                                | `"My Profile"` not in DOM before click      |
| 7   | shows dropdown with profile and sign out when avatar clicked | Both items appear after click               |
| 8   | My Profile link goes to /shop/profile                        | `href="/shop/profile"` on the link          |
| 9   | does NOT show Admin Dashboard link for CUSTOMER role         | Admin link absent in customer dropdown      |
| 10  | calls signOut with callbackUrl /shop when Sign Out clicked   | `signOut({ callbackUrl: "/shop" })` called  |
| 11  | shows email in dropdown header                               | Email shown in open dropdown                |
| 12  | closes dropdown when backdrop is clicked                     | Fixed inset-0 backdrop click hides the menu |

### Authenticated Admin

| #   | Test                                          | What it verifies                                    |
| --- | --------------------------------------------- | --------------------------------------------------- |
| 13  | shows Admin Dashboard link for ADMIN role     | `href="/admin/inventory"` present in admin dropdown |
| 14  | also shows My Profile and Sign Out for admins | Both items visible                                  |
| 15  | renders correct initials for admin            | `"AU"` shown for Admin User                         |

### No Name

| #   | Test                                                     | What it verifies                   |
| --- | -------------------------------------------------------- | ---------------------------------- |
| 16  | shows first letter of email as initial when name is null | `"Z"` shown for `zara@example.com` |

---

## Suite 18 — AdminLoginPage

**File:** `src/tests/components/AdminLoginPage.test.tsx`
**Source:** `src/app/admin/login/page.tsx`
**Strategy:** RTL. Same mock setup as ShopLoginForm but asserts `loginType: "admin"` isolation and `/admin/inventory` redirect.

| #   | Test                                                                     | What it verifies                                                      |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1   | renders email and password fields                                        | Both inputs present                                                   |
| 2   | renders a submit button                                                  | Button with `"Access Dashboard"` or `"Sign In"` text present          |
| 3   | calls signIn with loginType: "admin"                                     | `signIn("credentials", { ..., loginType: "admin", redirect: false })` |
| 4   | does NOT use loginType: "customer"                                       | `callArgs.loginType` is `"admin"`, not `"customer"`                   |
| 5   | redirects to /admin/inventory after successful login with no callbackUrl | `router.push("/admin/inventory")` called after success                |
| 6   | shows error on invalid credentials                                       | `"Invalid credentials"` text shown for `CredentialsSignin` error      |

---

## Suite 19 — ThemeToggle

**File:** `src/tests/components/ThemeToggle.test.tsx`
**Source:** `src/components/ui/theme-toggle.tsx`
**Strategy:** RTL with `vi.useFakeTimers()`. `next-themes` (`useTheme`) and `lucide-react` icons mocked. `renderToStaticMarkup` used for pre-hydration test.

### Before Mount (pre-hydration)

| #   | Test                                                      | What it verifies                                            |
| --- | --------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | renders a disabled placeholder Sun button before mounting | SSR output contains `disabled` and `data-testid="sun-icon"` |

### Light Mode (mounted)

| #   | Test                                                | What it verifies                                     |
| --- | --------------------------------------------------- | ---------------------------------------------------- |
| 2   | renders a Moon icon in light mode                   | Moon icon present; Sun icon absent after `useEffect` |
| 3   | has aria-label "Switch to dark mode" in light mode  | Button accessible with correct label                 |
| 4   | button is not disabled after mounting in light mode | Button enabled post-hydration                        |
| 5   | calls setTheme('dark') when clicked in light mode   | `setTheme` called once with `"dark"`                 |

### Dark Mode (mounted)

| #   | Test                                               | What it verifies                      |
| --- | -------------------------------------------------- | ------------------------------------- |
| 6   | renders a Sun icon in dark mode                    | Sun icon present; Moon icon absent    |
| 7   | has aria-label "Switch to light mode" in dark mode | Button accessible with correct label  |
| 8   | button is not disabled after mounting in dark mode | Button enabled post-hydration         |
| 9   | calls setTheme('light') when clicked in dark mode  | `setTheme` called once with `"light"` |

### Accessibility

| #   | Test                                                        | What it verifies                             |
| --- | ----------------------------------------------------------- | -------------------------------------------- |
| 10  | button is accessible with correct aria-label for light mode | `getByRole('button', { name: '...' })` works |
| 11  | button is accessible with correct aria-label for dark mode  | `getByRole('button', { name: '...' })` works |

---

## Mocking Strategy

| Module                                                            | Mock approach                                                      | Used in                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `@/lib/prisma`                                                    | `vi.mock` factory with inline `vi.fn()` per method                 | `dashboard-service`, `customer-service`, `buylist-service`, `register` tests |
| `@/repositories/*`                                                | `vi.mock` factory with static method stubs                         | `order-service`, `stripe-service` tests                                      |
| `@/services/order.service`                                        | `vi.mock` factory                                                  | `stripe-webhook` test                                                        |
| `@/services/email.service`                                        | `vi.mock` factory                                                  | `order-service`, `stripe-service`, `checkout` tests                          |
| `stripe`                                                          | `vi.mock` constructor returning mock session/webhook methods       | `stripe-service`, `stripe-webhook` tests                                     |
| `next/headers`                                                    | `vi.mock` returning `vi.fn()`; configured per test in `beforeEach` | `stripe-webhook`, `register` tests                                           |
| `next/cache` (`revalidatePath`)                                   | `vi.mock`                                                          | `checkout` test                                                              |
| `@/lib/auth` (`auth`)                                             | `vi.mock`                                                          | `checkout` test                                                              |
| `next-auth/jwt` (`getToken`)                                      | `vi.mock`                                                          | `middleware` test                                                            |
| `nodemailer`                                                      | `vi.hoisted` + `vi.mock`                                           | `email-service` test                                                         |
| `@react-email/render`                                             | `vi.mock` returning static HTML                                    | `email-service` test                                                         |
| `bcryptjs`                                                        | `vi.mock` with `mockResolvedValue`                                 | `register` test                                                              |
| `next-auth/react` (`signIn`, `useSession`, `signOut`)             | `vi.mock` factory with `vi.fn()` stubs                             | `ShopLoginForm`, `UserMenu`, `AdminLoginPage` tests                          |
| `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) | `vi.mock` returning mock implementations                           | `CustomersClient`, `ShopLoginForm`, `AdminLoginPage` tests                   |
| `next/link`                                                       | `vi.mock` rendering a plain `<a>` tag                              | `ShopLoginForm`, `UserMenu`, `AdminLoginPage` tests                          |
| `next-themes` (`useTheme`)                                        | `vi.mock` with `vi.fn()` configured per test                       | `ThemeToggle` test                                                           |
| `lucide-react` (Sun, Moon)                                        | `vi.mock` returning `<svg data-testid>` elements                   | `ThemeToggle` test                                                           |
| `CustomerDetailPanel`                                             | `vi.mock` rendering a minimal stub with close button               | `CustomersClient` test                                                       |
| `@/lib/auth` (`auth`)                                             | `vi.mock` with `vi.fn()` returning session fixtures                | `admin-cleanup` test                                                         |

---

## What Is Not Covered

| Area                      | Reason not covered                                                    | Suggested approach                                           |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `auth.ts` NextAuth config | Requires a real DB or complex Prisma mock for the full authorize flow | Integration test with an in-memory SQLite DB                 |
| Shop checkout flow (E2E)  | Requires live Stripe mock + browser session                           | Playwright with Stripe test mode                             |
| E2E auth flow             | Full browser login/redirect cycle                                     | Playwright with test DB                                      |
| Dashboard page component  | Server component with async data — cannot render in jsdom             | RTL with mocked `getDashboardStats` action, or Playwright    |
| `CustomerDetailPanel`     | Requires mocking a server action                                      | MSW handler for server action fetch                          |
| `AdminSidebar`            | Requires `useSession` and `usePathname` mocks                         | Same pattern as `UserMenu.test.tsx`                          |
| Other mapper files        | `order.mapper`, `customer.mapper`, `catalog.mapper`, `ledger.mapper`  | Pure unit tests — same pattern as `inventory.mapper.test.ts` |
