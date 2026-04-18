import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (_fn: unknown) => _fn,
}))

vi.mock("@/services/email.service", () => ({
  EmailService: {
    sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock("@/services/settings.service", () => ({
  SettingsService: {
    getSettings: vi.fn().mockResolvedValue({
      taxRate: 8,
      standardShippingRate: 499,
      shippingEnabled: true,
    }),
  },
}))

import { placeInStoreOrder } from "@/app/actions/checkout"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { EmailService } from "@/services/email.service"

const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>
const mockAuth = auth as ReturnType<typeof vi.fn>
const mockRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>
const mockSendOrderConfirmation = EmailService.sendOrderConfirmation as ReturnType<typeof vi.fn>

// --- Fixtures ---
const baseOrderData = {
  customerEmail: "buyer@example.com",
  items: [
    {
      id: 1,
      name: "Black Lotus",
      cartQuantity: 2,
      storeprice: 5000,
      setname: "Alpha",
      condition: "NM",
      finish: "nonfoil",
    },
  ],
  subtotal: 10000,
  tax: 800,
  total: 10800,
}

/** Inventory rows now include storeprice for server-side total recalculation (DEV-16) */
const inventoryRows = [
  { id: 1, name: "Black Lotus", quantity: 10, finish: "nonfoil", storeprice: 5000 },
]

const customerSession = { user: { id: "cust-42", role: "CUSTOMER" } }

describe("placeInStoreOrder", () => {
  beforeEach(() => vi.clearAllMocks())

  function setupTransaction(
    overrides?: Partial<{
      inventoryRows: {
        id: number
        name: string
        quantity: number
        finish: string
        storeprice: number
      }[]
      orderResult: { id: string }
    }>
  ) {
    const rows = overrides?.inventoryRows ?? inventoryRows
    const orderResult = overrides?.orderResult ?? { id: "order-123" }

    const mockTx = {
      // DEV-107: findAndLockForUpdate uses $queryRaw — return one locked row per call
      $queryRaw: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(rows.map((r) => ({ id: r.id, quantity: r.quantity, name: r.name })))
        ),
      inventory: {
        // Used for detail fetch (storeprice/finish) after row locking
        findMany: vi.fn().mockResolvedValue(rows),
        update: vi.fn().mockResolvedValue({}),
      },
      quantityLog: { create: vi.fn().mockResolvedValue({}) },
      order: { create: vi.fn().mockResolvedValue(orderResult) },
    }
    mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )
    return mockTx
  }

  // ── Auth guard (DEV-17) ───────────────────────────────────────────────────

  it("returns failure when user is unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    setupTransaction()

    const result = await placeInStoreOrder(baseOrderData)

    expect(result.success).toBe(false)
    expect(result.error).toContain("Authentication required")
  })

  it("returns failure when user is an ADMIN (not CUSTOMER)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
    setupTransaction()

    const result = await placeInStoreOrder(baseOrderData)

    expect(result.success).toBe(false)
    expect(result.error).toContain("Authentication required")
  })

  it("returns failure when user is TEAM role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "team-1", role: "TEAM" } })
    setupTransaction()

    const result = await placeInStoreOrder(baseOrderData)

    expect(result.success).toBe(false)
    expect(result.error).toContain("Authentication required")
  })

  // ── Input validation (DEV-16) ─────────────────────────────────────────────

  it("returns failure when customerEmail is invalid", async () => {
    mockAuth.mockResolvedValue(customerSession)
    setupTransaction()

    const result = await placeInStoreOrder({ ...baseOrderData, customerEmail: "not-an-email" })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it("returns failure when items array is empty", async () => {
    mockAuth.mockResolvedValue(customerSession)
    setupTransaction()

    const result = await placeInStoreOrder({ ...baseOrderData, items: [] })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it("returns failure when an item has a non-positive cartQuantity", async () => {
    mockAuth.mockResolvedValue(customerSession)
    setupTransaction()

    const result = await placeInStoreOrder({
      ...baseOrderData,
      items: [{ ...baseOrderData.items[0], cartQuantity: 0 }],
    })

    expect(result.success).toBe(false)
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns success with orderId on a valid order", async () => {
    mockAuth.mockResolvedValue(customerSession)
    setupTransaction()

    const result = await placeInStoreOrder(baseOrderData)

    expect(result.success).toBe(true)
    expect(result.orderId).toBe("order-123")
    expect(result.order).toBeDefined()
  })

  it("calls revalidatePath after a successful order", async () => {
    mockAuth.mockResolvedValue(customerSession)
    setupTransaction()

    await placeInStoreOrder(baseOrderData)

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/orders")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/inventory")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/ledger")
  })

  // ── Auth / customerId logic ───────────────────────────────────────────────

  it("sets customerId from session when role is CUSTOMER", async () => {
    mockAuth.mockResolvedValue(customerSession)
    const mockTx = setupTransaction()

    await placeInStoreOrder(baseOrderData)

    expect(mockTx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ customerId: "cust-42" }),
    })
  })

  // ── Server-side total recalculation (DEV-16) ──────────────────────────────

  it("calculates subtotal from DB prices, not client-supplied values", async () => {
    mockAuth.mockResolvedValue(customerSession)
    // DB price is 5000 (cents), cartQuantity=2 → subtotal should be 10000
    const mockTx = setupTransaction()

    // Pass deliberately wrong client totals — server should ignore them
    await placeInStoreOrder({ ...baseOrderData, subtotal: 99999, tax: 99999, total: 99999 })

    expect(mockTx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subtotal: 10000, // 5000 * 2
        tax: 800, // 10000 * 8% = 800
        totalAmount: 10800, // 10000 + 800 + 0 shipping
      }),
    })
  })

  it("applies the tax rate from store settings", async () => {
    mockAuth.mockResolvedValue(customerSession)
    const mockTx = setupTransaction()

    await placeInStoreOrder(baseOrderData)

    // taxRate=8%, subtotal=10000 → tax=800
    expect(mockTx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tax: 800 }),
    })
  })

  it("adds shipping cost for SHIPPING fulfillment", async () => {
    mockAuth.mockResolvedValue(customerSession)
    const mockTx = setupTransaction()

    await placeInStoreOrder({ ...baseOrderData, fulfillment: "SHIPPING" })

    // subtotal=10000, tax=800, shipping=499 → total=11299
    expect(mockTx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ totalAmount: 11299 }),
    })
  })

  it("uses DB storeprice for order line items (not client price)", async () => {
    mockAuth.mockResolvedValue(customerSession)
    const mockTx = setupTransaction({
      inventoryRows: [
        { id: 1, name: "Black Lotus", quantity: 10, finish: "nonfoil", storeprice: 5000 },
      ],
    })

    // Send a different client price
    await placeInStoreOrder({
      ...baseOrderData,
      items: [{ ...baseOrderData.items[0], storeprice: 1 }],
    })

    expect(mockTx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        items: expect.objectContaining({
          create: expect.arrayContaining([
            expect.objectContaining({ price: 5000 }), // DB price used
          ]),
        }),
      }),
    })
  })

  // ── Stock validation ──────────────────────────────────────────────────────

  it("returns failure when stock is insufficient", async () => {
    mockAuth.mockResolvedValue(customerSession)
    setupTransaction({
      inventoryRows: [
        { id: 1, name: "Black Lotus", quantity: 1, finish: "nonfoil", storeprice: 5000 },
      ],
    })

    const result = await placeInStoreOrder(baseOrderData)

    expect(result.success).toBe(false)
    expect(result.error).toContain("Insufficient stock")
  })

  it("returns failure when inventory item is not found", async () => {
    mockAuth.mockResolvedValue(customerSession)
    setupTransaction({ inventoryRows: [] })

    const result = await placeInStoreOrder(baseOrderData)

    expect(result.success).toBe(false)
    expect(result.error).toContain("Insufficient stock")
  })

  // ── Fulfillment logic ─────────────────────────────────────────────────────

  it("defaults fulfillment to PICKUP when not SHIPPING", async () => {
    mockAuth.mockResolvedValue(customerSession)
    const mockTx = setupTransaction()

    await placeInStoreOrder({ ...baseOrderData, fulfillment: "IN_STORE" })

    expect(mockTx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ fulfillment: "PICKUP" }),
    })
  })

  it("sets fulfillment to SHIPPING when explicitly specified", async () => {
    mockAuth.mockResolvedValue(customerSession)
    const mockTx = setupTransaction()

    await placeInStoreOrder({ ...baseOrderData, fulfillment: "SHIPPING" })

    expect(mockTx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ fulfillment: "SHIPPING" }),
    })
  })

  it("defaults fulfillment to PICKUP when not provided", async () => {
    mockAuth.mockResolvedValue(customerSession)
    const mockTx = setupTransaction()

    await placeInStoreOrder({ ...baseOrderData })

    expect(mockTx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ fulfillment: "PICKUP" }),
    })
  })

  // ── Inventory decrement and logging ───────────────────────────────────────

  it("decrements inventory for each item", async () => {
    mockAuth.mockResolvedValue(customerSession)
    const mockTx = setupTransaction()

    await placeInStoreOrder(baseOrderData)

    expect(mockTx.inventory.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { quantity: { decrement: 2 } },
    })
  })

  it("creates a quantity log entry for each item", async () => {
    mockAuth.mockResolvedValue(customerSession)
    const mockTx = setupTransaction()

    await placeInStoreOrder(baseOrderData)

    expect(mockTx.quantityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cardname: "Black Lotus",
        amount: -2,
        user: "CUSTOMER: buyer@example.com",
        finish: "nonfoil",
      }),
    })
  })

  // ── Error handling ────────────────────────────────────────────────────────

  it("returns failure with sanitized error message when transaction throws", async () => {
    mockAuth.mockResolvedValue(customerSession)
    mockTransaction.mockRejectedValue(new Error("Transaction deadlock"))
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await placeInStoreOrder(baseOrderData)

    // DEV-113: Internal errors are sanitized — "Transaction deadlock" is not
    // in the allowlist, so the generic fallback message is returned instead.
    expect(result).toEqual({
      success: false,
      error: "Checkout failed. Please try again.",
    })
    consoleSpy.mockRestore()
  })

  it("does not call revalidatePath when the order fails", async () => {
    mockAuth.mockResolvedValue(customerSession)
    mockTransaction.mockRejectedValue(new Error("fail"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    await placeInStoreOrder(baseOrderData)

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // ── Email confirmation ────────────────────────────────────────────────────

  it("calls EmailService.sendOrderConfirmation after a successful order", async () => {
    mockAuth.mockResolvedValue(customerSession)
    setupTransaction()

    await placeInStoreOrder(baseOrderData)

    expect(mockSendOrderConfirmation).toHaveBeenCalledTimes(1)
  })

  it("passes the correct customerEmail to sendOrderConfirmation", async () => {
    mockAuth.mockResolvedValue(customerSession)
    setupTransaction()

    await placeInStoreOrder(baseOrderData)

    expect(mockSendOrderConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ customerEmail: "buyer@example.com" })
    )
  })

  it("does NOT call sendOrderConfirmation when the transaction fails", async () => {
    mockAuth.mockResolvedValue(customerSession)
    mockTransaction.mockRejectedValue(new Error("Transaction deadlock"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    await placeInStoreOrder(baseOrderData)

    expect(mockSendOrderConfirmation).not.toHaveBeenCalled()
  })
})
