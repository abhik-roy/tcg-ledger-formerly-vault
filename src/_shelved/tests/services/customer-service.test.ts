/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { CustomerService } from "@/services/customer.service"

// Mock the prisma module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    quantityLog: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

// Helper to create a mock customer (as returned by prisma.customer.findMany
// after DEV-46 — no longer includes orders relation, only _count)
function makeMockCustomer(overrides: any = {}) {
  const orderCount = overrides._count?.orders ?? overrides.orderCount ?? 2
  return {
    id: overrides.id ?? "cust-1",
    email: overrides.email ?? "test@example.com",
    firstName: overrides.firstName ?? "Jane",
    lastName: overrides.lastName ?? "Doe",
    createdAt: overrides.createdAt ?? new Date("2024-01-01"),
    updatedAt: overrides.updatedAt ?? new Date("2024-01-01"),
    _count: { orders: orderCount },
    ...overrides,
  }
}

describe("CustomerService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getPaginatedCustomers", () => {
    it("maps customer data with correct orderCount and lifetimeSpend", async () => {
      const mockCustomer = makeMockCustomer()
      vi.mocked(prisma.customer.findMany).mockResolvedValue([mockCustomer] as any)
      vi.mocked(prisma.customer.count).mockResolvedValue(1)
      vi.mocked(prisma.order.groupBy).mockResolvedValue([
        { customerId: "cust-1", _sum: { totalAmount: 4000 } },
      ] as any)

      const result = await CustomerService.getPaginatedCustomers(1)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].orderCount).toBe(2)
      expect(result.data[0].lifetimeSpend).toBe(4000) // from groupBy aggregate
      expect(result.total).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it("builds OR where clause when query is provided", async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])
      vi.mocked(prisma.customer.count).mockResolvedValue(0)
      vi.mocked(prisma.order.groupBy).mockResolvedValue([] as any)

      await CustomerService.getPaginatedCustomers(1, "jane")

      const findManyCall = vi.mocked(prisma.customer.findMany).mock.calls[0][0]
      expect(findManyCall?.where?.OR).toBeDefined()
      expect(findManyCall?.where?.OR).toHaveLength(3)
    })

    it("does not include OR clause when query is empty", async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])
      vi.mocked(prisma.customer.count).mockResolvedValue(0)
      vi.mocked(prisma.order.groupBy).mockResolvedValue([] as any)

      await CustomerService.getPaginatedCustomers(1)

      const findManyCall = vi.mocked(prisma.customer.findMany).mock.calls[0][0]
      expect(findManyCall?.where?.OR).toBeUndefined()
    })

    it("calculates correct skip for page 2", async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])
      vi.mocked(prisma.customer.count).mockResolvedValue(0)
      vi.mocked(prisma.order.groupBy).mockResolvedValue([] as any)

      await CustomerService.getPaginatedCustomers(2)

      const findManyCall = vi.mocked(prisma.customer.findMany).mock.calls[0][0]
      expect(findManyCall?.skip).toBe(20) // page 2 * pageSize 20
    })

    it("returns 0 lifetimeSpend for customer with no orders", async () => {
      const mockCustomer = makeMockCustomer({ _count: { orders: 0 } })
      vi.mocked(prisma.customer.findMany).mockResolvedValue([mockCustomer] as any)
      vi.mocked(prisma.customer.count).mockResolvedValue(1)
      // groupBy returns empty — no orders for this customer
      vi.mocked(prisma.order.groupBy).mockResolvedValue([] as any)

      const result = await CustomerService.getPaginatedCustomers(1)

      expect(result.data[0].orderCount).toBe(0)
      expect(result.data[0].lifetimeSpend).toBe(0)
    })

    it("calculates correct totalPages", async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])
      vi.mocked(prisma.customer.count).mockResolvedValue(45)
      vi.mocked(prisma.order.groupBy).mockResolvedValue([] as any)

      const result = await CustomerService.getPaginatedCustomers(1)

      expect(result.totalPages).toBe(3) // ceil(45/20) = 3
    })

    it("uses groupBy aggregate to compute lifetime spend per customer", async () => {
      const cust1 = makeMockCustomer({ id: "cust-1", _count: { orders: 3 } })
      const cust2 = makeMockCustomer({
        id: "cust-2",
        email: "b@example.com",
        _count: { orders: 1 },
      })
      vi.mocked(prisma.customer.findMany).mockResolvedValue([cust1, cust2] as any)
      vi.mocked(prisma.customer.count).mockResolvedValue(2)
      vi.mocked(prisma.order.groupBy).mockResolvedValue([
        { customerId: "cust-1", _sum: { totalAmount: 7500 } },
        { customerId: "cust-2", _sum: { totalAmount: 2000 } },
      ] as any)

      const result = await CustomerService.getPaginatedCustomers(1)

      expect(result.data[0].lifetimeSpend).toBe(7500)
      expect(result.data[1].lifetimeSpend).toBe(2000)

      // Verify groupBy was called with the correct customer IDs
      const groupByCall = vi.mocked(prisma.order.groupBy).mock.calls[0][0] as any
      expect(groupByCall.by).toEqual(["customerId"])
      expect(groupByCall.where.customerId.in).toEqual(["cust-1", "cust-2"])
    })
  })

  describe("getOrdersForCustomer", () => {
    it("queries by both customerId and customerEmail using OR", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([])
      vi.mocked(prisma.order.count).mockResolvedValue(0)

      await CustomerService.getOrdersForCustomer("cust-1", "test@example.com")

      const call = vi.mocked(prisma.order.findMany).mock.calls[0][0]
      expect(call?.where?.OR).toEqual([
        { customerId: "cust-1" },
        { customerEmail: "test@example.com" },
      ])
    })

    it("includes items in the query", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([])
      vi.mocked(prisma.order.count).mockResolvedValue(0)

      await CustomerService.getOrdersForCustomer("cust-1", "test@example.com")

      const call = vi.mocked(prisma.order.findMany).mock.calls[0][0]
      expect(call?.include?.items).toBe(true)
    })

    it("returns paginated result with total and hasMore", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([{ id: "order-1" }] as any)
      vi.mocked(prisma.order.count).mockResolvedValue(25)

      const result = await CustomerService.getOrdersForCustomer("cust-1", "test@example.com", 1, 20)

      expect(result.orders).toHaveLength(1)
      expect(result.total).toBe(25)
      expect(result.hasMore).toBe(true)
    })

    it("returns hasMore=false when all orders fit on one page", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([{ id: "order-1" }] as any)
      vi.mocked(prisma.order.count).mockResolvedValue(1)

      const result = await CustomerService.getOrdersForCustomer("cust-1", "test@example.com", 1, 20)

      expect(result.hasMore).toBe(false)
    })

    it("applies correct skip for page 2", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([])
      vi.mocked(prisma.order.count).mockResolvedValue(0)

      await CustomerService.getOrdersForCustomer("cust-1", "test@example.com", 2, 20)

      const call = vi.mocked(prisma.order.findMany).mock.calls[0][0]
      expect(call?.skip).toBe(20)
    })
  })

  describe("getOverviewStats", () => {
    it("returns 0 avgOrderValue when there are no orders", async () => {
      vi.mocked(prisma.customer.count).mockResolvedValue(5)
      vi.mocked(prisma.order.aggregate).mockResolvedValue({ _sum: { totalAmount: null } } as any)
      vi.mocked(prisma.order.count).mockResolvedValue(0)

      const result = await CustomerService.getOverviewStats()

      expect(result.avgOrderValue).toBe(0)
      expect(result.totalRevenue).toBe(0)
      expect(result.totalCustomers).toBe(5)
    })

    it("calculates avgOrderValue correctly", async () => {
      vi.mocked(prisma.customer.count).mockResolvedValue(10)
      vi.mocked(prisma.order.aggregate).mockResolvedValue({ _sum: { totalAmount: 30000 } } as any)
      vi.mocked(prisma.order.count).mockResolvedValue(3)

      const result = await CustomerService.getOverviewStats()

      expect(result.totalRevenue).toBe(30000)
      expect(result.avgOrderValue).toBe(10000) // 30000 / 3 = 10000 cents = $100
    })

    it("excludes CANCELLED orders from revenue calculation", async () => {
      vi.mocked(prisma.customer.count).mockResolvedValue(5)
      vi.mocked(prisma.order.aggregate).mockResolvedValue({ _sum: { totalAmount: 5000 } } as any)
      vi.mocked(prisma.order.count).mockResolvedValue(1)

      await CustomerService.getOverviewStats()

      // Verify the aggregate call filters out CANCELLED status
      const aggregateCall = vi.mocked(prisma.order.aggregate).mock.calls[0][0]
      expect(aggregateCall?.where?.status).toEqual({ not: "CANCELLED" })
    })
  })

  describe("getLedgerEntriesForItem", () => {
    it("queries within 5-minute window around order time", async () => {
      vi.mocked(prisma.quantityLog.findMany).mockResolvedValue([])
      const orderDate = new Date("2024-06-01T12:00:00.000Z")

      await CustomerService.getLedgerEntriesForItem("Black Lotus", "test@example.com", orderDate)

      const call = vi.mocked(prisma.quantityLog.findMany).mock.calls[0][0]
      const timeFilter = call?.where?.time as { gte: Date; lte: Date }
      const expectedStart = new Date(orderDate.getTime() - 5 * 60 * 1000)
      const expectedEnd = new Date(orderDate.getTime() + 5 * 60 * 1000)

      expect(timeFilter.gte.getTime()).toBe(expectedStart.getTime())
      expect(timeFilter.lte.getTime()).toBe(expectedEnd.getTime())
    })

    it("only retrieves negative quantity changes (sales)", async () => {
      vi.mocked(prisma.quantityLog.findMany).mockResolvedValue([])

      await CustomerService.getLedgerEntriesForItem("Black Lotus", "test@example.com", new Date())

      const call = vi.mocked(prisma.quantityLog.findMany).mock.calls[0][0]
      expect((call?.where as any)?.amount).toEqual({ lt: 0 })
    })
  })
})
