import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({
  unstable_cache: (_fn: unknown) => _fn,
  revalidateTag: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    customer: { count: vi.fn() },
    inventory: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    orderItem: { groupBy: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

import { DashboardService } from "@/services/dashboard.service"
import { prisma } from "@/lib/prisma"

// ── Typed helpers ─────────────────────────────────────────────────────────────
const mockOrderAggregate = prisma.order.aggregate as ReturnType<typeof vi.fn>
const mockOrderGroupBy = prisma.order.groupBy as ReturnType<typeof vi.fn>
const mockOrderFindMany = prisma.order.findMany as ReturnType<typeof vi.fn>
const mockCustomerCount = prisma.customer.count as ReturnType<typeof vi.fn>
const mockInventoryCount = prisma.inventory.count as ReturnType<typeof vi.fn>
const mockQueryRaw = prisma.$queryRaw as ReturnType<typeof vi.fn>
const mockOrderItemGroupBy = prisma.orderItem.groupBy as ReturnType<typeof vi.fn>

function makeDate(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d
}

function setupDefaultMocks() {
  mockOrderAggregate.mockResolvedValue({ _sum: { totalAmount: 50000 } })
  mockOrderGroupBy.mockResolvedValue([
    { status: "PENDING", _count: { id: 3 } },
    { status: "COMPLETED", _count: { id: 7 } },
  ])
  mockCustomerCount.mockResolvedValue(42)
  mockInventoryCount.mockResolvedValue(350)
  mockOrderFindMany
    .mockResolvedValueOnce([
      {
        id: "order1",
        customerEmail: "alice@example.com",
        totalAmount: 2000,
        status: "PENDING",
        fulfillment: "PICKUP",
        createdAt: new Date(),
        _count: { items: 2 },
      },
    ])
    .mockResolvedValueOnce([
      { createdAt: makeDate(0), totalAmount: 1500 },
      { createdAt: makeDate(1), totalAmount: 3000 },
    ])
  mockOrderItemGroupBy.mockResolvedValue([
    { name: "Black Lotus", setName: "Alpha", _sum: { quantity: 5, price: 100000 } },
    { name: "Mox Ruby", setName: "Alpha", _sum: { quantity: 3, price: 60000 } },
  ])
  mockQueryRaw.mockResolvedValue([
    {
      id: 1,
      name: "Dark Ritual",
      setname: "Alpha",
      condition: "NM",
      storeprice: 500,
      quantity: 1,
      imagenormal: null,
      imagesmall: null,
      idealQuantity: 4,
    },
  ])
}

// ── Suite ─────────────────────────────────────────────────────────────────────
describe("DashboardService.getStats", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  describe("overview stats", () => {
    it("returns totalRevenue from the aggregate sum", async () => {
      const result = await DashboardService.getStats()
      expect(result.overview.totalRevenue).toBe(50000)
    })

    it("returns 0 totalRevenue when aggregate returns null", async () => {
      mockOrderAggregate.mockResolvedValue({ _sum: { totalAmount: null } })
      const result = await DashboardService.getStats()
      expect(result.overview.totalRevenue).toBe(0)
    })

    it("sums all status counts for totalOrders", async () => {
      const result = await DashboardService.getStats()
      expect(result.overview.totalOrders).toBe(10) // 3 + 7
    })

    it("extracts pendingOrders from the PENDING status count", async () => {
      const result = await DashboardService.getStats()
      expect(result.overview.pendingOrders).toBe(3)
    })

    it("returns 0 pendingOrders when there are no PENDING orders", async () => {
      mockOrderGroupBy.mockResolvedValue([{ status: "COMPLETED", _count: { id: 5 } }])
      const result = await DashboardService.getStats()
      expect(result.overview.pendingOrders).toBe(0)
    })

    it("returns totalCustomers from customer.count", async () => {
      const result = await DashboardService.getStats()
      expect(result.overview.totalCustomers).toBe(42)
    })

    it("returns totalInventoryItems from inventory.count", async () => {
      const result = await DashboardService.getStats()
      expect(result.overview.totalInventoryItems).toBe(350)
    })

    it("calculates avgOrderValue as revenue divided by totalOrders", async () => {
      // 50000 / 10 = 5000 cents
      const result = await DashboardService.getStats()
      expect(result.overview.avgOrderValue).toBe(5000)
    })

    it("returns 0 avgOrderValue when there are no orders (division-by-zero guard)", async () => {
      mockOrderGroupBy.mockResolvedValue([])
      const result = await DashboardService.getStats()
      expect(result.overview.avgOrderValue).toBe(0)
    })
  })

  describe("recentOrders", () => {
    it("maps customerEmail, totalAmount, status, fulfillment, and itemCount", async () => {
      const result = await DashboardService.getStats()
      expect(result.recentOrders).toHaveLength(1)
      const order = result.recentOrders[0]
      expect(order.customerEmail).toBe("alice@example.com")
      expect(order.totalAmount).toBe(2000)
      expect(order.status).toBe("PENDING")
      expect(order.itemCount).toBe(2)
    })

    it("returns an empty array when there are no orders", async () => {
      mockOrderFindMany.mockReset()
      mockOrderFindMany
        .mockResolvedValueOnce([]) // recent orders
        .mockResolvedValueOnce([]) // chart orders
      const result = await DashboardService.getStats()
      expect(result.recentOrders).toEqual([])
    })
  })

  describe("topSellers", () => {
    it("maps name, setName, totalSold, and revenue correctly", async () => {
      const result = await DashboardService.getStats()
      expect(result.topSellers[0].name).toBe("Black Lotus")
      expect(result.topSellers[0].setName).toBe("Alpha")
      expect(result.topSellers[0].totalSold).toBe(5)
      expect(result.topSellers[0].revenue).toBe(100000)
    })

    it("returns 0 for totalSold and revenue when _sum values are null", async () => {
      mockOrderItemGroupBy.mockResolvedValue([
        { name: "Test Card", setName: "TestSet", _sum: { quantity: null, price: null } },
      ])
      const result = await DashboardService.getStats()
      expect(result.topSellers[0].totalSold).toBe(0)
      expect(result.topSellers[0].revenue).toBe(0)
    })

    it("returns an empty array when there are no order items", async () => {
      mockOrderItemGroupBy.mockResolvedValue([])
      const result = await DashboardService.getStats()
      expect(result.topSellers).toEqual([])
    })
  })

  describe("chartData", () => {
    it("returns 7 data points for the default 7-day window", async () => {
      const result = await DashboardService.getStats()
      expect(result.chartData).toHaveLength(7)
    })

    it("returns the correct number of points when a custom day count is passed", async () => {
      mockOrderFindMany.mockReset()
      mockOrderFindMany
        .mockResolvedValueOnce([]) // recent orders
        .mockResolvedValueOnce([]) // chart orders
      const result = await DashboardService.getStats(30)
      expect(result.chartData).toHaveLength(30)
    })

    it("sums today's revenue into the last chart point", async () => {
      const result = await DashboardService.getStats()
      const todayPoint = result.chartData[result.chartData.length - 1]
      expect(todayPoint.value).toBe(1500)
    })

    it("sets maxChartValue to the highest daily total", async () => {
      const result = await DashboardService.getStats()
      expect(result.maxChartValue).toBe(3000)
    })

    it("returns maxChartValue of 1 when all days have zero revenue (SVG divide-by-zero guard)", async () => {
      mockOrderFindMany.mockReset()
      mockOrderFindMany
        .mockResolvedValueOnce([]) // recent orders
        .mockResolvedValueOnce([]) // chart orders — empty, so all days are 0
      const result = await DashboardService.getStats()
      expect(result.maxChartValue).toBe(1)
    })
  })

  describe("lowStock", () => {
    it("returns mapped low stock items with the correct shape", async () => {
      const result = await DashboardService.getStats()
      expect(result.lowStock).toHaveLength(1)
      const item = result.lowStock[0]
      expect(item.name).toBe("Dark Ritual")
      expect(item.storeprice).toBe(500)
      expect(item.quantity).toBe(1)
    })

    it("returns an empty array when no high-value items are low stock", async () => {
      mockQueryRaw.mockResolvedValue([])
      const result = await DashboardService.getStats()
      expect(result.lowStock).toEqual([])
    })
  })
})
