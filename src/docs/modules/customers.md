# Customers Module

## Purpose
Customer listing, order history retrieval, and aggregate statistics for the admin customer management page.

## Exported Functions

### Controller (`actions/customers.ts`)
| Function | Auth | Description |
|----------|------|-------------|
| `getCustomers(page, query)` | Staff | Paginated customer listing |
| `getCustomerOrders(customerId, customerEmail)` | Staff | All orders for a customer |
| `getOrderItemLedger(cardName, customerEmail, orderCreatedAt)` | Staff | Ledger entries for order item |
| `getCustomerStats()` | Staff | Aggregate customer statistics |

### Service (`customer.service.ts`)
| Method | Description |
|--------|-------------|
| `getPaginatedCustomers(page, query)` | Paginated with order counts and lifetime spend |
| `getOrdersForCustomer(customerId, customerEmail)` | Customer order history |
| `getLedgerEntriesForItem(cardName, customerEmail, orderCreatedAt)` | Ledger correlation |
| `getOverviewStats()` | Total customers, revenue, avg order value |

### Repository (`customer.repository.ts`)
| Method | Description |
|--------|-------------|
| `findManyPaginated(params)` | Paginated with order aggregates |
| `findOrdersByCustomer(customerId, customerEmail)` | Orders by customer ID or email |
| `count()` | Total customer count |

## Key Types
- `CustomerWithStats` -- `{ id, email, firstName, lastName, createdAt, orderCount, lifetimeSpend }`
- `CustomerOverviewStats` -- `{ totalCustomers, totalRevenue, avgOrderValue }`

## Business Rules
- Customers are searched by email, first name, or last name
- Lifetime spend is computed as sum of all order totalAmounts
- Average order value excludes CANCELLED orders
- Ledger correlation uses a +/-5 minute time window around order creation
