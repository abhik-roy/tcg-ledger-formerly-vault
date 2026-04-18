# Trade Offer System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the passive TradeInterest system with a full offer system where users propose cash + cards, owners accept/decline with messages, accepted trades auto-update collections, and either party can void.

**Architecture:** Drop TradeInterest, add TradeOffer + TradeOfferCard models. New trade-offer repository handles all DB access. Server actions validate ownership/status, execute trades in Prisma transactions, and log to the ledger. UI replaces "Interested" with "Make Offer" dialog that includes a card picker and cash input. Email notification on new offers.

**Tech Stack:** Prisma 6 (migrations), Next.js 16 server actions, Vitest, React (shadcn/Radix), Nodemailer + React Email.

**Spec:** `docs/superpowers/specs/2026-04-17-trade-offer-system-design.md`

---

## File Structure

### New files

| Path                                                      | Responsibility                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `prisma/migrations/<ts>_trade_offer_system/migration.sql` | Schema migration                                                                                                   |
| `src/repositories/trade-offer.repository.ts`              | TradeOffer + TradeOfferCard Prisma queries                                                                         |
| `src/app/actions/trade-offer.ts`                          | Server actions: makeOffer, acceptOffer, declineOffer, withdrawOffer, voidOffer, getMyOffers, getOffersOnMyListings |
| `src/components/admin/MakeOfferDialog.tsx`                | Offer creation dialog with cash input + card picker                                                                |
| `src/components/admin/OffersPanel.tsx`                    | Two-tab panel replacing TradeInterestsPanel                                                                        |
| `src/components/admin/CardPickerDialog.tsx`               | Searchable picker for selecting cards from user's trade binder                                                     |
| `src/components/emails/NewOfferEmail.tsx`                 | React Email template for offer notifications                                                                       |
| `src/tests/services/trade-offer.test.ts`                  | Unit tests for offer actions                                                                                       |

### Modified files

| Path                                              | Changes                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                            | Drop TradeInterest, add TradeOffer + TradeOfferCard, add askType/askValue to Holding, update User/Holding relations |
| `src/lib/dtos.ts`                                 | Add TradeOfferDTO, TradeOfferCardDTO, update TradeBinderItemDTO (askPrice, offerCount replaces interestCount)       |
| `src/lib/types.ts`                                | Add MakeOfferInput, UpdateListingInput                                                                              |
| `src/mappers/trade-binder.mapper.ts`              | Map offer count + ask price, drop interest mapping                                                                  |
| `src/repositories/holding.repository.ts`          | Update TRADE_BINDER_SELECT for offer count, add ask fields to selects                                               |
| `src/services/holding.service.ts`                 | Update listTradeBinder signature, remove interest fetching                                                          |
| `src/services/email.service.ts`                   | Add sendNewOfferNotification method                                                                                 |
| `src/app/actions/trade-binder.ts`                 | Remove interest passing, pass offers instead                                                                        |
| `src/app/actions/holding.ts`                      | Add askType/askValue to toggleTradeListingAction                                                                    |
| `src/components/admin/TradeBinderClient.tsx`      | Replace interest UI with offer UI, ask price display, Make Offer button                                             |
| `src/components/admin/CollectionClient.tsx`       | Add ask type/value controls to listing UI                                                                           |
| `src/components/admin/AdminSidebar.tsx`           | Fetch and display pending offer count badge                                                                         |
| `src/app/admin/(dashboard)/trade-binder/page.tsx` | Wire up new components, fetch user's listed holdings for card picker                                                |
| `src/tests/utils/fixtures.ts`                     | Update mock DTOs                                                                                                    |

### Deleted files

| Path                                            | Reason                                |
| ----------------------------------------------- | ------------------------------------- |
| `src/repositories/trade-interest.repository.ts` | Replaced by trade-offer.repository.ts |
| `src/app/actions/trade-interest.ts`             | Replaced by trade-offer.ts            |
| `src/components/admin/TradeInterestsPanel.tsx`  | Replaced by OffersPanel.tsx           |

---

## Task 1: Schema migration

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_trade_offer_system/migration.sql`

- [ ] **Step 1: Update Prisma schema**

In `prisma/schema.prisma`:

Remove the `TradeInterest` model entirely (lines ~101-116).

Remove `tradeInterests TradeInterest[]` from Holding model.
Remove `tradeInterests TradeInterest[]` from User model.

Add to Holding model (after `listedQuantity`):

```prisma
  askType        String?  @db.VarChar(32)
  askValue       Int?
  tradeOffers    TradeOffer[]
  offeredInTrades TradeOfferCard[] @relation("OfferedInTrades")
```

Add to User model (replacing tradeInterests):

```prisma
  tradeOffers    TradeOffer[]
```

Add new models after Holding:

```prisma
model TradeOffer {
  id             String   @id @default(cuid())
  holdingId      String
  offerUserId    String
  cashAmount     Int      @default(0)
  message        String?  @db.VarChar(512)
  status         String   @default("pending") @db.VarChar(32)
  declineMessage String?  @db.VarChar(512)
  completedAt    DateTime?
  voidedAt       DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  holding        Holding        @relation(fields: [holdingId], references: [id], onDelete: Cascade)
  offerUser      User           @relation(fields: [offerUserId], references: [id], onDelete: Cascade)
  offeredCards   TradeOfferCard[]

  @@index([holdingId])
  @@index([offerUserId])
  @@index([status])
}

model TradeOfferCard {
  id           String @id @default(cuid())
  tradeOfferId String
  holdingId    String
  quantity     Int

  tradeOffer   TradeOffer @relation(fields: [tradeOfferId], references: [id], onDelete: Cascade)
  holding      Holding    @relation("OfferedInTrades", fields: [holdingId], references: [id], onDelete: Restrict)

  @@index([tradeOfferId])
}
```

- [ ] **Step 2: Create migration**

```bash
DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" \
  npx prisma migrate dev --create-only --name trade-offer-system
```

Expected: migration file created.

- [ ] **Step 3: Apply migration to dev DB**

```bash
DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" \
  npx prisma migrate deploy
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
DATABASE_URL="postgres://fake:fake@localhost:5432/fake" npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "schema: add TradeOffer + TradeOfferCard, drop TradeInterest"
```

---

## Task 2: DTOs and types

**Files:**

- Modify: `src/lib/dtos.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Update dtos.ts**

Remove `TradeInterestDTO` type. Remove `interestCount` and `myInterest` from `TradeBinderItemDTO`.

Add these types:

```typescript
export type TradeOfferCardDTO = {
  id: string
  holdingId: string
  card: CardDTO
  condition: string
  quantity: number
  marketValue: number | null // card.marketPrice * quantity, null if no price
}

export type TradeOfferDTO = {
  id: string
  holdingId: string
  card: CardDTO // the card being requested
  cardCondition: string
  askPrice: number | null // effective ask in cents
  offerUser: { id: string; displayName: string | null; email: string }
  cashAmount: number // cents
  offeredCards: TradeOfferCardDTO[]
  offeredCardsValue: number // sum of marketValue across offered cards
  message: string | null
  status: string
  declineMessage: string | null
  completedAt: Date | null
  voidedAt: Date | null
  createdAt: Date
}
```

Update `TradeBinderItemDTO`:

```typescript
export type TradeBinderItemDTO = {
  holdingId: string
  card: CardDTO
  quantity: number
  listedQuantity: number
  condition: string
  owner: { id: string; displayName: string | null; email: string }
  listedAt: Date
  tradeNotes: string | null
  askType: string | null // replaces interestCount
  askValue: number | null
  askPrice: number | null // computed effective price in cents
  offerCount: number // replaces interestCount
  myOffer: TradeOfferDTO | null // replaces myInterest
}
```

- [ ] **Step 2: Update types.ts**

Add to `src/lib/types.ts`:

```typescript
export type MakeOfferInput = {
  holdingId: string
  cashAmount: number // cents
  message?: string
  cards: { holdingId: string; quantity: number }[]
}
```

Add to `UpdateHoldingInput`:

```typescript
  askType?: string | null
  askValue?: number | null
```

- [ ] **Step 3: Verify typecheck shows expected errors**

```bash
npm run typecheck 2>&1 | grep "error TS" | grep -v "src/tests/" | head -20
```

Expected: errors in files that still reference TradeInterestDTO — these will be fixed in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/lib/dtos.ts src/lib/types.ts
git commit -m "types: add TradeOfferDTO, update TradeBinderItemDTO"
```

---

## Task 3: Repository

**Files:**

- Create: `src/repositories/trade-offer.repository.ts`
- Delete: `src/repositories/trade-interest.repository.ts`
- Modify: `src/repositories/holding.repository.ts`

- [ ] **Step 1: Delete old repository**

```bash
rm src/repositories/trade-interest.repository.ts
```

- [ ] **Step 2: Create trade-offer.repository.ts**

```typescript
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

const OFFER_CARD_SELECT = {
  id: true,
  holdingId: true,
  quantity: true,
  holding: {
    select: {
      condition: true,
      card: {
        select: {
          id: true,
          name: true,
          set: true,
          setName: true,
          collectorNumber: true,
          finish: true,
          game: true,
          rarity: true,
          imageSmall: true,
          imageNormal: true,
          marketPrice: true,
          marketPriceAt: true,
        },
      },
    },
  },
} as const

const OFFER_SELECT = {
  id: true,
  holdingId: true,
  offerUserId: true,
  cashAmount: true,
  message: true,
  status: true,
  declineMessage: true,
  completedAt: true,
  voidedAt: true,
  createdAt: true,
  updatedAt: true,
  offerUser: {
    select: { id: true, displayName: true, email: true },
  },
  offeredCards: {
    select: OFFER_CARD_SELECT,
  },
  holding: {
    select: {
      condition: true,
      askType: true,
      askValue: true,
      quantity: true,
      listedQuantity: true,
      userId: true,
      card: {
        select: {
          id: true,
          name: true,
          set: true,
          setName: true,
          collectorNumber: true,
          finish: true,
          game: true,
          rarity: true,
          imageSmall: true,
          imageNormal: true,
          marketPrice: true,
          marketPriceAt: true,
        },
      },
    },
  },
} as const

export class TradeOfferRepository {
  static async create(data: {
    holdingId: string
    offerUserId: string
    cashAmount: number
    message?: string | null
    offeredCards: { holdingId: string; quantity: number }[]
  }) {
    return prisma.tradeOffer.create({
      data: {
        holdingId: data.holdingId,
        offerUserId: data.offerUserId,
        cashAmount: data.cashAmount,
        message: data.message ?? null,
        offeredCards: {
          create: data.offeredCards.map((c) => ({
            holdingId: c.holdingId,
            quantity: c.quantity,
          })),
        },
      },
      select: OFFER_SELECT,
    })
  }

  static async findById(id: string) {
    return prisma.tradeOffer.findUnique({
      where: { id },
      select: OFFER_SELECT,
    })
  }

  static async findByHolding(holdingId: string) {
    return prisma.tradeOffer.findMany({
      where: { holdingId },
      select: OFFER_SELECT,
      orderBy: { createdAt: "desc" },
    })
  }

  static async findByOfferUser(userId: string) {
    return prisma.tradeOffer.findMany({
      where: { offerUserId: userId },
      select: OFFER_SELECT,
      orderBy: { createdAt: "desc" },
    })
  }

  static async findOffersOnUserListings(userId: string) {
    return prisma.tradeOffer.findMany({
      where: { holding: { userId } },
      select: OFFER_SELECT,
      orderBy: { createdAt: "desc" },
    })
  }

  static async findPendingByHoldingAndUser(holdingId: string, userId: string) {
    return prisma.tradeOffer.findFirst({
      where: { holdingId, offerUserId: userId, status: "pending" },
      select: { id: true },
    })
  }

  static async countPendingByHolding(holdingId: string): Promise<number> {
    return prisma.tradeOffer.count({
      where: { holdingId, status: "pending" },
    })
  }

  static async countPendingOnUserListings(userId: string): Promise<number> {
    return prisma.tradeOffer.count({
      where: { holding: { userId }, status: "pending" },
    })
  }

  static async updateStatus(
    id: string,
    status: string,
    extra?: { declineMessage?: string; completedAt?: Date; voidedAt?: Date }
  ) {
    return prisma.tradeOffer.update({
      where: { id },
      data: { status, ...extra },
      select: OFFER_SELECT,
    })
  }

  static async declinePendingByHolding(holdingId: string, excludeOfferId: string, message: string) {
    return prisma.tradeOffer.updateMany({
      where: { holdingId, status: "pending", id: { not: excludeOfferId } },
      data: { status: "declined", declineMessage: message },
    })
  }
}
```

- [ ] **Step 3: Update holding.repository.ts**

Update `TRADE_BINDER_SELECT` — replace `_count: { select: { tradeInterests: true } }` with:

```typescript
  _count: { select: { tradeOffers: { where: { status: "pending" } } } },
  askType: true,
  askValue: true,
```

Add `askType` and `askValue` to `HOLDING_LIST_SELECT`.

- [ ] **Step 4: Commit**

```bash
git add src/repositories/
git commit -m "repo: add TradeOfferRepository, drop TradeInterestRepository"
```

---

## Task 4: Mappers

**Files:**

- Modify: `src/mappers/trade-binder.mapper.ts`

- [ ] **Step 1: Rewrite trade-binder.mapper.ts**

Remove `toTradeInterestDTO` and all interest mapping. Replace with:

```typescript
import type { TradeBinderItemDTO, TradeOfferDTO, TradeOfferCardDTO, CardDTO } from "@/lib/dtos"
import { toCardDTO } from "./holding.mapper"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function computeAskPrice(
  askType: string | null,
  askValue: number | null,
  marketPrice: number | null
): number | null {
  if (!askType || askValue == null) return null
  if (askType === "custom") return askValue
  if (askType === "percent" && marketPrice != null)
    return Math.round((marketPrice * askValue) / 100)
  return null // trade_only
}

export function toTradeOfferCardDTO(row: Row): TradeOfferCardDTO {
  const card = toCardDTO(row.holding.card)
  return {
    id: row.id,
    holdingId: row.holdingId,
    card,
    condition: row.holding.condition,
    quantity: row.quantity,
    marketValue: card.marketPrice != null ? card.marketPrice * row.quantity : null,
  }
}

export function toTradeOfferDTO(row: Row): TradeOfferDTO {
  const card = toCardDTO(row.holding.card)
  const offeredCards = (row.offeredCards || []).map(toTradeOfferCardDTO)
  return {
    id: row.id,
    holdingId: row.holdingId,
    card,
    cardCondition: row.holding.condition,
    askPrice: computeAskPrice(row.holding.askType, row.holding.askValue, card.marketPrice),
    offerUser: {
      id: row.offerUser.id,
      displayName: row.offerUser.displayName ?? null,
      email: row.offerUser.email,
    },
    cashAmount: row.cashAmount,
    offeredCards,
    offeredCardsValue: offeredCards.reduce(
      (sum: number, c: TradeOfferCardDTO) => sum + (c.marketValue ?? 0),
      0
    ),
    message: row.message ?? null,
    status: row.status,
    declineMessage: row.declineMessage ?? null,
    completedAt: row.completedAt ?? null,
    voidedAt: row.voidedAt ?? null,
    createdAt: row.createdAt,
  }
}

export function toTradeBinderItemDTO(row: Row): TradeBinderItemDTO {
  const card = toCardDTO(row.card)
  return {
    holdingId: row.id,
    card,
    quantity: row.quantity,
    listedQuantity: row.listedQuantity ?? row.quantity,
    condition: row.condition,
    owner: {
      id: row.user.id,
      displayName: row.user.displayName ?? null,
      email: row.user.email,
    },
    listedAt: row.updatedAt,
    tradeNotes: row.tradeNotes ?? null,
    askType: row.askType ?? null,
    askValue: row.askValue ?? null,
    askPrice: computeAskPrice(row.askType, row.askValue, card.marketPrice),
    offerCount: row._count?.tradeOffers ?? 0,
    myOffer: null, // populated by the action layer
  }
}

export function toTradeBinderItemDTOs(rows: Row[]): TradeBinderItemDTO[] {
  return rows.map(toTradeBinderItemDTO)
}
```

- [ ] **Step 2: Update mappers/index.ts**

Remove `trade-interest` references if any. Ensure `trade-binder.mapper` is exported.

- [ ] **Step 3: Commit**

```bash
git add src/mappers/
git commit -m "mappers: replace interest mapping with offer mapping"
```

---

## Task 5: Server actions

**Files:**

- Create: `src/app/actions/trade-offer.ts`
- Delete: `src/app/actions/trade-interest.ts`
- Modify: `src/app/actions/trade-binder.ts`
- Modify: `src/app/actions/holding.ts`
- Modify: `src/services/holding.service.ts`

- [ ] **Step 1: Delete old actions**

```bash
rm src/app/actions/trade-interest.ts
```

- [ ] **Step 2: Create trade-offer.ts**

```typescript
"use server"

import { prisma } from "@/lib/prisma"
import { TradeOfferRepository } from "@/repositories/trade-offer.repository"
import { LoggingService } from "@/services/logging.service"
import { EmailService } from "@/services/email.service"
import { requireUser } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { toTradeOfferDTO } from "@/mappers/trade-binder.mapper"
import type { ActionResult, MakeOfferInput } from "@/lib/types"
import type { TradeOfferDTO } from "@/lib/dtos"

export async function makeOffer(input: MakeOfferInput): Promise<ActionResult<TradeOfferDTO>> {
  const session = await requireUser()
  const userId = session.user.id
  try {
    // Validate listing exists and is not own
    const holding = await prisma.holding.findUnique({
      where: { id: input.holdingId },
      select: {
        userId: true,
        listedForTrade: true,
        card: { select: { name: true } },
        user: { select: { email: true } },
      },
    })
    if (!holding) return { success: false, error: "Listing not found" }
    if (!holding.listedForTrade) return { success: false, error: "Card is not listed for trade" }
    if (holding.userId === userId)
      return { success: false, error: "Cannot offer on your own listing" }

    // Check no existing pending offer
    const existing = await TradeOfferRepository.findPendingByHoldingAndUser(input.holdingId, userId)
    if (existing)
      return { success: false, error: "You already have a pending offer on this listing" }

    // Validate offered cards belong to offeror and are listed
    for (const c of input.cards) {
      const h = await prisma.holding.findUnique({
        where: { id: c.holdingId },
        select: { userId: true, listedForTrade: true, listedQuantity: true },
      })
      if (!h || h.userId !== userId)
        return { success: false, error: "Offered card not found in your collection" }
      if (!h.listedForTrade)
        return { success: false, error: "Offered card is not listed for trade" }
      if (c.quantity > h.listedQuantity)
        return { success: false, error: "Offered quantity exceeds listed amount" }
    }

    const row = await TradeOfferRepository.create({
      holdingId: input.holdingId,
      offerUserId: userId,
      cashAmount: input.cashAmount,
      message: input.message,
      offeredCards: input.cards,
    })

    // Fire-and-forget email to listing owner
    EmailService.sendNewOfferNotification({
      ownerEmail: holding.user.email,
      cardName: holding.card.name,
      offerorName: session.user.name || session.user.email || "Someone",
      cashAmount: input.cashAmount,
      cardCount: input.cards.length,
    }).catch(() => {})

    revalidatePath("/admin/trade-binder")
    return { success: true, data: toTradeOfferDTO(row) }
  } catch (error) {
    console.error("Make Offer Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function acceptOffer(offerId: string, message?: string): Promise<ActionResult<void>> {
  const session = await requireUser()
  try {
    const offer = await TradeOfferRepository.findById(offerId)
    if (!offer) return { success: false, error: "Offer not found" }
    if (offer.holding.userId !== session.user.id)
      return { success: false, error: "Not your listing" }
    if (offer.status !== "pending") return { success: false, error: "Offer is no longer pending" }

    const listedQty = offer.holding.listedQuantity
    if (offer.holding.quantity < listedQty) {
      return { success: false, error: "Insufficient quantity to complete trade" }
    }

    // Execute trade in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update offer status
      await tx.tradeOffer.update({
        where: { id: offerId },
        data: { status: "accepted", completedAt: new Date(), declineMessage: message ?? null },
      })

      // 2. Decrease owner's holding
      const newOwnerQty = offer.holding.quantity - listedQty
      await tx.holding.update({
        where: { id: offer.holdingId },
        data: {
          quantity: newOwnerQty,
          listedQuantity: 0,
          listedForTrade: newOwnerQty <= 0 ? false : undefined,
        },
      })

      // 3. Create holding for offeror (the card they're getting)
      await tx.holding.upsert({
        where: {
          user_printing_condition: {
            userId: offer.offerUserId,
            cardId: offer.holding.card.id,
            condition: offer.holding.condition,
          },
        },
        create: {
          userId: offer.offerUserId,
          cardId: offer.holding.card.id,
          condition: offer.holding.condition,
          quantity: listedQty,
        },
        update: { quantity: { increment: listedQty } },
      })

      // 4. Process offered cards
      for (const oc of offer.offeredCards) {
        // Decrease offeror's holding
        await tx.holding.update({
          where: { id: oc.holdingId },
          data: { quantity: { decrement: oc.quantity } },
        })

        // Create holding for owner (cards they're receiving)
        await tx.holding.upsert({
          where: {
            user_printing_condition: {
              userId: offer.holding.userId,
              cardId: oc.holding.card.id,
              condition: oc.holding.condition,
            },
          },
          create: {
            userId: offer.holding.userId,
            cardId: oc.holding.card.id,
            condition: oc.holding.condition,
            quantity: oc.quantity,
          },
          update: { quantity: { increment: oc.quantity } },
        })
      }

      // 5. Auto-decline other pending offers on same listing
      await tx.tradeOffer.updateMany({
        where: { holdingId: offer.holdingId, status: "pending", id: { not: offerId } },
        data: { status: "declined", declineMessage: "Listing fulfilled" },
      })
    })

    // Log to ledger
    await LoggingService.logQuantityChange({
      userId: offer.holding.userId,
      holdingId: offer.holdingId,
      cardName: offer.holding.card.name,
      cardSet: offer.holding.card.set,
      finish: offer.holding.card.finish,
      delta: -listedQty,
      reason: "trade",
      actorId: session.user.id,
    })
    await LoggingService.logQuantityChange({
      userId: offer.offerUserId,
      cardName: offer.holding.card.name,
      cardSet: offer.holding.card.set,
      finish: offer.holding.card.finish,
      delta: listedQty,
      reason: "trade",
      actorId: session.user.id,
    })
    for (const oc of offer.offeredCards) {
      await LoggingService.logQuantityChange({
        userId: offer.offerUserId,
        holdingId: oc.holdingId,
        cardName: oc.holding.card.name,
        cardSet: oc.holding.card.set,
        finish: oc.holding.card.finish,
        delta: -oc.quantity,
        reason: "trade",
        actorId: session.user.id,
      })
      await LoggingService.logQuantityChange({
        userId: offer.holding.userId,
        cardName: oc.holding.card.name,
        cardSet: oc.holding.card.set,
        finish: oc.holding.card.finish,
        delta: oc.quantity,
        reason: "trade",
        actorId: session.user.id,
      })
    }

    revalidatePath("/admin/trade-binder")
    revalidatePath("/admin/collection")
    revalidatePath("/admin/ledger")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Accept Offer Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function declineOffer(offerId: string, message?: string): Promise<ActionResult<void>> {
  const session = await requireUser()
  try {
    const offer = await TradeOfferRepository.findById(offerId)
    if (!offer) return { success: false, error: "Offer not found" }
    if (offer.holding.userId !== session.user.id)
      return { success: false, error: "Not your listing" }
    if (offer.status !== "pending") return { success: false, error: "Offer is no longer pending" }

    await TradeOfferRepository.updateStatus(offerId, "declined", {
      declineMessage: message ?? undefined,
    })
    revalidatePath("/admin/trade-binder")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Decline Offer Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function withdrawOffer(offerId: string): Promise<ActionResult<void>> {
  const session = await requireUser()
  try {
    const offer = await TradeOfferRepository.findById(offerId)
    if (!offer) return { success: false, error: "Offer not found" }
    if (offer.offerUserId !== session.user.id) return { success: false, error: "Not your offer" }
    if (offer.status !== "pending") return { success: false, error: "Offer is no longer pending" }

    await TradeOfferRepository.updateStatus(offerId, "withdrawn")
    revalidatePath("/admin/trade-binder")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Withdraw Offer Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function voidOffer(offerId: string): Promise<ActionResult<void>> {
  const session = await requireUser()
  try {
    const offer = await TradeOfferRepository.findById(offerId)
    if (!offer) return { success: false, error: "Offer not found" }
    if (offer.status !== "accepted")
      return { success: false, error: "Only accepted trades can be voided" }
    // Either party can void
    if (offer.holding.userId !== session.user.id && offer.offerUserId !== session.user.id) {
      return { success: false, error: "Not your trade" }
    }

    const listedQty = offer.holding.listedQuantity || 1 // fallback: listedQty was zeroed on accept

    await prisma.$transaction(async (tx) => {
      // Reverse: restore owner's holding
      await tx.holding.update({
        where: { id: offer.holdingId },
        data: {
          quantity: { increment: listedQty },
          listedForTrade: true,
          listedQuantity: listedQty,
        },
      })

      // Reverse: remove/decrement offeror's copy of the traded card
      const offerorHolding = await tx.holding.findUnique({
        where: {
          user_printing_condition: {
            userId: offer.offerUserId,
            cardId: offer.holding.card.id,
            condition: offer.holding.condition,
          },
        },
      })
      if (offerorHolding) {
        const newQty = offerorHolding.quantity - listedQty
        if (newQty <= 0) {
          await tx.holding.delete({ where: { id: offerorHolding.id } })
        } else {
          await tx.holding.update({ where: { id: offerorHolding.id }, data: { quantity: newQty } })
        }
      }

      // Reverse: restore offeror's offered cards, remove owner's received copies
      for (const oc of offer.offeredCards) {
        await tx.holding.update({
          where: { id: oc.holdingId },
          data: { quantity: { increment: oc.quantity } },
        })

        const ownerCopy = await tx.holding.findUnique({
          where: {
            user_printing_condition: {
              userId: offer.holding.userId,
              cardId: oc.holding.card.id,
              condition: oc.holding.condition,
            },
          },
        })
        if (ownerCopy) {
          const newQty = ownerCopy.quantity - oc.quantity
          if (newQty <= 0) {
            await tx.holding.delete({ where: { id: ownerCopy.id } })
          } else {
            await tx.holding.update({ where: { id: ownerCopy.id }, data: { quantity: newQty } })
          }
        }
      }

      await tx.tradeOffer.update({
        where: { id: offerId },
        data: { status: "voided", voidedAt: new Date() },
      })
    })

    // Log void to ledger
    await LoggingService.logQuantityChange({
      userId: offer.holding.userId,
      holdingId: offer.holdingId,
      cardName: offer.holding.card.name,
      cardSet: offer.holding.card.set,
      delta: listedQty,
      reason: "trade voided",
      actorId: session.user.id,
    })

    revalidatePath("/admin/trade-binder")
    revalidatePath("/admin/collection")
    revalidatePath("/admin/ledger")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Void Offer Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function getMyOffers(): Promise<ActionResult<TradeOfferDTO[]>> {
  const session = await requireUser()
  try {
    const rows = await TradeOfferRepository.findByOfferUser(session.user.id)
    return { success: true, data: rows.map(toTradeOfferDTO) }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function getOffersOnMyListings(): Promise<ActionResult<TradeOfferDTO[]>> {
  const session = await requireUser()
  try {
    const rows = await TradeOfferRepository.findOffersOnUserListings(session.user.id)
    return { success: true, data: rows.map(toTradeOfferDTO) }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function getPendingOfferCount(): Promise<number> {
  const session = await requireUser()
  return TradeOfferRepository.countPendingOnUserListings(session.user.id)
}
```

- [ ] **Step 3: Update trade-binder.ts**

Remove interest-related imports and logic. Update to pass offer data:

```typescript
"use server"

import { HoldingService } from "@/services/holding.service"
import { TradeOfferRepository } from "@/repositories/trade-offer.repository"
import { requireUser } from "@/lib/auth-guard"
import { toTradeOfferDTO } from "@/mappers/trade-binder.mapper"
import type { ActionResult, TradeBinderFilterInput } from "@/lib/types"
import type { TradeBinderItemDTO } from "@/lib/dtos"

export async function getTradeBinder(
  filter: TradeBinderFilterInput = {}
): Promise<ActionResult<TradeBinderItemDTO[]>> {
  const session = await requireUser()
  try {
    const listings = await HoldingService.listTradeBinder({
      ...filter,
      excludeUserId: filter.showMine ? undefined : session.user.id,
    })

    // Fetch current user's pending offers to mark "myOffer" on each listing
    const myOffers = await TradeOfferRepository.findByOfferUser(session.user.id)
    const myOffersByHolding = new Map(
      myOffers.filter((o) => o.status === "pending").map((o) => [o.holdingId, toTradeOfferDTO(o)])
    )

    const enriched = listings.map((l) => ({
      ...l,
      myOffer: myOffersByHolding.get(l.holdingId) ?? null,
    }))

    return { success: true, data: enriched }
  } catch (error) {
    console.error("Trade Binder Error:", error)
    return { success: false, error: (error as Error).message }
  }
}
```

- [ ] **Step 4: Update holding.ts — add askType/askValue to toggle action**

Update `toggleTradeListingAction` signature to accept ask parameters:

```typescript
export async function toggleTradeListingAction(
  holdingId: string,
  listedQuantity: number,
  notes?: string,
  askType?: string | null,
  askValue?: number | null
): Promise<ActionResult<HoldingDTO>> {
  const session = await requireUser()
  await requireOwnership(holdingId, session.user.id)
  try {
    const data = await HoldingService.toggleListing(
      holdingId,
      listedQuantity,
      notes,
      askType,
      askValue
    )
    revalidatePath("/admin/collection")
    revalidatePath("/admin/trade-binder")
    return { success: true, data }
  } catch (error) {
    console.error("Toggle Trade Listing Error:", error)
    return { success: false, error: (error as Error).message }
  }
}
```

- [ ] **Step 5: Update holding.service.ts — pass ask fields through**

Update `toggleListing`:

```typescript
static async toggleListing(
  id: string,
  listedQuantity: number,
  notes?: string,
  askType?: string | null,
  askValue?: number | null
): Promise<HoldingDTO> {
  const row = await HoldingRepository.update(id, {
    listedForTrade: listedQuantity > 0,
    listedQuantity: Math.max(0, listedQuantity),
    tradeNotes: notes,
    askType: listedQuantity > 0 ? askType : null,
    askValue: listedQuantity > 0 ? askValue : null,
  } as UpdateHoldingInput)
  return toHoldingDTO(row)
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/ src/services/holding.service.ts
git commit -m "actions: add trade offer actions, drop trade interest actions"
```

---

## Task 6: Email notification

**Files:**

- Modify: `src/services/email.service.ts`

- [ ] **Step 1: Add sendNewOfferNotification method**

Add to EmailService class:

```typescript
static async sendNewOfferNotification(data: {
  ownerEmail: string
  cardName: string
  offerorName: string
  cashAmount: number
  cardCount: number
}): Promise<void> {
  try {
    const cashStr = data.cashAmount > 0 ? `$${(data.cashAmount / 100).toFixed(2)}` : "no cash"
    const cardsStr = data.cardCount > 0 ? `${data.cardCount} card${data.cardCount > 1 ? "s" : ""}` : ""
    const offerSummary = [cashStr, cardsStr].filter(Boolean).join(" + ")

    await transporter.sendMail({
      from: `"TCG Ledger" <${process.env.NODEMAILER_FROM || "noreply@tcgledger.local"}>`,
      to: data.ownerEmail,
      subject: `New offer on ${data.cardName}`,
      html: `
        <p><strong>${data.offerorName}</strong> made an offer on your <strong>${data.cardName}</strong>.</p>
        <p>Offer: ${offerSummary}</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || ""}/admin/trade-binder">View in Trade Binder</a></p>
      `,
    })
  } catch (error) {
    console.error("Failed to send offer notification:", error)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/email.service.ts
git commit -m "email: add new offer notification"
```

---

## Task 7: UI — Collection page ask price controls

**Files:**

- Modify: `src/components/admin/CollectionClient.tsx`

- [ ] **Step 1: Update the trade column**

When a card is listed, show ask type dropdown + value input alongside the listed quantity controls. When ask type is "trade_only", hide the value input.

The existing trade column (in the `<td>` for desktop) currently shows a quantity input when listed or a "List" button. Expand it to include:

```tsx
{
  h.listedForTrade && (
    <div className="flex items-center gap-1 mt-1">
      <select
        defaultValue={h.askType || ""}
        onChange={(e) => {
          const type = e.target.value || null
          handleToggleTrade(
            h,
            h.listedQuantity,
            undefined,
            type,
            type === "trade_only" ? null : h.askValue
          )
        }}
        className="h-6 text-[11px] border border-border rounded bg-muted/40 text-muted-foreground"
      >
        <option value="">No ask</option>
        <option value="custom">$ Price</option>
        <option value="percent">% Market</option>
        <option value="trade_only">Trade Only</option>
      </select>
      {h.askType && h.askType !== "trade_only" && (
        <input
          type="number"
          min="0"
          defaultValue={
            h.askType === "custom" ? ((h.askValue ?? 0) / 100).toFixed(2) : (h.askValue ?? 0)
          }
          onBlur={(e) => {
            const raw = parseFloat(e.target.value) || 0
            const val = h.askType === "custom" ? Math.round(raw * 100) : Math.round(raw)
            handleToggleTrade(h, h.listedQuantity, undefined, h.askType, val)
          }}
          className="w-14 h-6 text-center text-[11px] border border-border rounded bg-muted/40 tabular-nums"
        />
      )}
    </div>
  )
}
```

Update `handleToggleTrade` to accept ask parameters:

```typescript
async function handleToggleTrade(
  h: HoldingDTO,
  qty?: number,
  notes?: string,
  askType?: string | null,
  askValue?: number | null
) {
  const newQty = qty !== undefined ? qty : h.listedForTrade ? 0 : h.quantity
  const res = await toggleTradeListingAction(h.id, newQty, notes, askType, askValue)
  // ... rest same
}
```

- [ ] **Step 2: Update HoldingDTO usage — add askType/askValue**

Add to `HoldingDTO` in `dtos.ts` (if not already there):

```typescript
askType: string | null
askValue: number | null
```

Update `toHoldingDTO` in `holding.mapper.ts`:

```typescript
  askType: holding.askType ?? null,
  askValue: holding.askValue ?? null,
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/CollectionClient.tsx src/lib/dtos.ts src/mappers/holding.mapper.ts
git commit -m "ui: add ask price controls to collection listing"
```

---

## Task 8: UI — Trade binder with offers

**Files:**

- Create: `src/components/admin/MakeOfferDialog.tsx`
- Create: `src/components/admin/CardPickerDialog.tsx`
- Create: `src/components/admin/OffersPanel.tsx`
- Modify: `src/components/admin/TradeBinderClient.tsx`
- Delete: `src/components/admin/TradeInterestsPanel.tsx`
- Modify: `src/app/admin/(dashboard)/trade-binder/page.tsx`

This is the largest task. The agent implementing this should read the spec section 5 (UI) and the existing TradeBinderClient.tsx for patterns, then:

- [ ] **Step 1: Delete TradeInterestsPanel.tsx**

```bash
rm src/components/admin/TradeInterestsPanel.tsx
```

- [ ] **Step 2: Create CardPickerDialog.tsx**

A dialog that shows the current user's trade-listed holdings as a searchable grid. Each card has a quantity selector (max = listedQuantity). Returns selected cards via a callback.

Props: `{ open, onClose, onSelect: (cards: { holdingId: string; quantity: number; card: CardDTO; condition: string }[]) => void, holdings: HoldingDTO[] }`

- [ ] **Step 3: Create MakeOfferDialog.tsx**

Dialog showing:

- Top: the listing card image + name + ask price
- Cash input (dollars)
- Selected cards section with "Add cards" button (opens CardPickerDialog)
- Value comparison bar
- Submit / Cancel

Props: `{ listing: TradeBinderItemDTO | null, open: boolean, onClose: () => void, myHoldings: HoldingDTO[] }`

Calls `makeOffer` action on submit.

- [ ] **Step 4: Create OffersPanel.tsx**

Two tabs replacing TradeInterestsPanel:

- "Offers on My Listings": shows each offer with card images, cash, offered cards, market values, accept/decline buttons with message fields
- "My Offers": shows what you offered, status, withdraw for pending, void for accepted

Uses `getMyOffers` and `getOffersOnMyListings` actions.

- [ ] **Step 5: Rewrite TradeBinderClient.tsx**

Replace all interest references with offer references:

- "Interested" button → "Make Offer" button
- Interest count → offer count
- Interest states map → offer states map
- Interest dialog → MakeOfferDialog
- TradeInterestsPanel → OffersPanel
- Show ask price on each tile
- Accept `myHoldings: HoldingDTO[]` prop for the card picker

- [ ] **Step 6: Update trade-binder page.tsx**

Fetch the current user's trade-listed holdings and pass them to TradeBinderClient as `myHoldings` prop (needed for the card picker).

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/ src/app/admin/
git commit -m "ui: trade offer dialog, card picker, offers panel"
```

---

## Task 9: Sidebar badge

**Files:**

- Modify: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Fetch pending offer count**

The sidebar already accepts a `badge` prop on NavLink. Add a `useEffect` to fetch the pending count:

```typescript
const [pendingOffers, setPendingOffers] = useState<number>(0)

useEffect(() => {
  if (!user?.id) return
  getPendingOfferCount()
    .then(setPendingOffers)
    .catch(() => {})
}, [user?.id])
```

Import `getPendingOfferCount` from `@/app/actions/trade-offer`.

Pass `badge={pendingOffers > 0 ? pendingOffers : undefined}` to the Trade Binder NavLink.

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "ui: show pending offer count badge on sidebar"
```

---

## Task 10: Tests

**Files:**

- Create: `src/tests/actions/trade-offer.test.ts`
- Modify: `src/tests/utils/fixtures.ts`
- Delete: `src/tests/actions/trade-binder.test.ts` (references old interests)

- [ ] **Step 1: Update fixtures.ts**

Update `makeMockTradeBinderItem` to use new fields (askType, askValue, askPrice, offerCount, myOffer instead of interestCount, myInterest).

- [ ] **Step 2: Create trade-offer.test.ts**

Test the key server actions with mocked repository:

- `makeOffer` rejects self-offers
- `makeOffer` rejects unlisted holdings
- `makeOffer` rejects duplicate pending offers
- `acceptOffer` rejects non-owner
- `acceptOffer` rejects non-pending
- `declineOffer` stores decline message
- `withdrawOffer` rejects non-offeror
- `voidOffer` rejects non-accepted status

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/tests/
git commit -m "test: trade offer action tests"
```

---

## Task 11: Deploy

- [ ] **Step 1: Apply migration to prod**

```bash
cat prisma/migrations/<ts>_trade_offer_system/migration.sql | \
  ssh melkor@192.168.1.20 "cd /opt/tcg-ledger && docker compose exec -T postgres psql -U tcg -d tcg_ledger"
```

Record in \_prisma_migrations table.

- [ ] **Step 2: Build and deploy**

```bash
DATABASE_URL="postgres://fake:fake@localhost:5432/fake" AUTH_SECRET="build-time-placeholder-min-32-chars-long" npm run build
rsync -avz --delete .next/standalone/ melkor@192.168.1.20:/opt/tcg-ledger/app/
rsync -avz --delete .next/static/ melkor@192.168.1.20:/opt/tcg-ledger/app/.next/static/
rsync -avz --delete public/ melkor@192.168.1.20:/opt/tcg-ledger/app/public/
ssh melkor@192.168.1.20 "cd /opt/tcg-ledger && docker compose restart app"
```

- [ ] **Step 3: Smoke test**

Verify trade binder loads, offer dialog opens, sidebar badge works.
