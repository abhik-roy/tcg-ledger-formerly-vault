import type { CardDTO, HoldingDTO, TradeBinderItemDTO } from "@/lib/dtos"

export function makeMockCard(overrides?: Partial<CardDTO>): CardDTO {
  return {
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
    ...overrides,
  }
}

export function makeMockHolding(overrides?: Partial<HoldingDTO>): HoldingDTO {
  return {
    id: "holding-1",
    userId: "user-1",
    card: makeMockCard(),
    quantity: 2,
    condition: "NM",
    notes: null,
    listedForTrade: false,
    listedQuantity: 0,
    askType: null,
    askValue: null,
    tradeNotes: null,
    idealQuantity: 0,
    maxQuantity: 0,
    acquiredPrice: null,
    acquiredAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  }
}

export function makeMockTradeBinderItem(
  overrides?: Partial<TradeBinderItemDTO>
): TradeBinderItemDTO {
  return {
    holdingId: "holding-1",
    card: makeMockCard(),
    quantity: 1,
    listedQuantity: 1,
    condition: "NM",
    owner: { id: "user-1", displayName: "Test User", email: "test@local" },
    listedAt: new Date("2026-01-01"),
    tradeNotes: null,
    askType: null,
    askValue: null,
    askPrice: null,
    offerCount: 0,
    myOffer: null,
    ...overrides,
  }
}
