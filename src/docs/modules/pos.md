# POS (Point of Sale) Module

## Purpose
In-store register terminal for walk-in customers. Supports inventory search, cart building, order creation with transactional stock management, cash change calculation, and PIN-protected exit.

## Exported Functions

### Controller (`actions/pos.ts`)
| Function | Auth | Description |
|----------|------|-------------|
| `searchPOSInventory(query)` | Staff | Search in-stock items for POS |
| `createPOSOrderAction(params)` | Staff | Create POS order with stock updates |
| `verifyPOSPinAction(pin)` | Staff | Verify POS exit PIN |

### Service (`pos.service.ts`)
| Method | Description |
|--------|-------------|
| `searchInventory(query)` | Search with DTO mapping |
| `createOrder(params)` | Transactional order creation |
| `verifyExitPin(pin)` | PIN verification |

## Key Types
- `POSInventoryItem` -- `{ id, name, setName, condition, finish, price, quantity, image }`
- `CreatePOSOrderParams` -- `{ items, customerEmail?, paymentMethod, amountPaid? }`
- `CreatePOSOrderResult` -- `{ success, orderId?, change?, error? }`
- `POSOrderItem` -- `{ inventoryId, name, setName, condition, finish, price, quantity }`

## Business Rules
- Only in-stock items (quantity > 0) are shown
- Search requires minimum 2 characters; otherwise shows all in-stock items (up to 48)
- Orders are created in a database transaction: verify stock, create order, decrement quantities
- Walk-in customers use the email "walkin@pos.local"
- POS orders are always status "PAID" and fulfillment "PICKUP"
- Payment methods: "CASH" or "CARD"
- Cash change is calculated when amountPaid is provided
- Quantity logs are written outside the transaction (parallel, non-blocking)
- POS exit PIN is checked against DB settings first, then env var, then default "1234"
