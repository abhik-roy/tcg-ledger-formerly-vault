/**
 * @file holding-actions.test.ts
 * @description Tests for holding CRUD server actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — declared before imports (hoisted)
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth-guard", () => ({
  requireUser: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "USER", email: "user@example.com" },
  }),
  requireOwnership: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/services/holding.service", () => ({
  HoldingService: {
    listForUser: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggleListing: vi.fn(),
  },
}))

vi.mock("@/services/logging.service", () => ({
  LoggingService: {
    listAllInRange: vi.fn().mockResolvedValue([]),
    logQuantityChange: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (_fn: unknown) => _fn,
}))

import {
  getHoldings,
  createHolding,
  updateHolding,
  deleteHolding,
  toggleTradeListingAction,
} from "@/app/actions/holding"
import { HoldingService } from "@/services/holding.service"
import { requireUser, requireOwnership } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { makeMockHolding } from "@/tests/utils/fixtures"

const mockListForUser = HoldingService.listForUser as ReturnType<typeof vi.fn>
const mockCreate = HoldingService.create as ReturnType<typeof vi.fn>
const mockGetById = HoldingService.getById as ReturnType<typeof vi.fn>
const mockUpdate = HoldingService.update as ReturnType<typeof vi.fn>
const mockDelete = HoldingService.delete as ReturnType<typeof vi.fn>
const mockToggleListing = HoldingService.toggleListing as ReturnType<typeof vi.fn>
const mockRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>
const mockRequireUser = requireUser as ReturnType<typeof vi.fn>
const mockRequireOwnership = requireOwnership as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Tests: getHoldings
// ---------------------------------------------------------------------------

describe("getHoldings", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls requireUser and returns holdings on success", async () => {
    const holdings = [makeMockHolding()]
    mockListForUser.mockResolvedValue(holdings)
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })

    const result = await getHoldings()

    expect(mockRequireUser).toHaveBeenCalledOnce()
    expect(result).toEqual({ success: true, data: holdings })
    expect(mockListForUser).toHaveBeenCalledWith("user-1", {})
  })

  it("returns error when service throws", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockListForUser.mockRejectedValue(new Error("DB timeout"))

    const result = await getHoldings()

    expect(result).toEqual({ success: false, error: "DB timeout" })
  })

  it("passes filter to service", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockListForUser.mockResolvedValue([])

    await getHoldings({ game: "magic", search: "bolt" })

    expect(mockListForUser).toHaveBeenCalledWith("user-1", { game: "magic", search: "bolt" })
  })
})

// ---------------------------------------------------------------------------
// Tests: createHolding
// ---------------------------------------------------------------------------

describe("createHolding", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates holding and revalidates paths on success", async () => {
    const holding = makeMockHolding()
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockCreate.mockResolvedValue(holding)

    const input = { cardId: "card-1", quantity: 2, condition: "NM" }
    const result = await createHolding(input)

    expect(result).toEqual({ success: true, data: holding })
    expect(mockCreate).toHaveBeenCalledWith("user-1", input)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/collection")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin")
  })

  it("returns error when service throws", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockCreate.mockRejectedValue(new Error("Card not found"))

    const result = await createHolding({ cardId: "bad-id" })

    expect(result).toEqual({ success: false, error: "Card not found" })
  })
})

// ---------------------------------------------------------------------------
// Tests: updateHolding
// ---------------------------------------------------------------------------

describe("updateHolding", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls requireOwnership, updates, and revalidates on success", async () => {
    const holding = makeMockHolding()
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockGetById.mockResolvedValue(holding)
    mockUpdate.mockResolvedValue(holding)

    const result = await updateHolding("holding-1", { quantity: 5 })

    expect(mockRequireOwnership).toHaveBeenCalledWith("holding-1", "user-1")
    expect(result).toEqual({ success: true, data: holding })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/collection")
  })

  it("returns error when service throws", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockGetById.mockResolvedValue(makeMockHolding())
    mockUpdate.mockRejectedValue(new Error("Not found"))

    const result = await updateHolding("holding-1", { quantity: 5 })

    expect(result).toEqual({ success: false, error: "Not found" })
  })
})

// ---------------------------------------------------------------------------
// Tests: deleteHolding
// ---------------------------------------------------------------------------

describe("deleteHolding", () => {
  beforeEach(() => vi.clearAllMocks())

  it("deletes holding and revalidates on success", async () => {
    const holding = makeMockHolding()
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockGetById.mockResolvedValue(holding)
    mockDelete.mockResolvedValue(undefined)

    const result = await deleteHolding("holding-1")

    expect(mockRequireOwnership).toHaveBeenCalledWith("holding-1", "user-1")
    expect(result).toEqual({ success: true, data: undefined })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/collection")
  })

  it("returns error when service throws", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockGetById.mockResolvedValue(makeMockHolding())
    mockDelete.mockRejectedValue(new Error("FK violation"))

    const result = await deleteHolding("holding-1")

    expect(result).toEqual({ success: false, error: "FK violation" })
  })
})

// ---------------------------------------------------------------------------
// Tests: toggleTradeListingAction
// ---------------------------------------------------------------------------

describe("toggleTradeListingAction", () => {
  beforeEach(() => vi.clearAllMocks())

  it("toggles listing and revalidates both collection and trade binder paths", async () => {
    const holding = makeMockHolding({ listedForTrade: true, listedQuantity: 1 })
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockToggleListing.mockResolvedValue(holding)

    const result = await toggleTradeListingAction("holding-1", 1, "Looking for trades")

    expect(mockToggleListing).toHaveBeenCalledWith(
      "holding-1",
      1,
      "Looking for trades",
      undefined,
      undefined
    )
    expect(result).toEqual({ success: true, data: holding })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/collection")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/trade-binder")
  })

  it("passes askType and askValue when provided", async () => {
    const holding = makeMockHolding({ listedForTrade: true, listedQuantity: 2 })
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockToggleListing.mockResolvedValue(holding)

    await toggleTradeListingAction("holding-1", 2, undefined, "fixed", 3000)

    expect(mockToggleListing).toHaveBeenCalledWith("holding-1", 2, undefined, "fixed", 3000)
  })

  it("returns error when service throws", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockToggleListing.mockRejectedValue(new Error("Holding not found"))

    const result = await toggleTradeListingAction("holding-1", 0)

    expect(result).toEqual({ success: false, error: "Holding not found" })
  })
})
