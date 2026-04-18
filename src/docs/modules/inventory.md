# Inventory Module

## Purpose
CRUD operations for the store's trading card inventory. Supports paginated listing with multi-dimensional filtering, catalog-based card addition, CSV import, inline stock/price editing, and set-based filter dropdowns with caching.

## Exported Functions

### Controller (`actions/inventory.ts`)
| Function | Auth | Description |
|----------|------|-------------|
| `getInventory(page, query, filters)` | None | Paginated inventory listing (admin table) |
| `getCards({ page, query, filters, sort })` | None | Paginated listing for shop (in-stock only) |
| `addInventoryItemAction(input)` | Staff | Add item from catalog |
| `updateQuickStock(id, qty, price)` | Staff | Update stock quantity and price |
| `searchCatalogAction(query)` | Staff | Search card catalog |
| `importInventoryAction(rows)` | Staff | Import from CSV parsed rows |
| `updateBuylistItemAction(data)` | Staff | Update buylist targets |
| `getLedgerEntries(limit)` | Staff | Get combined ledger entries |
| `getCardLedgerAction(cardName)` | Staff | Get ledger entries for a card |
| `bulkImportAction(items)` | Staff | Bulk import from structured array |
| `getOrderForLedgerEntry(cardName, logTime, userSource)` | Staff | Find order linked to ledger entry |

### Service (`inventory.service.ts`)
| Method | Description |
|--------|-------------|
| `getAllSets(game?)` | Cached set filter options (1hr TTL) |
| `getDashboardData(page, query, filters)` | Full DTO-mapped paginated listing |
| `getBasicInventory(page, query, filters)` | Legacy paginated listing |
| `addItem(input, updateType)` | Add from catalog with duplicate detection |
| `getOverviewStats()` | Aggregate inventory statistics |
| `updateStock(id, quantity, price)` | Update with audit logging |
| `searchCatalog(query)` | Search catalog cards |
| `addItemFromCSV(name, collectorNumber, input)` | Import via name lookup |
| `updateBuylistTargets(id, data)` | Update buylist fields |

### Repository (`inventory.repository.ts`)
| Method | Description |
|--------|-------------|
| `findMany(params)` | Paginated inventory query |
| `findManyBasic(params)` | Paginated query (basic fields) |
| `findById(id)` | Find by primary key |
| `findByIdForStockUpdate(id)` | Minimal fields for stock update |
| `findByCardIdentity(criteria)` | Find by name/set/condition/finish |
| `create(data)` | Create new inventory row |
| `update(id, data)` | Update inventory row |
| `incrementQuantity(id, amount, price?)` | Increment quantity |
| `updateBuylistTargets(id, data)` | Update buylist fields |
| `groupBySet(game?)` | Group by set name |
| `getOverviewAggregates()` | Aggregate stats |
| `findForPOS(where, take)` | POS search query |
| `findBuylistItems(params)` | Buylist pagination + raw SQL stats |
| `getBuylistStats()` | Buylist overview stats |

## Key Types
- `InventoryItemDTO` -- Full inventory item (16 fields including buylist)
- `InventoryResponse` -- Paginated wrapper `{ data, total, totalPages }`
- `CreateInventoryInput` -- Input for adding items `{ cardId, quantity, price, condition, finish }`
- `InventoryFilters` -- Filter options `{ rarity, condition, game, set, inStockOnly, sort }`
- `InventoryRow` -- Raw DB row type

## Business Rules
- Quantity must be >= 1 when adding items
- Card must exist in catalog before being added to inventory
- Duplicate detection: if same name/set/condition/finish exists, quantity is incremented
- All stock changes are logged to `quantityLog` via LoggingService
- All price changes are logged to `priceLog` via LoggingService
- Set filter options are cached for 1 hour via `unstable_cache`
- Prices are always in cents (integers)
