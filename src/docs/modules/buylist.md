# Buylist Module

## Purpose
Manages the store's buy-side operations. Defines which cards the store wants to buy, at what price, and tracks current stock levels against buy targets. The buylist is a view over the inventory table using `idealQuantity`, `maxQuantity`, and `buyPrice` fields.

## Exported Functions

### Controller (`actions/buylist.ts`)
| Function | Auth | Description |
|----------|------|-------------|
| `getBuylistItems(page, query, filters)` | Staff | Paginated buylist with stats |
| `updateBuylistItem(data)` | Staff | Update buylist targets |

### Service (`buylist.service.ts`)
| Method | Description |
|--------|-------------|
| `getPaginatedItems(page, query, filters)` | Paginated buylist with inline stats |
| `getOverviewStats()` | Aggregate buylist statistics |
| `computeStats(rows)` | Pure function for stats computation |

## Key Types
- `BuylistItemDTO` -- `{ id, cardName, setName, condition, finish, image, currentStock, storePrice, buyPrice, idealQuantity, maxQuantity }`
- `BuylistOverviewStats` -- `{ totalOnBuylist, needingRestock, atCapacity }`
- `BuylistResponse` -- `{ data, total, totalPages, stats }`
- `BuylistFilters` -- `{ game?, set?, rarity?, status? }`

## Business Rules
- Items ordered by urgency: highest idealQuantity first, lowest stock second
- Status filters: `"buying"` (idealQuantity > 0), `"not_set"` (idealQuantity = 0)
- Stats computed via raw SQL `COUNT(*) FILTER` for performance
- `computeStats()` is a pure function for unit testing without DB
- All monetary values (buyPrice, storePrice) in cents
