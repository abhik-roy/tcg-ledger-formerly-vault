# Catalog Module

## Purpose
Read-only card catalog seeded from external APIs (Scryfall for Magic, Pokemon TCG API for Pokemon). Used as a reference when adding cards to inventory.

## Exported Functions

### Service (`catalog.service.ts`)
| Method | Description |
|--------|-------------|
| `searchCatalog(page, query)` | Paginated catalog search with DTO mapping |

### Repository (`catalog.repository.ts`)
| Method | Description |
|--------|-------------|
| `searchByName(query, limit)` | Search by name (case-insensitive) |
| `findById(id)` | Find by primary key |
| `findByNameAndNumber(name, collectorNumber)` | Find by name + optional collector number |
| `findManyPaginated(params)` | Paginated browse/search |

## Key Types
- `CatalogCardDTO` -- `{ id, name, set, collectorNumber, rarity, image, price, quantity }`
- `CatalogSearchResultDTO` -- `{ id, name, set, collectorNumber, rarity, image }`

## Business Rules
- Catalog is read-only in normal flow (populated by external seed scripts)
- Page size is 24 (optimized for 4x6 grid layout)
- When no query is provided, results are ordered by set descending (newest first)
- When query is provided, results are ordered by name ascending
