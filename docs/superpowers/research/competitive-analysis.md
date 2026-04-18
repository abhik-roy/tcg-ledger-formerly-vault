# Competitive Analysis

**Date:** 2026-04-16
**Competitors:** Deckbox, Moxfield, ManaBox, Dragon Shield, Cardsphere

## Summary Table

| Feature             | Deckbox              | Moxfield       | ManaBox              | Dragon Shield   | Cardsphere         |
| ------------------- | -------------------- | -------------- | -------------------- | --------------- | ------------------ |
| Collection Tracking | Primary              | Secondary      | Primary              | Primary         | No                 |
| Trade System        | Structured proposals | None           | None                 | None            | Automated matching |
| Mobile              | No                   | Responsive web | Native app (primary) | Native app only | Basic responsive   |
| Multi-game          | MTG only             | MTG only       | MTG only             | MTG+Pokemon+YGO | MTG only           |
| Card Scanning       | No                   | No             | Yes (camera)         | Yes (camera)    | No                 |
| Dark Mode           | No                   | Yes            | Yes                  | Yes             | No                 |

## Patterns to Adopt

1. **Card images front and center** (Moxfield) — visual grid with prominent card art
2. **Fast card adding with minimal friction** (ManaBox) — type-ahead, instant results, inline add
3. **Dedicated tradelist/wishlist concept** (Deckbox) — visible toggle on collection rows
4. **Set completion tracking** (Deckbox, ManaBox) — % complete bars per set
5. **Mobile-appropriate card layouts** (ManaBox, Dragon Shield) — thumbnail rows, not tables
6. **Collection value display** (ManaBox, Dragon Shield) — total value + per-card market price
7. **Bottom nav on mobile** — reduces navigation friction vs hamburger drawer

## Patterns to Avoid

1. Dated table-only layouts (Deckbox)
2. Complex trading systems at launch (Cardsphere's index-pricing)
3. Premium-gating core features (ManaBox, Dragon Shield)
4. Ignoring mobile entirely (Deckbox)
5. App-only with no web interface (Dragon Shield)
6. Collection as secondary feature (Moxfield)
7. No card images in trade views (Cardsphere)
