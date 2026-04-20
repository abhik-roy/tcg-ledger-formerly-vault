/**
 * @file dtos.ts
 * @module lib/dtos
 * @description
 *   Data Transfer Objects shared across the service and controller layers.
 *   DTOs define the shape of data returned to the client. All monetary values
 *   are expressed in cents (integers) unless explicitly documented otherwise.
 *
 * @layer Shared
 */

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/**
 * Represents a Card (printing-level catalog entry) as returned to the client.
 */
export type CardDTO = {
  id: string
  name: string
  set: string
  setName: string
  collectorNumber: string
  finish: string
  game: string
  rarity: string
  imageSmall: string | null
  imageNormal: string | null
  marketPrice: number | null
  marketPriceAt: Date | null
}

// ---------------------------------------------------------------------------
// Holding
// ---------------------------------------------------------------------------

/**
 * Represents a Holding (user's ownership of a specific printing + condition).
 * All monetary fields (acquiredPrice) are in cents.
 */
export type HoldingDTO = {
  id: string
  userId: string
  card: CardDTO
  quantity: number
  condition: string
  notes: string | null
  listedForTrade: boolean
  listedQuantity: number
  askType: string | null
  askValue: number | null
  tradeNotes: string | null
  idealQuantity: number
  maxQuantity: number
  acquiredPrice: number | null
  acquiredAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Trade Binder
// ---------------------------------------------------------------------------

/**
 * A card offered as part of a trade offer.
 */
export type TradeOfferCardDTO = {
  id: string
  holdingId: string
  card: CardDTO
  condition: string
  quantity: number
  marketValue: number | null
}

/**
 * A full trade offer on a listed holding.
 */
export type TradeOfferDTO = {
  id: string
  holdingId: string
  card: CardDTO
  cardCondition: string
  askPrice: number | null
  offerUser: { id: string; displayName: string | null; email: string }
  listingOwner?: { id: string; displayName: string | null; email: string }
  cashAmount: number
  offeredCards: TradeOfferCardDTO[]
  offeredCardsValue: number
  message: string | null
  status: string
  declineMessage: string | null
  completedAt: Date | null
  voidedAt: Date | null
  createdAt: Date
}

/**
 * Represents a single listing in the Tailnet-wide trade binder.
 */
export type TradeBinderItemDTO = {
  holdingId: string
  card: CardDTO
  quantity: number
  listedQuantity: number
  condition: string
  owner: {
    id: string
    displayName: string | null
    email: string
  }
  listedAt: Date
  tradeNotes: string | null
  askType: string | null
  askValue: number | null
  askPrice: number | null
  offerCount: number
  myOffer: TradeOfferDTO | null
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

/**
 * A unified ledger entry combining quantity and price log records.
 */
export type LedgerEntryDTO = {
  id: number
  type: "quantity" | "price"
  userId?: string
  cardName: string
  cardSet?: string
  condition?: string | null
  finish?: string | null
  delta?: number
  reason?: string | null
  actorId?: string
  oldPrice?: number
  newPrice?: number
  source?: string
  time: Date
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

/**
 * Slim user DTO for embedding in other DTOs (e.g., trade binder owner).
 */
export type UserSlimDTO = {
  id: string
  email: string
  displayName: string | null
  role: string
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * Per-user personal collection statistics.
 */
export type DashboardPersonalStats = {
  totalCards: number
  uniquePrintings: number
  totalValueCents: number
  recentlyAcquired: HoldingDTO[]
  topGames: Array<{ game: string; count: number }>
}

/**
 * Tailnet-wide aggregate statistics.
 */
export type DashboardTailnetStats = {
  totalUsers: number
  totalListings: number
  trendingCards: Array<{ card: CardDTO; ownerCount: number }>
  recentListings: TradeBinderItemDTO[]
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

/**
 * Represents a team member (admin/user) returned to the team management UI.
 */
export interface TeamMemberDTO {
  id: string
  name: string | null
  email: string | null
  role: string
  createdAt: Date
  permissions: UserPermissionsDTO | null
}

/**
 * Granular permissions for a user.
 */
export interface UserPermissionsDTO {
  inventoryUpdatePrices: boolean
  addCardsAccess: boolean
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Store settings as returned to the admin settings page.
 */
export interface StoreSettingsDTO {
  storeName: string
  contactEmail: string | null
  taxRate: number
  currency: string
}
