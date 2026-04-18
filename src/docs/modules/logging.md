# Logging (Ledger) Module

## Purpose
Immutable audit trail for all inventory stock and price changes. Every mutation to quantity or price creates a log entry. The ledger supports the admin Ledger page, card-level audit history, and order correlation.

## Exported Functions

### Service (`logging.service.ts`)
| Method | Description |
|--------|-------------|
| `logQuantity(cardName, amount, user, foilType)` | Log a quantity change |
| `logPrice(cardName, oldPrice, newPrice, user, foilType)` | Log a price change |
| `getLedgerEntries(limit)` | Combined quantity + price log entries |
| `getCardLedger(cardName)` | Ledger entries for a specific card |
| `getOrderForLedgerEntry(cardName, logTime, userSource)` | Find linked order |

### Repository (`log.repository.ts`)
| Method | Description |
|--------|-------------|
| `createQuantityLog(data)` | Insert quantity log |
| `createQuantityLogInTransaction(tx, data)` | Insert within transaction |
| `createPriceLog(data)` | Insert price log |
| `findRecentQuantityLogs(limit)` | Recent quantity logs |
| `findRecentPriceLogs(limit)` | Recent price logs |
| `findQuantityLogsByCard(cardName, limit)` | Logs for specific card |
| `findPriceLogsByCard(cardName, limit)` | Price logs for specific card |
| `findForCustomerOrderItem(params)` | Time-window ledger correlation |

## Key Types
- `LedgerEntry` -- `{ id, type, cardName, user, time, foilType, amount?, oldPrice?, newPrice? }`
- `LedgerOrderDetail` -- `{ id, customerEmail, totalAmount, status, paymentMethod, fulfillment, createdAt, items }`

## Business Rules
- Log entries are append-only (never updated or deleted)
- The `user` field identifies the source: "Admin Manual Update", "POS Sale", "CSV Import", "CUSTOMER: email", "STRIPE: email"
- The `amount` field is the delta (positive = added, negative = removed)
- Order correlation uses a +/-5 minute time window and matches by customer email and card name
- Logs have composite IDs: `qty-{id}` or `price-{id}` for React key uniqueness
