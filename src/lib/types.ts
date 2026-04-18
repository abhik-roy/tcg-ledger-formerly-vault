/**
 * @file types.ts
 * @module lib/types
 * @description
 *   Shared input types, parameter interfaces, and re-exported domain types
 *   used across the service and controller layers. These types define the
 *   shape of data flowing INTO the system (inputs/params), while DTOs in
 *   `dtos.ts` define the shape of data flowing OUT (responses).
 *
 * @layer Shared
 */

// ---------------------------------------------------------------------------
// Shared result type for server actions
// ---------------------------------------------------------------------------

/**
 * Standard discriminated union returned by all server actions.
 * Use `result.success` to narrow to the data or error branch.
 */
export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ---------------------------------------------------------------------------
// Card + Holding input types
// ---------------------------------------------------------------------------

/**
 * Input required to create a new Card in the catalog.
 * Price is in cents.
 */
export type CreateCardInput = {
  name: string
  set: string
  setName: string
  collectorNumber: string
  finish: string
  game: string
  rarity: string
  imageSmall?: string | null
  imageNormal?: string | null
  scryfallId?: string | null
  tcgplayerId?: string | null
  marketPrice?: number | null
}

/**
 * Input required to create a new Holding (user's ownership of a card printing).
 * Prices are in cents.
 */
export type CreateHoldingInput = {
  cardId: string
  quantity?: number
  condition?: string
  notes?: string | null
  listedForTrade?: boolean
  tradeNotes?: string | null
  idealQuantity?: number
  maxQuantity?: number
  acquiredPrice?: number | null
  acquiredAt?: Date | null
}

/**
 * Input for updating an existing Holding.
 * All fields are optional — only provided fields are updated.
 */
export type UpdateHoldingInput = {
  quantity?: number
  condition?: string
  notes?: string | null
  listedForTrade?: boolean
  listedQuantity?: number
  askType?: string | null
  askValue?: number | null
  tradeNotes?: string | null
  idealQuantity?: number
  maxQuantity?: number
  acquiredPrice?: number | null
  acquiredAt?: Date | null
}

/**
 * Input for making a trade offer on a listed holding.
 */
export type MakeOfferInput = {
  holdingId: string
  cashAmount: number
  message?: string
  cards: { holdingId: string; quantity: number }[]
}

/**
 * Filter and sort parameters for the trade binder page.
 */
export type TradeBinderFilterInput = {
  search?: string
  game?: string
  condition?: string
  showMine?: boolean
  sort?: "recent" | "name" | "set" | "owner"
}

/**
 * Filter parameters for the user's personal collection (holdings) view.
 */
export type HoldingFilterInput = {
  search?: string
  game?: string
  set?: string
  condition?: string
  listedForTrade?: boolean
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

/**
 * Input for inviting a new team member.
 */
export interface InviteTeamMemberInput {
  name: string
  email: string
  password: string
  role: "ADMIN" | "USER"
  permissions?: Partial<UserPermissionsInput>
}

/**
 * Input for updating an existing team member.
 */
export interface UpdateTeamMemberInput {
  id: string
  name: string
  role: "ADMIN" | "USER"
  permissions?: Partial<UserPermissionsInput>
}

/**
 * Granular permission flags for users.
 */
export interface UserPermissionsInput {
  inventoryUpdatePrices: boolean
  addCardsAccess: boolean
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Input for updating store settings.
 * Shop-specific fields (shipping, POS) removed during personal-tracker pivot.
 */
export interface UpdateStoreSettingsInput {
  storeName?: string
  contactEmail?: string | null
  taxRate?: number
  currency?: string
}

// ---------------------------------------------------------------------------
// Re-exports for backwards compatibility
// ---------------------------------------------------------------------------

/** Team member shape used by the team management UI. */
export type TeamMember = {
  id: string
  name: string | null
  email: string | null
  role: string
  createdAt: Date
  permissions: UserPermissionsInput | null
}

/** Store settings shape used by the settings UI. */
export type StoreSettingsData = {
  storeName: string
  contactEmail: string | null
  taxRate: number
  currency: string
  updatedAt: Date | null
}
