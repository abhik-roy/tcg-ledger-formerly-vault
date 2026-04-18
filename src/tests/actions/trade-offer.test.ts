/**
 * @file trade-offer.test.ts
 * @description Tests for trade offer server actions (makeOffer, acceptOffer, declineOffer, withdrawOffer, voidOffer)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before imports
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth-guard", () => ({
  requireUser: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "USER", email: "user@example.com" },
  }),
}))

vi.mock("@/repositories/trade-offer.repository", () => ({
  TradeOfferRepository: {
    findById: vi.fn(),
    findPendingByHoldingAndUser: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    findByOfferUser: vi.fn(),
    findOffersOnUserListings: vi.fn(),
    countPendingOnUserListings: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    holding: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    tradeOffer: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/mappers/trade-binder.mapper", () => ({
  toTradeOfferDTO: vi.fn((row: unknown) => row),
}))

vi.mock("@/services/logging.service", () => ({
  LoggingService: {
    logQuantityChange: vi.fn(),
  },
}))

vi.mock("@/services/email.service", () => ({
  EmailService: {
    sendNewOfferNotification: vi.fn(),
  },
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import {
  makeOffer,
  acceptOffer,
  declineOffer,
  withdrawOffer,
  voidOffer,
} from "@/app/actions/trade-offer"
import { TradeOfferRepository } from "@/repositories/trade-offer.repository"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth-guard"

const mockRequireUser = requireUser as ReturnType<typeof vi.fn>
const mockFindById = TradeOfferRepository.findById as ReturnType<typeof vi.fn>
const mockFindPending = TradeOfferRepository.findPendingByHoldingAndUser as ReturnType<typeof vi.fn>
const mockCreate = TradeOfferRepository.create as ReturnType<typeof vi.fn>
const mockUpdateStatus = TradeOfferRepository.updateStatus as ReturnType<typeof vi.fn>
const mockHoldingFindUnique = prisma.holding.findUnique as ReturnType<typeof vi.fn>
const mockHoldingFindMany = prisma.holding.findMany as ReturnType<typeof vi.fn>
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHolding(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-owner",
    listedForTrade: true,
    card: { name: "Lightning Bolt" },
    user: { email: "owner@local", displayName: "Owner" },
    ...overrides,
  }
}

function makeOffer_row(overrides: Record<string, unknown> = {}) {
  return {
    id: "offer-1",
    holdingId: "holding-1",
    offerUserId: "user-1",
    status: "pending",
    holding: {
      userId: "user-owner",
      condition: "NM",
      askType: null,
      askValue: null,
      card: { name: "Lightning Bolt", marketPrice: 5000 },
      user: { id: "user-owner", displayName: "Owner", email: "owner@local" },
    },
    offerUser: { id: "user-1", displayName: "Buyer", email: "buyer@local" },
    offeredCards: [],
    cashAmount: 1000,
    message: null,
    declineMessage: null,
    completedAt: null,
    voidedAt: null,
    createdAt: new Date("2026-02-01"),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests: makeOffer
// ---------------------------------------------------------------------------

describe("makeOffer", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects offers on own listing", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    // Holding owned by same user (user-1)
    mockHoldingFindUnique.mockResolvedValue(makeHolding({ userId: "user-1" }))

    const result = await makeOffer({
      holdingId: "holding-1",
      cashAmount: 1000,
      cards: [],
    })

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/own listing/i)
  })

  it("rejects offers on unlisted holdings", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockHoldingFindUnique.mockResolvedValue(
      makeHolding({ userId: "user-owner", listedForTrade: false })
    )

    const result = await makeOffer({
      holdingId: "holding-1",
      cashAmount: 1000,
      cards: [],
    })

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/not listed/i)
  })

  it("rejects duplicate pending offers", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockHoldingFindUnique.mockResolvedValue(makeHolding({ userId: "user-owner" }))
    mockFindPending.mockResolvedValue(makeOffer_row()) // existing pending offer

    const result = await makeOffer({
      holdingId: "holding-1",
      cashAmount: 1000,
      cards: [],
    })

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(
      /already have a pending offer/i
    )
  })

  it("succeeds when offer is valid", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockHoldingFindUnique.mockResolvedValue(makeHolding({ userId: "user-owner" }))
    mockFindPending.mockResolvedValue(null)
    mockHoldingFindMany.mockResolvedValue([])
    const createdOffer = makeOffer_row()
    mockCreate.mockResolvedValue(createdOffer)
    mockUserFindUnique.mockResolvedValue({ displayName: "Buyer", email: "buyer@local" })

    const result = await makeOffer({
      holdingId: "holding-1",
      cashAmount: 1000,
      cards: [],
    })

    expect(result.success).toBe(true)
    expect(mockCreate).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// Tests: acceptOffer
// ---------------------------------------------------------------------------

describe("acceptOffer", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-owner", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    // Offer is on a holding owned by "user-owner", not "user-1"
    mockFindById.mockResolvedValue(
      makeOffer_row({ holding: { ...makeOffer_row().holding, userId: "user-owner" } })
    )

    const result = await acceptOffer("offer-1")

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/own listings/i)
  })

  it("rejects non-pending offers", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-owner" } })
    mockFindById.mockResolvedValue(
      makeOffer_row({
        status: "declined",
        holding: { ...makeOffer_row().holding, userId: "user-owner" },
      })
    )

    const result = await acceptOffer("offer-1")

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/declined/i)
  })

  it("succeeds when owner accepts a pending offer", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-owner" } })
    const offerRow = makeOffer_row({
      holding: { ...makeOffer_row().holding, userId: "user-owner" },
    })
    mockFindById.mockResolvedValue(offerRow)
    // $transaction runs the callback immediately
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)
    )
    ;(prisma.holding.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      cardId: "card-1",
      condition: "NM",
      quantity: 1,
      listedQuantity: 0,
      listedForTrade: false,
      card: { name: "Bolt", set: "LEB", finish: "nonfoil" },
    })
    ;(prisma.holding.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(prisma.tradeOffer.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(prisma.tradeOffer.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({})
    mockFindById
      .mockResolvedValueOnce(offerRow)
      .mockResolvedValueOnce({ ...offerRow, status: "accepted" })

    const result = await acceptOffer("offer-1")

    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tests: declineOffer
// ---------------------------------------------------------------------------

describe("declineOffer", () => {
  beforeEach(() => vi.clearAllMocks())

  it("stores decline message", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-owner" } })
    const offerRow = makeOffer_row({
      holding: { ...makeOffer_row().holding, userId: "user-owner" },
    })
    mockFindById.mockResolvedValue(offerRow)
    const declinedRow = { ...offerRow, status: "declined", declineMessage: "Not interested" }
    mockUpdateStatus.mockResolvedValue(declinedRow)

    const result = await declineOffer("offer-1", "Not interested")

    expect(result.success).toBe(true)
    expect(mockUpdateStatus).toHaveBeenCalledWith("offer-1", "declined", {
      declineMessage: "Not interested",
    })
  })

  it("rejects non-owner from declining", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockFindById.mockResolvedValue(
      makeOffer_row({ holding: { ...makeOffer_row().holding, userId: "user-owner" } })
    )

    const result = await declineOffer("offer-1")

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/own listings/i)
  })

  it("rejects declining a non-pending offer", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-owner" } })
    mockFindById.mockResolvedValue(
      makeOffer_row({
        status: "accepted",
        holding: { ...makeOffer_row().holding, userId: "user-owner" },
      })
    )

    const result = await declineOffer("offer-1")

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/accepted/i)
  })
})

// ---------------------------------------------------------------------------
// Tests: withdrawOffer
// ---------------------------------------------------------------------------

describe("withdrawOffer", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-offeror", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-other" } })
    // Offer made by user-1, trying to withdraw as user-other
    mockFindById.mockResolvedValue(makeOffer_row({ offerUserId: "user-1" }))

    const result = await withdrawOffer("offer-1")

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/own offers/i)
  })

  it("allows the offeror to withdraw a pending offer", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockFindById.mockResolvedValue(makeOffer_row({ offerUserId: "user-1" }))
    mockUpdateStatus.mockResolvedValue({ ...makeOffer_row(), status: "withdrawn" })

    const result = await withdrawOffer("offer-1")

    expect(result.success).toBe(true)
    expect(mockUpdateStatus).toHaveBeenCalledWith("offer-1", "withdrawn")
  })

  it("rejects withdrawal of a non-pending offer", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockFindById.mockResolvedValue(makeOffer_row({ offerUserId: "user-1", status: "accepted" }))

    const result = await withdrawOffer("offer-1")

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/accepted/i)
  })
})

// ---------------------------------------------------------------------------
// Tests: voidOffer
// ---------------------------------------------------------------------------

describe("voidOffer", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-accepted status", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" } })
    mockFindById.mockResolvedValue(makeOffer_row({ status: "pending", offerUserId: "user-1" }))

    const result = await voidOffer("offer-1")

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/only accepted/i)
  })

  it("rejects users who are neither owner nor offeror", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-stranger" } })
    mockFindById.mockResolvedValue(
      makeOffer_row({
        status: "accepted",
        offerUserId: "user-1",
        holding: { ...makeOffer_row().holding, userId: "user-owner" },
      })
    )

    const result = await voidOffer("offer-1")

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toMatch(/listing owner or offerer/i)
  })

  it("allows the listing owner to void an accepted offer", async () => {
    mockRequireUser.mockResolvedValue({ user: { id: "user-owner" } })
    const offerRow = makeOffer_row({
      status: "accepted",
      offerUserId: "user-1",
      holding: { ...makeOffer_row().holding, userId: "user-owner" },
    })
    mockFindById.mockResolvedValue(offerRow)
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)
    )
    ;(prisma.holding.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      cardId: "card-1",
      condition: "NM",
      quantity: 2,
      card: { name: "Bolt", set: "LEB", finish: "nonfoil" },
    })
    ;(prisma.holding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(prisma.tradeOffer.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
    mockFindById
      .mockResolvedValueOnce(offerRow)
      .mockResolvedValueOnce({ ...offerRow, status: "voided" })

    const result = await voidOffer("offer-1")

    expect(result.success).toBe(true)
  })
})
