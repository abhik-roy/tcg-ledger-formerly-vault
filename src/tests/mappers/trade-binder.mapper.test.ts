/**
 * @file trade-binder.mapper.test.ts
 * @description Tests for toTradeBinderItemDTO and toTradeOfferDTO mappers
 */

import { describe, it, expect } from "vitest"
import {
  toTradeBinderItemDTO,
  toTradeBinderItemDTOs,
  toTradeOfferDTO,
  computeAskPrice,
} from "@/mappers/trade-binder.mapper"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeTradeBinderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "holding-1",
    card: {
      id: "card-1",
      name: "Lightning Bolt",
      set: "LEB",
      setName: "Limited Edition Beta",
      collectorNumber: "161",
      finish: "nonfoil",
      game: "magic",
      rarity: "common",
      imageSmall: "http://small.jpg",
      imageNormal: "http://normal.jpg",
      marketPrice: 5000,
      marketPriceAt: new Date("2026-01-01"),
    },
    quantity: 2,
    listedQuantity: 1,
    condition: "NM",
    askType: null,
    askValue: null,
    user: {
      id: "user-1",
      displayName: "Test User",
      email: "test@local",
    },
    updatedAt: new Date("2026-01-15"),
    tradeNotes: "Looking for trades",
    _count: { tradeOffers: 0 },
    ...overrides,
  }
}

function makeOfferRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "offer-1",
    holdingId: "holding-1",
    offerUserId: "user-2",
    cashAmount: 1000,
    message: "Interested!",
    status: "pending",
    declineMessage: null,
    completedAt: null,
    voidedAt: null,
    createdAt: new Date("2026-02-01"),
    offerUser: { id: "user-2", displayName: "Buyer", email: "buyer@local" },
    offeredCards: [],
    holding: {
      id: "holding-1",
      userId: "user-1",
      condition: "NM",
      askType: null,
      askValue: null,
      listedForTrade: true,
      listedQuantity: 1,
      quantity: 2,
      card: {
        id: "card-1",
        name: "Lightning Bolt",
        set: "LEB",
        setName: "Limited Edition Beta",
        collectorNumber: "161",
        finish: "nonfoil",
        game: "magic",
        rarity: "common",
        imageSmall: null,
        imageNormal: null,
        marketPrice: 5000,
        marketPriceAt: new Date("2026-01-01"),
      },
      user: { id: "user-1", displayName: "Test User", email: "test@local" },
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests: computeAskPrice
// ---------------------------------------------------------------------------

describe("computeAskPrice", () => {
  it("returns null when askType is null", () => {
    expect(computeAskPrice(null, 1000, 5000)).toBeNull()
  })

  it("returns fixed value when askType is 'fixed'", () => {
    expect(computeAskPrice("fixed", 2500, 5000)).toBe(2500)
  })

  it("returns percent of market price when askType is 'percent_market'", () => {
    expect(computeAskPrice("percent_market", 80, 5000)).toBe(4000)
  })

  it("returns null for percent_market when marketPrice is null", () => {
    expect(computeAskPrice("percent_market", 80, null)).toBeNull()
  })

  it("returns null when askValue is null", () => {
    expect(computeAskPrice("fixed", null, 5000)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Tests: toTradeBinderItemDTO
// ---------------------------------------------------------------------------

describe("toTradeBinderItemDTO", () => {
  it("maps all fields correctly", () => {
    const row = makeTradeBinderRow()
    const dto = toTradeBinderItemDTO(row)

    expect(dto.holdingId).toBe("holding-1")
    expect(dto.card.name).toBe("Lightning Bolt")
    expect(dto.card.set).toBe("LEB")
    expect(dto.quantity).toBe(2)
    expect(dto.condition).toBe("NM")
    expect(dto.owner.id).toBe("user-1")
    expect(dto.owner.displayName).toBe("Test User")
    expect(dto.owner.email).toBe("test@local")
    expect(dto.listedAt).toEqual(new Date("2026-01-15"))
    expect(dto.tradeNotes).toBe("Looking for trades")
  })

  it("maps askType, askValue, askPrice fields", () => {
    const row = makeTradeBinderRow({ askType: "fixed", askValue: 3000 })
    const dto = toTradeBinderItemDTO(row)

    expect(dto.askType).toBe("fixed")
    expect(dto.askValue).toBe(3000)
    expect(dto.askPrice).toBe(3000)
  })

  it("computes askPrice for percent_market", () => {
    const row = makeTradeBinderRow({ askType: "percent_market", askValue: 80 })
    const dto = toTradeBinderItemDTO(row)

    expect(dto.askPrice).toBe(4000) // 80% of 5000
  })

  it("maps offerCount from _count.tradeOffers", () => {
    const row = makeTradeBinderRow({ _count: { tradeOffers: 3 } })
    const dto = toTradeBinderItemDTO(row)
    expect(dto.offerCount).toBe(3)
  })

  it("defaults offerCount to 0 when _count is missing", () => {
    const row = makeTradeBinderRow({ _count: undefined })
    const dto = toTradeBinderItemDTO(row)
    expect(dto.offerCount).toBe(0)
  })

  it("sets myOffer to null when not provided", () => {
    const dto = toTradeBinderItemDTO(makeTradeBinderRow())
    expect(dto.myOffer).toBeNull()
  })

  it("maps myOffer when provided", () => {
    const offerRow = makeOfferRow()
    const dto = toTradeBinderItemDTO(makeTradeBinderRow(), offerRow)
    expect(dto.myOffer).not.toBeNull()
    expect(dto.myOffer!.id).toBe("offer-1")
    expect(dto.myOffer!.status).toBe("pending")
  })

  it("handles null tradeNotes", () => {
    const row = makeTradeBinderRow({ tradeNotes: null })
    const dto = toTradeBinderItemDTO(row)
    expect(dto.tradeNotes).toBeNull()
  })

  it("handles undefined tradeNotes (defaults to null)", () => {
    const row = makeTradeBinderRow({ tradeNotes: undefined })
    const dto = toTradeBinderItemDTO(row)
    expect(dto.tradeNotes).toBeNull()
  })

  it("handles null displayName (uses email via owner object)", () => {
    const row = makeTradeBinderRow({
      user: { id: "user-2", displayName: null, email: "anon@test.com" },
    })
    const dto = toTradeBinderItemDTO(row)

    expect(dto.owner.displayName).toBeNull()
    expect(dto.owner.email).toBe("anon@test.com")
  })

  it("maps nested card fields through toCardDTO", () => {
    const dto = toTradeBinderItemDTO(makeTradeBinderRow())

    expect(dto.card.id).toBe("card-1")
    expect(dto.card.finish).toBe("nonfoil")
    expect(dto.card.marketPrice).toBe(5000)
  })
})

// ---------------------------------------------------------------------------
// Tests: toTradeBinderItemDTOs
// ---------------------------------------------------------------------------

describe("toTradeBinderItemDTOs", () => {
  it("maps array of rows", () => {
    const rows = [makeTradeBinderRow({ id: "h-1" }), makeTradeBinderRow({ id: "h-2" })]
    const dtos = toTradeBinderItemDTOs(rows)
    expect(dtos).toHaveLength(2)
    expect(dtos[0].holdingId).toBe("h-1")
    expect(dtos[1].holdingId).toBe("h-2")
  })

  it("returns empty array for empty input", () => {
    expect(toTradeBinderItemDTOs([])).toEqual([])
  })

  it("attaches myOffer from map when provided", () => {
    const rows = [makeTradeBinderRow({ id: "h-1" })]
    const offerRow = makeOfferRow({ id: "offer-99" })
    const myOffers = new Map([["h-1", offerRow]])
    const dtos = toTradeBinderItemDTOs(rows, myOffers)
    expect(dtos[0].myOffer?.id).toBe("offer-99")
  })
})

// ---------------------------------------------------------------------------
// Tests: toTradeOfferDTO
// ---------------------------------------------------------------------------

describe("toTradeOfferDTO", () => {
  it("maps all base fields correctly", () => {
    const row = makeOfferRow()
    const dto = toTradeOfferDTO(row)

    expect(dto.id).toBe("offer-1")
    expect(dto.holdingId).toBe("holding-1")
    expect(dto.cashAmount).toBe(1000)
    expect(dto.message).toBe("Interested!")
    expect(dto.status).toBe("pending")
    expect(dto.declineMessage).toBeNull()
    expect(dto.completedAt).toBeNull()
    expect(dto.voidedAt).toBeNull()
    expect(dto.createdAt).toEqual(new Date("2026-02-01"))
  })

  it("maps offerUser correctly", () => {
    const dto = toTradeOfferDTO(makeOfferRow())
    expect(dto.offerUser.id).toBe("user-2")
    expect(dto.offerUser.displayName).toBe("Buyer")
    expect(dto.offerUser.email).toBe("buyer@local")
  })

  it("maps card from holding", () => {
    const dto = toTradeOfferDTO(makeOfferRow())
    expect(dto.card.name).toBe("Lightning Bolt")
    expect(dto.cardCondition).toBe("NM")
  })

  it("computes askPrice from holding askType/askValue", () => {
    const row = makeOfferRow({
      holding: {
        ...makeOfferRow().holding,
        askType: "fixed",
        askValue: 2000,
      },
    })
    const dto = toTradeOfferDTO(row)
    expect(dto.askPrice).toBe(2000)
  })

  it("computes offeredCardsValue from offered cards", () => {
    const row = makeOfferRow({
      offeredCards: [
        {
          id: "oc-1",
          holdingId: "holding-2",
          quantity: 2,
          holding: {
            condition: "LP",
            card: {
              id: "card-2",
              name: "Black Lotus",
              set: "LEB",
              setName: "Limited Edition Beta",
              collectorNumber: "232",
              finish: "nonfoil",
              game: "magic",
              rarity: "rare",
              imageSmall: null,
              imageNormal: null,
              marketPrice: 10000,
              marketPriceAt: new Date("2026-01-01"),
            },
          },
        },
      ],
    })
    const dto = toTradeOfferDTO(row)
    expect(dto.offeredCards).toHaveLength(1)
    expect(dto.offeredCardsValue).toBe(20000) // 10000 * 2
  })

  it("sets offeredCardsValue to 0 for empty offered cards", () => {
    const dto = toTradeOfferDTO(makeOfferRow())
    expect(dto.offeredCardsValue).toBe(0)
  })

  it("handles null message (defaults to null)", () => {
    const row = makeOfferRow({ message: null })
    const dto = toTradeOfferDTO(row)
    expect(dto.message).toBeNull()
  })
})
