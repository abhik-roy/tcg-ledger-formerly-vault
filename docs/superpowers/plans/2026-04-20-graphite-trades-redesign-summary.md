# Graphite Redesign + Trades Workflow — Implementation Summary

Branch: `feature/graphite-redesign` — 34 commits on top of `main`.

## What landed

### Theme (Phases 0 + 8)

- New "Graphite" CSS token system (light + dark) replacing "Collector's Alcove"
- Geist + Geist Mono + Instrument Serif via `next/font/google`
- Editorial utility classes: `.display-xl/lg/md/sm`, `.serif`, `.serif-italic`, `.eyebrow`, `.section-label`, `.price`, `.live-dot`, etc.
- Aurora + card-cascade animations for the login

### Chrome (Phase 2)

- `AdminSidebar` rewritten: "Binder." wordmark, I/II/III section numerals, accent rail on active item, user footer with avatar + theme toggle + sign-out
- `AdminHeader` rewritten: minimal eyebrow/title pattern, inbox bell with pending badge

### Trade flow (Phases 3–7)

- `/admin/trade-binder`: editorial masthead + feature strip + grid of `ListingCard` tiles
- `ListingDetailDialog`: dark-stage modal with card-on-gradient + offer thread + action bar
- `OfferCard`: per-offer renderer with fairness delta banner and context-aware actions
- `MakeOfferWizard`: 2-step offer composer (cash + picker → review) with fairness indicator
- `CreateListingDialog`: "put a card on the shelf" with ask-type picker
- `/admin/inbox`: editorial three-tab ledger (incoming / sent / settled)

### Primitives (Phase 1)

- `src/components/ui/graphite/`: Eyebrow, SectionLabel, Stat, Chip, StatusPill, GameChip, ConditionChip, CardArt (smart wrapper), CardArtPlaceholder
- `src/lib/graphite/`: `computeFairness`, `formatUsdCents`, `formatAsk`
- Button variants extended with `ink` + `success`

## What DIDN'T change

- Prisma schema — zero migrations
- Server action contracts (`makeOffer`, `acceptOffer`, `declineOffer`, `withdrawOffer`, `voidOffer`)
- Business logic / repositories / mappers — only added `getOffersForListing` action + `findByHoldingId` repo method + `listingOwner` field on `TradeOfferDTO`

## Explicitly deferred to future work

- Dashboard, Collection, Targets, Ledger, Add Cards, Settings page bodies (inherit chrome + palette for free; internal layouts unchanged)
- Deep-link from `/admin/inbox` row → auto-open detail modal on binder (currently navigates to binder and user clicks tile)
- Counter-offer as first-class flow (current implementation just re-opens wizard)

## Tests + verification

- 152 Vitest tests pass (130 baseline + 22 added: 9 fairness, 7 format-ask, 6 status-pill)
- Typecheck, lint, build all green
- No AI attribution in any commit
