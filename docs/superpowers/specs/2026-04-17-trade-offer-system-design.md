# Design: Trade Offer System

**Date:** 2026-04-17
**Status:** Pending approval

---

## 1. Problem

The trade binder currently allows users to list cards and others to express "interest," but there's no structured interaction after that. The owner has to manually check a panel, there's no negotiation, no way to propose what you'd trade in return, and no completion step that updates collections.

## 2. Solution

Replace the interest system with a full offer system. Users make offers that combine cash and/or cards from their own trade binder. Owners accept or decline with a message. Accepted trades immediately update both parties' collection quantities. Either party can void a completed trade to reverse the changes.

## 3. Data Model

### New fields on Holding

```prisma
askType   String? @db.VarChar(32)  // "custom" | "percent" | "trade_only" | null
askValue  Int?                      // cents for custom, whole number for percent, null for trade_only
```

Effective ask price computed at display time:

- `custom`: askValue directly (cents)
- `percent`: Card.marketPrice \* askValue / 100
- `trade_only`: no cash price displayed
- `null`: no ask set (listing still works, just no price guidance)

### New models (replace TradeInterest)

```prisma
model TradeOffer {
  id             String   @id @default(cuid())
  holdingId      String                          // the listing being offered on
  offerUserId    String                          // who's making the offer
  cashAmount     Int      @default(0)            // cents
  message        String?  @db.VarChar(512)
  status         String   @default("pending") @db.VarChar(32)
                          // pending | accepted | declined | withdrawn | voided
  declineMessage String?  @db.VarChar(512)
  completedAt    DateTime?
  voidedAt       DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  holding        Holding       @relation(fields: [holdingId], references: [id], onDelete: Cascade)
  offerUser      User          @relation(fields: [offerUserId], references: [id], onDelete: Cascade)
  offeredCards   TradeOfferCard[]

  @@index([holdingId])
  @@index([offerUserId])
  @@index([status])
}

model TradeOfferCard {
  id           String @id @default(cuid())
  tradeOfferId String
  holdingId    String                        // offeror's holding being put up
  quantity     Int                           // how many of that holding

  tradeOffer   TradeOffer @relation(fields: [tradeOfferId], references: [id], onDelete: Cascade)
  holding      Holding    @relation("OfferedInTrades", fields: [holdingId], references: [id], onDelete: Restrict)
}
```

### Drop

`TradeInterest` model removed entirely.

### Holding relation updates

```prisma
model Holding {
  // existing fields...
  tradeOffers       TradeOffer[]        // offers made ON this listing
  offeredInTrades   TradeOfferCard[]  @relation("OfferedInTrades")  // times this holding was offered as payment
}
```

### User relation update

```prisma
model User {
  // existing fields...
  tradeOffers TradeOffer[]   // replaces tradeInterests
}
```

## 4. Offer Flow

### Making an offer

1. User sees listing with ask price in trade binder
2. Clicks "Make Offer"
3. Dialog shows:
   - Card being requested + ask price
   - Cash amount input (prefilled with ask, editable)
   - "Add cards" picker from user's own trade-listed holdings, each with quantity selector
   - Running value comparison: "Asking: $50 | Your offer: $20 cash + cards (~$28 market) = ~$48 total"
4. Submit creates TradeOffer + TradeOfferCard rows
5. Email sent to listing owner with offer summary
6. Sidebar badge increments

### Owner reviews

- Sidebar "Trade Binder" link shows pending offer count badge
- Offers panel (in trade binder page) shows full offer details:
  - Card images for offered cards
  - Cash amount
  - Market value comparison
  - Accept button (with optional message)
  - Decline button (with optional reason message)

### Accept

1. Status set to `accepted`, `completedAt` set to now
2. Quantity updates (all in one transaction):
   - Owner's holding: quantity -= listing's listedQuantity; if quantity reaches 0, listedForTrade set to false
   - Owner's holding: listedQuantity set to 0
   - Each TradeOfferCard: offeror's holding quantity -= offered quantity
   - New holding created for owner for each offered card (upsert by user+card+condition)
   - New holding created for offeror for the listed card (upsert by user+card+condition)
3. Ledger entries for every quantity change (reason: "trade")
4. All other pending offers on the same listing auto-declined with message "Listing fulfilled"

### Decline

1. Status set to `declined`, declineMessage stored
2. Offeror sees decline + reason in their "My Offers" tab
3. Offeror can withdraw the declined offer and submit a new one

### Withdraw

1. Offeror sets status to `withdrawn` on their own pending offer
2. No side effects

### Void

1. Either party can void an accepted trade
2. All quantity changes reverse in a transaction:
   - Restore owner's original holding quantity and listedQuantity
   - Restore offeror's holdings quantities
   - Remove the holdings created by the trade (or decrement if they've since added more)
3. Status set to `voided`, `voidedAt` set
4. Ledger entries with reason: "trade voided"

## 5. UI

### Listing tile (trade binder grid)

- Ask price displayed below card: "$50.00" or "80% mkt ($40.00)" or "Trade Only"
- "Make Offer" button (replaces "Interested")
- Offer count badge if > 0
- "Your listing" label for own cards

### Make Offer dialog

- Top: card image + name + set + condition + ask price
- Cash input (dollars, two decimal)
- "Add cards from your binder" opens a searchable picker of the user's trade-listed holdings
- Each selected card shows with quantity selector (max = their listed quantity)
- Bottom bar: "Asking: $X | Your offer: $Y cash + $Z cards = $total"
- Submit / Cancel

### Offers panel (replaces Interests panel)

Two tabs:

- **Offers on My Listings**: card name, offeror name, cash amount, offered cards (images + names), market value totals, accept/decline with message fields
- **My Offers**: card wanted, what you offered, status badge, withdraw for pending, void for accepted

### Sidebar

"Trade Binder" nav link shows pending offer count as a badge number.

### Collection page

When listing a card for trade, two new fields appear:

- Ask type: dropdown (Custom Price / % of Market / Trade Only)
- Ask value: number input (dollars for custom, percentage for percent, hidden for trade_only)

### Email

On new offer: email to listing owner with card name, offeror display name, cash offered, cards offered (names + market values), link to trade binder.

## 6. Validation Rules

- Cannot offer on your own listing
- Cash amount >= 0
- Each offered card must be from the offeror's holdings with listedForTrade = true
- Offered quantity per card <= the offeror's listedQuantity for that holding
- Cannot accept if the listing's quantity has dropped below listedQuantity since the offer was made
- Only listing owner can accept/decline
- Only offeror can withdraw
- Either party can void an accepted trade
- One pending offer per user per listing (can withdraw and resubmit)

## 7. Scope Exclusions

- No in-app chat/messaging beyond offer messages
- No payment processing (cash is tracked as a number, exchanged in person)
- No shipping/tracking
- No reputation/feedback system
- No automated price negotiation
- No offer expiration/timeout
