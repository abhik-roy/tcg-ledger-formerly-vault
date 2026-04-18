/**
 * @file trade-binder.test.ts
 * @description Tests for getTradeBinder server action
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth-guard", () => ({
  requireUser: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "USER", email: "user@example.com" },
  }),
}))

vi.mock("@/services/holding.service", () => ({
  HoldingService: {
    listTradeBinder: vi.fn(),
  },
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (_fn: unknown) => _fn,
}))

import { getTradeBinder } from "@/app/actions/trade-binder"
import { HoldingService } from "@/services/holding.service"
import { requireUser } from "@/lib/auth-guard"
import { makeMockTradeBinderItem } from "@/tests/utils/fixtures"

const mockListTradeBinder = HoldingService.listTradeBinder as ReturnType<typeof vi.fn>
const mockRequireUser = requireUser as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getTradeBinder", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls requireUser", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockListTradeBinder.mockResolvedValue([])

    await getTradeBinder()

    expect(mockRequireUser).toHaveBeenCalledOnce()
  })

  it("returns { success: true, data: [...] } on happy path", async () => {
    const items = [makeMockTradeBinderItem()]
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockListTradeBinder.mockResolvedValue(items)

    const result = await getTradeBinder()

    expect(result).toEqual({ success: true, data: items })
  })

  it("returns { success: false, error: string } when service throws", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockListTradeBinder.mockRejectedValue(new Error("Database error"))

    const result = await getTradeBinder()

    expect(result).toEqual({ success: false, error: "Database error" })
  })

  it("passes filter to service", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockListTradeBinder.mockResolvedValue([])

    await getTradeBinder({ game: "magic", search: "bolt" })

    expect(mockListTradeBinder).toHaveBeenCalledWith(
      {
        game: "magic",
        search: "bolt",
        excludeUserId: undefined,
      },
      "user-1"
    )
  })

  it("passes excludeUserId when excludeSelf is true", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockListTradeBinder.mockResolvedValue([])

    await getTradeBinder({}, true)

    expect(mockListTradeBinder).toHaveBeenCalledWith(
      {
        excludeUserId: "user-1",
      },
      "user-1"
    )
  })

  it("does not pass excludeUserId when excludeSelf is false", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockListTradeBinder.mockResolvedValue([])

    await getTradeBinder({}, false)

    expect(mockListTradeBinder).toHaveBeenCalledWith(
      {
        excludeUserId: undefined,
      },
      "user-1"
    )
  })
})
