# Dashboard Module

## Purpose
Admin home page analytics. Aggregates data from orders, inventory, and customers into a single stats payload. Includes revenue charts, recent orders, top sellers, and low stock alerts.

## Exported Functions

### Controller (`actions/dashboard.ts`)
| Function | Auth | Description |
|----------|------|-------------|
| `getDashboardStats(chartDays)` | Staff | Get all dashboard stats |

### Service (`dashboard.service.ts`)
| Method | Description |
|--------|-------------|
| `getStats(chartDays)` | 8-query parallel aggregation |

## Key Types
- `DashboardStatsDTO` -- Top-level wrapper
- `DashboardOverviewStatsDTO` -- `{ totalRevenue, totalOrders, pendingOrders, totalCustomers, totalInventoryItems, avgOrderValue }`
- `RecentOrderDTO` -- `{ id, customerEmail, totalAmount, status, fulfillment, createdAt, itemCount }`
- `TopSellerDTO` -- `{ name, setName, totalSold, revenue }`
- `RevenueChartPointDTO` -- `{ date, value }`
- `LowStockItemDTO` -- Items where quantity < idealQuantity

## Business Rules
- All 8 DB queries run in parallel via `Promise.all` for performance
- Revenue excludes CANCELLED orders
- Average order value = totalRevenue / totalOrders (0 if no orders)
- Chart data is pre-grouped by date with O(1) lookups
- Low stock is defined as items where `idealQuantity > 0` AND `quantity < idealQuantity`
- Low stock items are ordered by deficit (idealQuantity - quantity) descending
- Chart defaults to 7 days but accepts a configurable range
