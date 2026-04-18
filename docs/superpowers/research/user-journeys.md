# User Journey Maps

**Date:** 2026-04-16

## Journey A: "I just cracked a booster pack — add these 8 cards"

### Desktop

1. Navigate → "Add Cards" via header button or sidebar
2. Choose method — Single Search (tedious x8) or Bulk Upload (requires CSV file)
3. Single search: type name → click Search → find printing → click Add Stock → repeat x7
4. No running session count, no "added" indicator on results
5. Toast disappears; no persistent record of what was added

**Key friction:** No quick-batch mode. For 8 cards, both search-one-by-one and CSV-upload are wrong tools.

### Mobile

- **Blocked** by sidebar (no hamburger menu)
- After fix: one-handed use while holding cards, need large tap targets
- Search button at 32px (h-8) below 44px minimum

**Opportunities:** Quick Batch Add (text area for card names), running session counter, "added" badge on search results, post-add "View recently added" filter.

## Journey B: "Browse friends' trade binders"

### Desktop

1. Navigate → Trade Binder (sidebar, not yet built)
2. Browse grid of listed Holdings across users
3. Filter by game/condition/owner, search by name
4. Click card → detail modal → evaluate
5. "Contact owner" → mailto link (out-of-band)

**Key friction:** Contact is email-only, no in-app messaging.

### Mobile

- Two taps to navigate (hamburger → Trade Binder)
- Single-column grid with prominent card art works well
- Full-screen detail sheet (swipe-dismissable) is right pattern
- mailto opens email app smoothly on mobile

**Opportunities:** "I own X" overlay, "Interested" bookmark, owner grouping view, recency badge, contact preference field on user profile.

## Journey C: "Bulk-update market prices across my Magic collection"

### Desktop

1. Navigate → Collection, filter by game: Magic
2. Select cards via checkboxes + shift-click range
3. Click "Edit Price" in bulk action bar
4. **Gap:** No "Refresh Prices from Scryfall" action — must manually enter prices or export/re-import CSV

**Key friction:** No bulk price refresh from external source. Manual entry for 500+ cards is impractical.

### Mobile

- **Cannot multi-select** — no checkbox column in card-per-row layout
- No shift-click on touch
- Realistic mobile use: check individual card values, not bulk update

**Opportunities:** "Refresh Prices" bulk action (user-triggered Scryfall fetch), "Select all matching filter", shift-click tooltip, progress indicator for bulk ops, price staleness indicator.
