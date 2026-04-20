# Graphite Redesign + Trades Flow Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current "Collector's Alcove" theme with the new "Graphite" design system (electric vermilion + graphite + Instrument Serif display) and rebuild the trades workflow (binder, listing detail, make-offer, create-listing, offer inbox) against that system, while preserving the existing server action contracts and DTOs.

**Architecture:** The design ships as a reference prototype at `design/trade-binder-prototype/` — JSX + CSS tokens — which serves as the visual source of truth for every screen below. The port path is: (1) swap tokens in `globals.css` and fonts in `app/layout.tsx` so the whole app picks up the new chrome for free, (2) add design-system primitives under `src/components/ui/graphite/` that wrap shadcn or render atoms the prototype relies on (`eyebrow`, `chip`, `card-art-placeholder`, etc.), (3) rebuild trade-flow screens one-by-one — each is a self-contained commit that can be deployed to `make deploy-test` (port 3002) for review before landing on `main`. The prototype uses mock data; the real app has Prisma-backed DTOs (`TradeBinderItemDTO`, `TradeOfferDTO`, `HoldingDTO`) — mapping is a straight field rename job, no schema changes.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 (`@theme` blocks) · shadcn/ui on Radix · lucide-react icons · sonner toasts · next-auth v5 · Prisma 6 · Vitest + RTL + jsdom · Playwright (smoke only).

**Reference design artifacts (DO NOT MODIFY during implementation):**
- `design/trade-binder-prototype/styles/tokens.css` — Graphite tokens (light + dark)
- `design/trade-binder-prototype/styles/app.css` — utility classes, keyframes, primitives
- `design/trade-binder-prototype/src/primitives.jsx` — visual atoms (Icon / Avatar / GameChip / ConditionChip / StatusPill / CardArt / Button / EmptyState)
- `design/trade-binder-prototype/src/chrome.jsx` — Sidebar + Header
- `design/trade-binder-prototype/src/marketplace.jsx` — Trade Binder page (masthead, feature strip, grid + row)
- `design/trade-binder-prototype/src/listing-detail.jsx` — Listing detail modal + OfferCard
- `design/trade-binder-prototype/src/make-offer.jsx` — 2-step offer composer with fairness indicator
- `design/trade-binder-prototype/src/create-listing.jsx` — listing composer with ask-type picker
- `design/trade-binder-prototype/src/inbox.jsx` — offers ledger (incoming / sent / settled)
- `design/trade-binder-prototype/src/login.jsx` — editorial sign-in
- `design/trade-binder-prototype/src/app.jsx` — routing + toasts + tweaks panel
- `design/trade-binder-prototype/src/data.js` — mock data (ignore — real app has Prisma DTOs)

**Reality-checks against the current codebase (verified 2026-04-20):**
- `askType` in schema is `"custom" | "percent" | "trade_only"` (not `"fixed"` as the design JSX uses). **Keep `"custom"` internally; label it "Fixed" in UI only.** No migration.
- `markt_price` on `CardDTO` is nullable — design assumes a number. Guard every market-price arithmetic with `?? 0`.
- Scryfall/Pokémon-API images live on `CardDTO.imageSmall` / `imageNormal`. The prototype's `CardArt` placeholder is a fallback; when a real image URL exists, render `<Image>` instead. Keep the placeholder for seeded mock/dev cards without art.
- Real auth is email + password via NextAuth credentials provider — the prototype's persona-switcher is demo-only. Adapt the editorial aesthetic (card cascade, aurora, serif hero) to the existing form.
- `OffersPanel` (right side-panel on `/admin/trade-binder`) will be **deleted** in Phase 7 and replaced with a dedicated `/admin/inbox` route.
- The design's nav has I/II/III section numerals and a "Members" entry. Current sidebar has `Users` (ADMIN-only). Rename label to "Members" but keep ADMIN gating.
- No new server actions are needed — the existing `trade-offer.ts` and `trade-binder.ts` controllers cover everything the new UI needs. Mappers and DTOs stay intact.
- `src/components/admin/layout.tsx` is **dead code** (uses `pl-[250px]` hack and is not imported anywhere). Delete it in cleanup.

**Deploy cadence:** Every numbered phase ends with `make deploy-test` to validate on the Pi at port 3002 before progressing. After Phase 9 passes smoke, merge the branch into `main` and `make deploy` to prod.

---

## File Structure

### New files (created by this plan)

```
src/components/ui/graphite/
├── eyebrow.tsx                 # <Eyebrow>TEXT</Eyebrow>  — mono-caps section marker
├── section-label.tsx           # <SectionLabel>text</SectionLabel>
├── chip.tsx                    # base <Chip /> with variants: default | mono | sharp | solid | accent
├── status-pill.tsx             # pending|accepted|declined|withdrawn|voided tone mapping
├── game-chip.tsx               # magic|pokemon|yugioh|lorcana dot + label
├── condition-chip.tsx          # NM|LP|MP|HP colour mapping
├── card-art-placeholder.tsx    # <CardArtPlaceholder card={...} size="xs|sm|md|lg|xl" />
├── card-art.tsx                # Smart wrapper: if CardDTO.imageNormal → <Image>, else → placeholder
├── stat.tsx                    # <Stat label value sub /> editorial stat display
├── fairness-indicator.tsx      # pure renderer for offer fairness banner
└── index.ts                    # barrel export

src/lib/graphite/
├── fairness.ts                 # computeFairness(offerTotalCents, askCents) → { label, tone, deltaPct, delta }
├── format-ask.ts               # formatAsk(askType, askValue, marketPrice) → display string
└── index.ts

src/components/admin/trade-binder/
├── Masthead.tsx                # Editorial hero with stats (replaces header strip on trade binder page)
├── FeatureStrip.tsx            # Hero feature listing
├── ListingCard.tsx             # Grid-tile card (replaces inline markup in TradeBinderClient)
├── ListingRow.tsx              # Row/table variant
├── ListingDetailDialog.tsx     # Large dark-stage modal with offer thread
├── OfferCard.tsx               # Nested under ListingDetail; renders single offer
├── MakeOfferWizard.tsx         # 2-step composer (replaces MakeOfferDialog)
├── CreateListingDialog.tsx     # NEW — "put a card on the shelf" composer
└── EmptyShelf.tsx              # Editorial empty state

src/components/admin/inbox/
├── InboxClient.tsx             # Tabbed ledger (incoming|sent|settled)
├── InboxRow.tsx                # Single row per offer
└── LedgerStat.tsx              # Masthead stat display

src/app/admin/(dashboard)/inbox/
└── page.tsx                    # New route; server-renders, wraps InboxClient

tests/
├── lib/graphite/fairness.test.ts
├── lib/graphite/format-ask.test.ts
└── components/graphite/status-pill.test.tsx
```

### Modified files

```
src/app/globals.css                                     # Tokens swap (Graphite), new utility classes
src/app/layout.tsx                                      # Font swap (Geist + Geist Mono + Instrument Serif)
src/components/admin/AdminSidebar.tsx                   # Graphite chrome — I/II/III numerals, accent rail, Inbox link
src/components/admin/header.tsx                         # Eyebrow + title pattern, bell icon + inbox badge
src/components/admin/TradeBinderClient.tsx              # Compose Masthead + FeatureStrip + ListingCard grid; open ListingDetailDialog on click
src/components/admin/MakeOfferDialog.tsx                # DELETE → replaced by MakeOfferWizard
src/components/admin/OffersPanel.tsx                    # DELETE → replaced by /admin/inbox
src/components/admin/CardPickerDialog.tsx               # Restyle against Graphite tokens (inline card picker survives for wizard step 1)
src/components/admin/CollectionClient.tsx               # Replace inline "list for trade" form with <CreateListingDialog />
src/components/ui/button.tsx                            # Add `ink`, `outline`, `success` variants
src/app/admin/login/page.tsx                            # Editorial login — card cascade + aurora + serif hero (adapted to credentials)
src/components/admin/layout.tsx                         # DELETE (dead code)
package.json                                            # Remove unused DM Sans CSS import if present
docs/DEPLOYMENT.md                                      # Add post-redesign deploy notes
.project-notes.md                                       # Update "Last updated" + design note
```

### Files intentionally NOT touched

```
prisma/schema.prisma                                     # No data model changes
src/app/actions/trade-offer.ts                           # Controller contract stable
src/app/actions/trade-binder.ts                          # Controller contract stable
src/services/holding.service.ts                          # Unchanged
src/repositories/trade-offer.repository.ts               # Unchanged
src/mappers/trade-binder.mapper.ts                       # Unchanged
src/lib/dtos.ts                                          # Unchanged
src/lib/auth.ts / lib/auth-guard.ts                      # Unchanged
```

---

## Pre-flight: Worktree + branch setup

- [ ] **Step P.1: Create a worktree off main for this work**

```bash
cd /home/abhikroy/Desktop/tcg-ledger-formerly-vault
git fetch origin
git worktree add ../tcg-ledger-graphite -b feature/graphite-redesign main
cd ../tcg-ledger-graphite
```

Expected: new directory `../tcg-ledger-graphite` with a fresh branch checked out.

- [ ] **Step P.2: Install deps in the worktree**

```bash
npm install --legacy-peer-deps
```

Expected: no errors. `--legacy-peer-deps` is required per `.project-notes.md`.

- [ ] **Step P.3: Verify baseline builds and tests pass before touching anything**

```bash
DATABASE_URL="postgres://fake:fake@localhost:5432/fake" AUTH_SECRET="build-time-placeholder-min-32-chars-long" npm run build
npx vitest run
npm run typecheck
```

Expected: build succeeds, 130 tests pass, typecheck clean. **If any of these fail before changes, stop and fix baseline first.**

- [ ] **Step P.4: Bring the dev Postgres up and point `.env.local` at it**

```bash
bash scripts/dev-bootstrap.sh
cp .env.example .env.local  # if .env.local does not already exist
# Edit .env.local: DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev"
#                  AUTH_SECRET="dev-secret-at-least-32-characters-long-for-sure"
npm run dev
```

Expected: `http://localhost:3000/admin` renders the current (Alcove) theme. Leave it running in a second terminal — you'll hot-reload against it through the whole plan.

---

## Phase 0 — Token + Font Swap (atomic theme cutover)

**Goal:** Drop in Graphite tokens so the whole app picks up the new palette for free, before any component work. This is a visually-disruptive single commit that lands the new chrome.

### Task 0.1: Swap CSS tokens in `globals.css`

**Files:**
- Modify: `src/app/globals.css` (lines 51–138 are the token body; replace with Graphite)

**Reference:** `design/trade-binder-prototype/styles/tokens.css` lines 8–165.

- [ ] **Step 1: Replace the `:root` and `.dark` blocks in `globals.css`**

Open `src/app/globals.css`. Keep the `@theme { ... }` block at the top (lines 1–48) **exactly as-is** — it's how Tailwind 4 picks up the CSS vars. Replace lines 51–138 with:

```css
/* 2. DEFINE VALUES — Graphite palette (editorial digital: Linear × Arc × Readymag) */
:root {
  /* Z-index scale (kept from prior palette — callers depend on it) */
  --z-modal-base: 40;
  --z-modal: 50;
  --z-modal-nested: 60;
  --z-toast: 70;

  /* Surfaces — light */
  --bg:         #f6f6f4;
  --bg-sunk:    #eeeeeb;
  --surface:    #ffffff;
  --surface-2:  #fbfbf9;
  --surface-hi: #ffffff;

  --ink:        #0a0a0b;
  --ink-2:      #3c3c40;
  --ink-3:      #7a7a80;
  --ink-4:      #b4b4b8;

  --rule:        rgba(10, 10, 11, 0.08);
  --rule-strong: rgba(10, 10, 11, 0.14);

  --accent-hot:     #ff4d2e;
  --accent-hot-hi:  #ff6b4f;
  --accent-hot-ink: #ffffff;

  --accent-cool:    #1d4ed8;
  --accent-cool-hi: #2563eb;

  --signal-green:   #16a34a;
  --signal-amber:   #d97706;
  --signal-plum:    #7c3aed;

  /* Back-compat Tailwind-theme aliases — these feed the @theme block above */
  --background:         var(--bg);
  --foreground:         var(--ink);
  --card:               var(--surface);
  --card-foreground:    var(--ink);
  --popover:            var(--surface-hi);
  --popover-foreground: var(--ink);
  --primary:            var(--accent-hot);
  --primary-foreground: var(--accent-hot-ink);
  --secondary:          var(--bg-sunk);
  --secondary-foreground: var(--ink-2);
  --muted:              var(--bg-sunk);
  --muted-foreground:   var(--ink-3);
  --accent:             var(--signal-green);
  --accent-foreground:  #05210f;
  --destructive:        var(--accent-hot);
  --destructive-foreground: var(--accent-hot-ink);
  --success:            var(--signal-green);
  --success-foreground: #05210f;
  --warning:            var(--signal-amber);
  --warning-foreground: #2a1905;
  --info:               var(--accent-cool);
  --info-foreground:    #eaf0fb;
  --border:             var(--rule);
  --input:              var(--rule);
  --ring:               var(--accent-hot);
  --sidebar:            var(--bg);
  --sidebar-foreground: var(--ink);

  /* Game spine colours */
  --game-magic:   #2563eb;
  --game-pokemon: #dc2626;
  --game-yugioh:  #9333ea;
  --game-lorcana: #4f46e5;

  /* Radii */
  --radius-sharp: 2px;
  --radius-sm:    4px;
  --radius:       8px;
  --radius-md:    12px;
  --radius-lg:    16px;
  --radius-xl:    20px;
  --radius-full:  9999px;

  /* Shadows */
  --shadow-xs:    0 1px 0 rgba(10, 10, 11, 0.04);
  --shadow-sm:    0 1px 2px rgba(10, 10, 11, 0.04), 0 0 0 1px rgba(10, 10, 11, 0.04);
  --shadow-md:    0 4px 12px -2px rgba(10, 10, 11, 0.06), 0 2px 4px -2px rgba(10, 10, 11, 0.04);
  --shadow-lg:    0 20px 40px -12px rgba(10, 10, 11, 0.12), 0 8px 16px -8px rgba(10, 10, 11, 0.06);
  --shadow-2xl:   0 40px 80px -20px rgba(10, 10, 11, 0.22);
  --shadow-card:      0 1px 2px rgba(10, 10, 11, 0.04), 0 1px 0 rgba(10, 10, 11, 0.02);
  --shadow-card-lift: 0 12px 28px -8px rgba(10, 10, 11, 0.15), 0 4px 8px -2px rgba(10, 10, 11, 0.08);
}

.dark {
  --bg:         #0a0a0c;
  --bg-sunk:    #050506;
  --surface:    #141416;
  --surface-2:  #1a1a1d;
  --surface-hi: #1e1e21;

  --ink:        #fafafa;
  --ink-2:      #c4c4c8;
  --ink-3:      #7a7a80;
  --ink-4:      #4a4a50;

  --rule:        rgba(250, 250, 250, 0.07);
  --rule-strong: rgba(250, 250, 250, 0.14);

  --accent-hot:     #ff5a3e;
  --accent-hot-hi:  #ff7858;
  --accent-hot-ink: #0a0a0c;

  --accent-cool:    #60a5fa;
  --accent-cool-hi: #93c5fd;

  --signal-green:   #34d399;
  --signal-amber:   #fbbf24;
  --signal-plum:    #a78bfa;

  --background:         var(--bg);
  --foreground:         var(--ink);
  --card:               var(--surface);
  --card-foreground:    var(--ink);
  --popover:            var(--surface-hi);
  --popover-foreground: var(--ink);
  --primary:            var(--accent-hot);
  --primary-foreground: var(--accent-hot-ink);
  --secondary:          var(--surface-2);
  --secondary-foreground: var(--ink-2);
  --muted:              var(--surface-2);
  --muted-foreground:   var(--ink-3);
  --accent:             var(--signal-green);
  --accent-foreground:  #05210f;
  --border:             var(--rule);
  --input:              var(--rule);
  --ring:               var(--accent-hot);
  --sidebar:            #060608;
  --sidebar-foreground: var(--ink);
  --success:            var(--signal-green);
  --success-foreground: #05210f;
  --warning:            var(--signal-amber);
  --warning-foreground: #2a1905;
  --info:               var(--accent-cool);
  --info-foreground:    #0a1630;
  --destructive:        var(--accent-hot);
  --destructive-foreground: var(--accent-hot-ink);

  --game-magic:   #60a5fa;
  --game-pokemon: #f87171;
  --game-yugioh:  #c084fc;
  --game-lorcana: #818cf8;

  --shadow-sm:    0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(250, 250, 250, 0.05);
  --shadow-md:    0 4px 12px -2px rgba(0,0,0,0.5), 0 2px 4px -2px rgba(0,0,0,0.3);
  --shadow-lg:    0 20px 40px -12px rgba(0,0,0,0.6), 0 8px 16px -8px rgba(0,0,0,0.4);
  --shadow-card:      0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(250, 250, 250, 0.04);
  --shadow-card-lift: 0 12px 28px -8px rgba(0,0,0,0.6), 0 4px 8px -2px rgba(0,0,0,0.4);
}
```

Leave everything below line 138 (the `@layer base`, `@layer components`, existing utility classes) in place. We'll update those component classes in Phase 1.

- [ ] **Step 2: Extend `@theme` with the new tokens Tailwind needs to expose as classes**

At the top of `globals.css`, inside the existing `@theme { ... }` block, append **before the closing brace**:

```css
  /* Graphite extensions */
  --font-family-display: var(--font-display);

  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-ink-4: var(--ink-4);
  --color-bg: var(--bg);
  --color-bg-sunk: var(--bg-sunk);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-rule: var(--rule);
  --color-rule-strong: var(--rule-strong);
  --color-accent-hot: var(--accent-hot);
  --color-accent-cool: var(--accent-cool);
  --color-signal-green: var(--signal-green);
  --color-signal-amber: var(--signal-amber);
  --color-signal-plum: var(--signal-plum);
  --color-game-magic: var(--game-magic);
  --color-game-pokemon: var(--game-pokemon);
  --color-game-yugioh: var(--game-yugioh);
  --color-game-lorcana: var(--game-lorcana);
```

This makes classes like `text-ink-3`, `bg-surface`, `border-rule-strong`, `text-accent-hot`, `bg-game-magic` resolve correctly.

- [ ] **Step 3: Append Graphite utility classes at the bottom of `globals.css`**

Port the typography roles and utilities from the prototype's `tokens.css` (lines 180–290) and `app.css` (lines 26–399). Paste this block at the end of `globals.css`, **after** the closing `}` of `@layer components`:

```css
/* ============================================================
   Graphite — typography roles, utilities, animations
   ============================================================ */

html, body {
  font-feature-settings: "ss01", "ss02", "cv11";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  letter-spacing: -0.006em;
}

/* Display type */
.display-xl  { font-family: var(--font-display); font-weight: 400; font-size: clamp(44px, 6vw, 84px);   line-height: 0.95; letter-spacing: -0.03em; }
.display-lg  { font-family: var(--font-display); font-weight: 400; font-size: clamp(32px, 3.6vw, 52px); line-height: 1.00; letter-spacing: -0.02em; }
.display-md  { font-family: var(--font-display); font-weight: 400; font-size: 26px; line-height: 1.05; letter-spacing: -0.015em; }
.display-sm  { font-family: var(--font-display); font-weight: 400; font-size: 18px; line-height: 1.15; letter-spacing: -0.01em; }
.display-italic { font-style: italic; }

/* UI headings (sans) */
h1 { font-weight: 600; font-size: 22px; line-height: 1.15; letter-spacing: -0.022em; margin: 0; }
h2 { font-weight: 600; font-size: 16px; line-height: 1.25; letter-spacing: -0.015em; margin: 0; }
h3 { font-weight: 600; font-size: 13px; line-height: 1.3;  letter-spacing: -0.005em; margin: 0; }

/* Stat / label / caption */
.stat-value    { font-family: var(--font-sans); font-weight: 500; font-size: 32px; line-height: 1.0; letter-spacing: -0.035em; font-variant-numeric: tabular-nums; color: var(--ink); }
.stat-label    { font-family: var(--font-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.12em; color: var(--ink-3); text-transform: uppercase; }
.section-label { font-family: var(--font-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.14em; color: var(--ink-3); text-transform: uppercase; }
.eyebrow       { font-family: var(--font-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-3); display: inline-flex; align-items: center; gap: 8px; }
.eyebrow::before { content: ""; width: 14px; height: 1px; background: currentColor; opacity: 0.5; }

/* Price type */
.price         { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 500; letter-spacing: -0.01em; }
.price-display { font-family: var(--font-sans); font-weight: 500; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; }

/* Serif accent */
.serif        { font-family: var(--font-display); font-weight: 400; letter-spacing: -0.015em; }
.serif-italic { font-family: var(--font-display); font-style: italic; font-weight: 400; }

/* Rules */
.rule        { height: 1px; background: var(--rule); border: 0; margin: 0; }
.rule-strong { height: 1px; background: var(--rule-strong); border: 0; margin: 0; }

/* Clamp helpers */
.clamp-1 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
.clamp-2 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }

/* Motion */
@keyframes slide-up-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade-in     { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop-in      { 0% { opacity: 0; transform: scale(0.96) translateY(8px); } 60% { transform: scale(1.01) translateY(-1px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes pulse-dot   { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 60%, transparent); } 50% { box-shadow: 0 0 0 6px color-mix(in srgb, currentColor 0%, transparent); } }
@keyframes shimmer-bg  { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.anim-fade  { animation: fade-in .24s ease both; }
.anim-slide { animation: slide-up-in .35s cubic-bezier(.2,.85,.25,1.05) both; }
.anim-pop   { animation: pop-in .32s cubic-bezier(.2,.85,.25,1.1) both; }

.live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-hot); color: var(--accent-hot);
  display: inline-block;
  animation: pulse-dot 2.4s ease-in-out infinite;
}

.skeleton {
  background: linear-gradient(90deg, var(--bg-sunk) 0%, var(--rule-strong) 50%, var(--bg-sunk) 100%);
  background-size: 200% 100%;
  animation: shimmer-bg 1.8s ease-in-out infinite;
  border-radius: var(--radius-sharp);
}

::selection { background: var(--accent-hot); color: var(--accent-hot-ink); }

:focus-visible {
  outline: 2px solid var(--accent-hot);
  outline-offset: 2px;
  border-radius: 3px;
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

**Remove** these legacy utilities from the existing `@layer components` block (they reference the Alcove gradient and no longer apply): `.gradient-brand`, `.gradient-mesh`, `.dark .gradient-mesh`, `.gradient-glow`, `.card-glow`, `.glass`. The `.sidebar-link`, `.table-header`, `.table-cell`, `.stat-value`, `.stat-label`, `.text-caption`, `.text-label`, `.text-body`, and `.game-accent-*` utilities stay — they're used in other pages outside the redesign scope.

- [ ] **Step 4: Commit Phase 0.1**

```bash
git add src/app/globals.css
git commit -m "feat(theme): graphite tokens + utilities"
```

### Task 0.2: Swap fonts in root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Read the current `src/app/layout.tsx`** to confirm which `next/font` imports are in use. If it's DM Sans + JetBrains Mono (per memory), replace both.

- [ ] **Step 2: Replace font imports in `src/app/layout.tsx`**

```tsx
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
  style: ["normal", "italic"],
})
```

Apply the classNames on the `<html>` (or `<body>`) element:

```tsx
<html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}>
  <body className="font-sans">{children}</body>
</html>
```

- [ ] **Step 3: Smoke-test the dev server**

```bash
# In the second terminal where `npm run dev` is running:
# Open http://localhost:3000/admin/login and visually verify:
#  - Body text is Geist (not DM Sans)
#  - Headings that use .serif class render in Instrument Serif (will be visible after Phase 2+)
#  - No FOUT or console font-loading errors
```

Expected: page renders; no runtime errors. Existing theme fragments still work (buttons, cards) because every old utility still resolves through the aliased vars.

- [ ] **Step 4: Commit Phase 0.2**

```bash
git add src/app/layout.tsx
git commit -m "feat(theme): swap to geist + instrument serif"
```

### Task 0.3: Deploy Phase 0 to test and verify

- [ ] **Step 1: Deploy to test**

```bash
make deploy-test
```

- [ ] **Step 2: Open `https://raspberrypi.tail884296.ts.net:3002/admin`** and confirm the entire app now renders with the new palette and fonts. Every page still works (even if it looks unstyled — that's expected until we rebuild the components). **Stop and fix before continuing if any route throws 500.**

---

## Phase 1 — Graphite Primitives (UI atoms)

**Goal:** Build the reusable atoms the trade-flow screens depend on, with unit tests for pure logic.

### Task 1.1: `fairness.ts` — pure calculator

**Files:**
- Create: `src/lib/graphite/fairness.ts`
- Create: `tests/lib/graphite/fairness.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/graphite/fairness.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { computeFairness } from "@/lib/graphite/fairness"

describe("computeFairness", () => {
  it("returns fair when delta is within ±5% of ask", () => {
    expect(computeFairness(9800, 10000)).toMatchObject({ tone: "fair", label: "Fair trade" })
    expect(computeFairness(10400, 10000)).toMatchObject({ tone: "fair", label: "Fair trade" })
  })

  it("returns low when delta is more than 10% below ask", () => {
    const r = computeFairness(8000, 10000)
    expect(r.tone).toBe("low")
    expect(r.label).toBe("Lowball")
    expect(r.deltaPct).toBeCloseTo(-20, 0)
  })

  it("returns under when delta is 5–10% below ask", () => {
    expect(computeFairness(9200, 10000)).toMatchObject({ tone: "under", label: "Below ask" })
  })

  it("returns slight-over when delta is 5–15% above ask", () => {
    expect(computeFairness(11000, 10000)).toMatchObject({ tone: "slight-over" })
  })

  it("returns over when delta is more than 15% above ask", () => {
    expect(computeFairness(12000, 10000)).toMatchObject({ tone: "over", label: "Over ask" })
  })

  it("clamps deltaPct to 0 when ask is 0 (trade-only without market fallback)", () => {
    expect(computeFairness(5000, 0).deltaPct).toBe(0)
  })

  it("returns signed delta in cents", () => {
    expect(computeFairness(12500, 10000).delta).toBe(2500)
    expect(computeFairness(7500, 10000).delta).toBe(-2500)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/graphite/fairness.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `src/lib/graphite/fairness.ts`**

```ts
/**
 * @file fairness.ts
 * @module lib/graphite/fairness
 * @description Classifies an offer's value vs the listing's ask as fair / under / low / slight-over / over.
 *
 * All monetary inputs are in integer cents.
 */

export type FairnessTone = "fair" | "under" | "low" | "slight-over" | "over"

export interface Fairness {
  tone: FairnessTone
  label: string
  body: string
  delta: number        // signed, cents
  deltaPct: number     // signed percent of ask
}

export function computeFairness(offerTotalCents: number, askCents: number): Fairness {
  const delta = offerTotalCents - askCents
  const deltaPct = askCents > 0 ? (delta / askCents) * 100 : 0

  if (Math.abs(deltaPct) < 5) {
    return {
      tone: "fair",
      label: "Fair trade",
      body: "Within 5% of ask. These usually close fast.",
      delta,
      deltaPct,
    }
  }
  if (deltaPct < -10) {
    return {
      tone: "low",
      label: "Lowball",
      body: "More than 10% below. Owners often decline silently.",
      delta,
      deltaPct,
    }
  }
  if (deltaPct < 0) {
    return {
      tone: "under",
      label: "Below ask",
      body: "A short note explaining why helps these land.",
      delta,
      deltaPct,
    }
  }
  if (deltaPct > 15) {
    return {
      tone: "over",
      label: "Over ask",
      body: "Generous. Expect a quick yes.",
      delta,
      deltaPct,
    }
  }
  return {
    tone: "slight-over",
    label: "Slightly over",
    body: "A touch over ask — likely to close quickly.",
    delta,
    deltaPct,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/graphite/fairness.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/graphite/fairness.ts tests/lib/graphite/fairness.test.ts
git commit -m "feat(graphite): fairness classifier"
```

### Task 1.2: `format-ask.ts` — display formatter

**Files:**
- Create: `src/lib/graphite/format-ask.ts`
- Create: `tests/lib/graphite/format-ask.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest"
import { formatAsk, formatUsdCents } from "@/lib/graphite/format-ask"

describe("formatUsdCents", () => {
  it("formats cents as USD with 2 decimals", () => {
    expect(formatUsdCents(0)).toBe("$0.00")
    expect(formatUsdCents(1234)).toBe("$12.34")
    expect(formatUsdCents(850000)).toBe("$8,500.00")
  })
  it("handles negatives", () => {
    expect(formatUsdCents(-500)).toBe("-$5.00")
  })
})

describe("formatAsk", () => {
  it("returns null when askType is null", () => {
    expect(formatAsk(null, null, 10000)).toBeNull()
  })
  it("returns 'Trade only' for trade_only", () => {
    expect(formatAsk("trade_only", null, 10000)).toBe("Trade only")
  })
  it("formats custom ask as dollar amount", () => {
    expect(formatAsk("custom", 8500, 10000)).toBe("$85.00")
  })
  it("formats percent ask as percent + resolved dollar", () => {
    expect(formatAsk("percent", 95, 10000)).toBe("95% mkt · $95.00")
  })
  it("falls back to market when market is null in percent mode", () => {
    expect(formatAsk("percent", 95, null)).toBe("95% mkt")
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
npx vitest run tests/lib/graphite/format-ask.test.ts
```

- [ ] **Step 3: Implement `src/lib/graphite/format-ask.ts`**

```ts
export function formatUsdCents(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const n = Math.abs(cents) / 100
  return sign + "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatAsk(
  askType: string | null,
  askValue: number | null,
  marketPriceCents: number | null
): string | null {
  if (askType == null) return null
  if (askType === "trade_only") return "Trade only"
  if (askType === "custom" && askValue != null) return formatUsdCents(askValue)
  if (askType === "percent" && askValue != null) {
    if (marketPriceCents == null) return `${askValue}% mkt`
    const cents = Math.round((marketPriceCents * askValue) / 100)
    return `${askValue}% mkt · ${formatUsdCents(cents)}`
  }
  return null
}
```

- [ ] **Step 4: Run and confirm pass, commit**

```bash
npx vitest run tests/lib/graphite/format-ask.test.ts
git add src/lib/graphite/format-ask.ts tests/lib/graphite/format-ask.test.ts
git commit -m "feat(graphite): ask + currency formatters"
```

### Task 1.3: `Eyebrow`, `SectionLabel`, `Stat`

**Files:**
- Create: `src/components/ui/graphite/eyebrow.tsx`
- Create: `src/components/ui/graphite/section-label.tsx`
- Create: `src/components/ui/graphite/stat.tsx`

These are pure presentational wrappers around the utility classes added in Phase 0.3. No tests — visual only.

- [ ] **Step 1: Create `eyebrow.tsx`**

```tsx
import { cn } from "@/lib/utils"

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>
}
```

- [ ] **Step 2: Create `section-label.tsx`**

```tsx
import { cn } from "@/lib/utils"

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("section-label", className)}>{children}</div>
}
```

- [ ] **Step 3: Create `stat.tsx`**

```tsx
import { cn } from "@/lib/utils"

interface StatProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  className?: string
}

export function Stat({ label, value, sub, accent, className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="stat-label">{label}</span>
      <span
        className={cn(
          "stat-value font-[var(--font-display)]",
          accent && "text-accent-hot"
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="font-mono text-[10px] tracking-[0.04em] text-ink-3">{sub}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/graphite/{eyebrow,section-label,stat}.tsx
git commit -m "feat(graphite): eyebrow, section-label, stat primitives"
```

### Task 1.4: `Chip`, `StatusPill`, `GameChip`, `ConditionChip`

**Files:**
- Create: `src/components/ui/graphite/chip.tsx`
- Create: `src/components/ui/graphite/status-pill.tsx`
- Create: `src/components/ui/graphite/game-chip.tsx`
- Create: `src/components/ui/graphite/condition-chip.tsx`
- Create: `tests/components/graphite/status-pill.test.tsx`

- [ ] **Step 1: Write the test for StatusPill (covers status → color mapping contract)**

```tsx
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { StatusPill } from "@/components/ui/graphite/status-pill"

describe("StatusPill", () => {
  it.each(["pending", "accepted", "declined", "withdrawn", "voided"] as const)(
    "renders a chip for status %s",
    (status) => {
      render(<StatusPill status={status} />)
      expect(screen.getByText(new RegExp(status, "i"))).toBeInTheDocument()
    }
  )
  it("falls back to a neutral chip for unknown status", () => {
    render(<StatusPill status={"unknown-weird"} />)
    expect(screen.getByText(/unknown/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Confirm test fails**

```bash
npx vitest run tests/components/graphite/status-pill.test.tsx
```

- [ ] **Step 3: Implement `chip.tsx` (base)**

```tsx
import { cn } from "@/lib/utils"
import type { ReactNode, CSSProperties } from "react"

export interface ChipProps {
  children: ReactNode
  tone?: string           // CSS colour var or hex; tints border + text
  mono?: boolean          // uppercase mono
  sharp?: boolean         // radius-sharp instead of pill
  solid?: boolean         // ink background
  className?: string
  style?: CSSProperties
}

export function Chip({ children, tone, mono, sharp, solid, className, style }: ChipProps) {
  const dynamic: CSSProperties = tone
    ? {
        color: tone,
        borderColor: `color-mix(in srgb, ${tone} 32%, transparent)`,
      }
    : {}
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] px-[9px] py-[3px] text-[10.5px] font-medium leading-[1.4] whitespace-nowrap border",
        "border-rule-strong text-ink-2",
        mono && "font-mono uppercase tracking-[0.06em] text-[10px]",
        sharp ? "rounded-[var(--radius-sharp)]" : "rounded-full",
        solid && "bg-ink text-bg border-ink",
        className
      )}
      style={{ ...dynamic, ...style }}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 4: Implement `status-pill.tsx`**

```tsx
import { Chip } from "./chip"

const TONES: Record<string, { tone: string; label: string }> = {
  pending:   { tone: "var(--signal-amber)", label: "Pending" },
  accepted:  { tone: "var(--signal-green)", label: "Accepted" },
  declined:  { tone: "var(--ink-3)",        label: "Declined" },
  withdrawn: { tone: "var(--ink-3)",        label: "Withdrawn" },
  voided:    { tone: "var(--ink-3)",        label: "Voided" },
}

export function StatusPill({ status }: { status: string }) {
  const meta = TONES[status] ?? { tone: "var(--ink-3)", label: status }
  return (
    <Chip mono tone={meta.tone}>
      <span
        className="inline-block w-[5px] h-[5px] rounded-full mr-[2px]"
        style={{ background: meta.tone }}
      />
      {meta.label}
    </Chip>
  )
}
```

- [ ] **Step 5: Implement `game-chip.tsx`**

```tsx
import { Chip } from "./chip"

const GAME_COLORS: Record<string, string> = {
  magic:   "var(--game-magic)",
  pokemon: "var(--game-pokemon)",
  yugioh:  "var(--game-yugioh)",
  lorcana: "var(--game-lorcana)",
}

const LABELS: Record<string, string> = {
  magic:   "Magic",
  pokemon: "Pokémon",
  yugioh:  "Yu-Gi-Oh",
  lorcana: "Lorcana",
}

export function GameChip({ game }: { game: string }) {
  const key = game.toLowerCase()
  const color = GAME_COLORS[key] ?? "var(--ink-3)"
  const label = LABELS[key] ?? game
  return (
    <Chip mono tone={color}>
      <span
        className="inline-block w-[5px] h-[5px] rounded-full"
        style={{ background: color }}
      />
      {label}
    </Chip>
  )
}
```

- [ ] **Step 6: Implement `condition-chip.tsx`**

```tsx
import { Chip } from "./chip"

const TONES: Record<string, string> = {
  NM: "var(--signal-green)",
  LP: "var(--accent-cool)",
  MP: "var(--signal-amber)",
  HP: "var(--accent-hot)",
}

export function ConditionChip({ condition }: { condition: string }) {
  const tone = TONES[condition] ?? "var(--ink-3)"
  return <Chip mono tone={tone}>{condition}</Chip>
}
```

- [ ] **Step 7: Run tests and confirm pass, commit**

```bash
npx vitest run tests/components/graphite/status-pill.test.tsx
git add src/components/ui/graphite/ tests/components/graphite/status-pill.test.tsx
git commit -m "feat(graphite): chip + status/game/condition pills"
```

### Task 1.5: `CardArtPlaceholder` + `CardArt` (smart wrapper)

**Files:**
- Create: `src/components/ui/graphite/card-art-placeholder.tsx`
- Create: `src/components/ui/graphite/card-art.tsx`
- Create: `src/components/ui/graphite/index.ts`

- [ ] **Step 1: Implement `card-art-placeholder.tsx`**

Port from `design/trade-binder-prototype/src/primitives.jsx` lines 132–235. Reproduce `CardArt` there as a React component that takes `{ card, size }` where `card` is `Pick<CardDTO, "name" | "set" | "collectorNumber" | "game">`. Keep the inner SVGs per game. The CSS for `.card-art-placeholder` and `.sleeve` classes needs to be appended to `globals.css` — port from `design/trade-binder-prototype/styles/app.css` lines 56–156. Do that appending as an edit to `globals.css` in this step.

**Append to `globals.css` (at the bottom, after the Graphite utilities block):**

```css
.sleeve {
  position: relative;
  border-radius: 10px;
  padding: 4px;
  background: linear-gradient(145deg, #1a1a1d 0%, #0a0a0c 100%);
  box-shadow:
    0 1px 2px rgba(0,0,0,0.3),
    0 12px 28px -12px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.08);
}
.sleeve::after {
  content: "";
  position: absolute; inset: 0;
  border-radius: 10px;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.06) 100%);
  mix-blend-mode: screen;
}

.card-art-placeholder {
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  background:
    radial-gradient(ellipse at 25% 15%, color-mix(in srgb, var(--art-color) 55%, transparent) 0%, transparent 55%),
    radial-gradient(ellipse at 80% 85%, color-mix(in srgb, var(--art-color) 40%, transparent) 0%, transparent 55%),
    linear-gradient(140deg,
      color-mix(in srgb, var(--art-color) 18%, #0a0a0c) 0%,
      color-mix(in srgb, var(--art-color) 8%, #0a0a0c) 50%,
      color-mix(in srgb, var(--art-color) 22%, #0a0a0c) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.08),
    inset 0 1px 0 rgba(255,255,255,0.12);
}
.card-art-placeholder::after {
  content: "";
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(115deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 4px),
    linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%);
  pointer-events: none;
}
```

Then create `src/components/ui/graphite/card-art-placeholder.tsx`:

```tsx
"use client"

import type { CSSProperties } from "react"

export type CardArtSize = "xs" | "sm" | "md" | "lg" | "xl"

const DIMS: Record<CardArtSize, { w: number; h: number }> = {
  xs: { w: 36, h: 50 },
  sm: { w: 48, h: 67 },
  md: { w: 120, h: 168 },
  lg: { w: 200, h: 280 },
  xl: { w: 280, h: 392 },
}

const GAME_COLORS: Record<string, string> = {
  magic:   "#3b82f6",
  pokemon: "#ef4444",
  yugioh:  "#a855f7",
  lorcana: "#6366f1",
}

interface Props {
  name: string
  set: string
  collectorNumber: string
  game: string
  size?: CardArtSize
  style?: CSSProperties
}

export function CardArtPlaceholder({ name, set, collectorNumber, game, size = "md", style }: Props) {
  const { w, h } = DIMS[size]
  const color = GAME_COLORS[game.toLowerCase()] ?? "#888"
  return (
    <div className="sleeve shrink-0" style={{ width: w + 8, height: h + 8, ...style }}>
      <div
        className="card-art-placeholder w-full h-full relative flex flex-col"
        style={{ ["--art-color" as string]: color }}
      >
        <div className="absolute inset-[5%] flex flex-col rounded-[3px] border border-white/10">
          <div
            className="px-[6%] py-[4%] border-b text-white/90 font-semibold whitespace-nowrap overflow-hidden text-ellipsis leading-[1.1]"
            style={{
              fontSize: Math.max(7, w * 0.055),
              borderBottomColor: `color-mix(in srgb, ${color} 40%, rgba(255,255,255,0.12))`,
              background: `linear-gradient(180deg, color-mix(in srgb, ${color} 35%, transparent), transparent)`,
            }}
          >
            {name}
          </div>
          <div className="flex-1 relative overflow-hidden grid place-items-center">
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 28% 30%, color-mix(in srgb, ${color} 60%, transparent) 0, transparent 55%), radial-gradient(circle at 72% 75%, color-mix(in srgb, ${color} 40%, transparent) 0, transparent 50%)`,
              }}
            />
            <svg
              width={w * 0.42}
              height={w * 0.42}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth={1.1}
              opacity={0.9}
              className="relative"
            >
              {game === "magic" && <path d="M12 2 L4 8 L4 16 L12 22 L20 16 L20 8 Z" />}
              {game === "pokemon" && (
                <>
                  <circle cx={12} cy={12} r={9} />
                  <path d="M3 12h18" />
                  <circle cx={12} cy={12} r={3} fill="rgba(255,255,255,0.9)" />
                </>
              )}
              {game === "yugioh" && (
                <>
                  <polygon points="12,2 22,12 12,22 2,12" />
                  <circle cx={12} cy={12} r={4} />
                </>
              )}
              {game === "lorcana" && (
                <>
                  <path d="M12 3 C 7 3 3 7 3 12 C 3 17 7 21 12 21 C 17 21 21 17 21 12" />
                  <path d="M8 12 C 10 10 14 10 16 12" />
                </>
              )}
            </svg>
          </div>
          <div
            className="px-[6%] py-[3%] pb-[4%] font-mono font-medium uppercase whitespace-nowrap"
            style={{
              fontSize: Math.max(6, w * 0.05),
              color: "rgba(255,255,255,0.65)",
              letterSpacing: "0.08em",
              borderTop: `1px solid color-mix(in srgb, ${color} 30%, rgba(255,255,255,0.08))`,
            }}
          >
            {set} · {collectorNumber}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement smart `card-art.tsx`** that uses the real image when present, placeholder otherwise

```tsx
"use client"

import Image from "next/image"
import type { CardDTO } from "@/lib/dtos"
import { CardArtPlaceholder, type CardArtSize } from "./card-art-placeholder"

const DIMS: Record<CardArtSize, { w: number; h: number }> = {
  xs: { w: 36, h: 50 },
  sm: { w: 48, h: 67 },
  md: { w: 120, h: 168 },
  lg: { w: 200, h: 280 },
  xl: { w: 280, h: 392 },
}

interface Props {
  card: Pick<CardDTO, "name" | "set" | "collectorNumber" | "game" | "imageSmall" | "imageNormal">
  size?: CardArtSize
}

export function CardArt({ card, size = "md" }: Props) {
  const { w, h } = DIMS[size]
  const src = size === "xl" || size === "lg" ? card.imageNormal ?? card.imageSmall : card.imageSmall ?? card.imageNormal

  if (src) {
    return (
      <div
        className="sleeve shrink-0 overflow-hidden"
        style={{ width: w + 8, height: h + 8 }}
      >
        <div className="w-full h-full relative rounded-[6px] overflow-hidden bg-black">
          <Image src={src} alt={card.name} fill className="object-cover" unoptimized />
        </div>
      </div>
    )
  }

  return (
    <CardArtPlaceholder
      name={card.name}
      set={card.set}
      collectorNumber={card.collectorNumber}
      game={card.game}
      size={size}
    />
  )
}
```

- [ ] **Step 3: Create barrel `src/components/ui/graphite/index.ts`**

```ts
export { Eyebrow } from "./eyebrow"
export { SectionLabel } from "./section-label"
export { Stat } from "./stat"
export { Chip } from "./chip"
export { StatusPill } from "./status-pill"
export { GameChip } from "./game-chip"
export { ConditionChip } from "./condition-chip"
export { CardArt } from "./card-art"
export { CardArtPlaceholder } from "./card-art-placeholder"
export type { CardArtSize } from "./card-art-placeholder"
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/graphite/card-art{,-placeholder}.tsx src/components/ui/graphite/index.ts src/app/globals.css
git commit -m "feat(graphite): card-art placeholder + smart wrapper"
```

### Task 1.6: Extend `Button` variants

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Open `src/components/ui/button.tsx`** (shadcn). It already has `default | destructive | outline | secondary | ghost | link` variants via CVA. Add:
  - `ink` → `bg-ink text-bg hover:bg-ink-2 border-ink`
  - `success` → `bg-signal-green/10 text-signal-green border-signal-green/30 hover:bg-signal-green/20`
  - Rename `default` styles to match Graphite (hot accent, no shadow): `bg-accent-hot text-accent-hot-ink hover:bg-accent-hot-hi`

- [ ] **Step 2: Verify dependent callers still work**

```bash
grep -rn 'variant=\"default\"\|variant=\"destructive\"\|variant=\"outline\"\|variant=\"secondary\"\|variant=\"ghost\"\|variant=\"link\"' src/
npm run typecheck
```

Expected: no type errors; the new variants are additive.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(ui): add ink + success button variants"
```

---

## Phase 2 — Chrome: Sidebar + Header

**Goal:** Port the editorial sidebar (I/II/III section numerals, accent rail on active, wordmark, user footer with avatar) and the minimal-chrome header (eyebrow + title + bell + actions slot).

### Task 2.1: Redesign `AdminSidebar.tsx`

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`

**Reference:** `design/trade-binder-prototype/src/chrome.jsx` lines 3–116 (Sidebar). Render group labels as `I · Collection`, `II · Exchange`, `III · System`. Add an `Inbox` item under Exchange (pending badge from `getPendingOfferCount`). Keep all ADMIN-gating logic for `Members` and `Settings`.

- [ ] **Step 1: Rewrite the component**

Replace the body of `AdminSidebar.tsx`. The nav structure:

```ts
const navGroups = [
  {
    label: "I · Collection",
    items: [
      { id: "01", href: "/admin",             icon: LayoutDashboard, label: "Dashboard" },
      { id: "02", href: "/admin/collection",  icon: Library,         label: "Collection" },
      { id: "03", href: "/admin/targets",     icon: Target,          label: "Targets" },
      { id: "04", href: "/admin/ledger",      icon: History,         label: "Ledger" },
      ...(canAddCards ? [{ id: "05", href: "/admin/add-cards", icon: PlusSquare, label: "Add Cards" }] : []),
    ],
  },
  {
    label: "II · Exchange",
    items: [
      { id: "06", href: "/admin/trade-binder", icon: Repeat2, label: "Trade Binder" },
      { id: "07", href: "/admin/inbox",        icon: Inbox,   label: "Inbox", badge: pendingOffers },
    ],
  },
  ...(isAdmin ? [{
    label: "III · System",
    items: [
      { id: "08", href: "/admin/users",    icon: Users,    label: "Members" },
      { id: "09", href: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  }] : []),
]
```

Wordmark in the header panel:

```tsx
<div className="px-5 pt-6 pb-4 border-b border-rule flex items-baseline gap-2">
  <span className="serif text-[26px] leading-[0.9] tracking-[-0.025em]">
    Binder<span className="text-accent-hot italic">.</span>
  </span>
  <span className="font-mono text-[9px] tracking-[0.2em] text-ink-3 uppercase">v2.0</span>
</div>
```

Active-state styling (accent rail + surface tint):

```tsx
className={cn(
  "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-[var(--radius-sm)] mb-px text-[12.5px]",
  "text-ink-2 transition-colors",
  active
    ? "text-ink font-semibold bg-surface shadow-[inset_0_0_0_1px_var(--rule-strong)] relative"
    : "font-medium hover:bg-bg-sunk"
)}
```

The active accent rail (left):

```tsx
{active && (
  <span className="absolute -left-3 top-1/2 -mt-2 w-[3px] h-4 bg-accent-hot rounded-r-sm" />
)}
```

The numeral prefix (before each icon):

```tsx
<span className="font-mono text-[9px] tracking-[0.18em] w-[18px] text-ink-4">{item.id}</span>
```

Footer (user avatar + theme toggle): port from chrome.jsx lines 94–113. Keep the real `signOut` action on a separate button or move to a user menu. For v1 keep logout as an icon button next to the theme toggle.

- [ ] **Step 2: Smoke-test in dev**

Open `/admin/trade-binder` in the dev server, verify the sidebar shows the new wordmark, three groups, numerals, and accent rail on the active item.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat(chrome): editorial sidebar with I/II/III groups and inbox"
```

### Task 2.2: Redesign `AdminHeader`

**Files:**
- Modify: `src/components/admin/header.tsx`

**Reference:** `design/trade-binder-prototype/src/chrome.jsx` lines 118–228.

- [ ] **Step 1: Accept optional `eyebrow`, `title`, `subtitle`, `actions` props**

```tsx
interface AdminHeaderProps {
  onMenuClick?: () => void
  eyebrow?: string
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}
```

If no `title` is supplied, fall back to deriving from pathname (existing behaviour).

- [ ] **Step 2: Render the new layout**

```tsx
<header className="min-h-[68px] border-b border-rule bg-bg flex items-center px-4 sm:px-7 gap-4 flex-shrink-0 sticky top-0 z-30">
  <button onClick={onMenuClick} className="lg:hidden w-11 h-11 ..."><Menu /></button>

  <div className="flex-1 min-w-0">
    {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
    <div className="flex items-baseline gap-3">
      <h1 className="text-[20px]">{title ?? derivedTitle}</h1>
      {subtitle && <span className="text-[12px] text-ink-3 font-mono tracking-[0.02em]">{subtitle}</span>}
    </div>
  </div>

  {actions}

  {/* Notifications bell with inbox badge */}
  <Link href="/admin/inbox" className="w-[34px] h-[34px] rounded-sm grid place-items-center text-ink-2 border border-rule relative">
    <Bell className="w-4 h-4" />
    {pendingOffers > 0 && (
      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-accent-hot text-accent-hot-ink font-mono text-[9px] font-semibold grid place-items-center border-2 border-bg">
        {pendingOffers}
      </span>
    )}
  </Link>
</header>
```

- [ ] **Step 3: Thread `pendingOffers` via a client fetch** (already exists in `AdminSidebar`; refactor to a shared hook `usePendingOffers` in `src/hooks/usePendingOffers.ts` OR leave both fetches — the call is cheap).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/header.tsx
git commit -m "feat(chrome): editorial header with eyebrow/title/actions + inbox bell"
```

### Task 2.3: Deploy and verify Phase 2

- [ ] **Step 1: Build + deploy-test**

```bash
make deploy-test
```

- [ ] **Step 2: Smoke-check on the Pi** — open `https://raspberrypi.tail884296.ts.net:3002/admin` and verify chrome renders as expected across the dashboard, collection, and trade-binder routes. Route-level content can still look "unstyled"; that's fine until later phases.

---

## Phase 3 — Trade Binder Page (Marketplace)

**Goal:** Port the editorial masthead, feature strip, and grid/row listings. Preserve the existing `TradeBinderClient` contract — it still receives `listings`, `currentUserId`, `myHoldings` from the page component.

**Reference:** `design/trade-binder-prototype/src/marketplace.jsx` in full.

### Task 3.1: `Masthead.tsx`

**Files:**
- Create: `src/components/admin/trade-binder/Masthead.tsx`

- [ ] **Step 1: Create the masthead**

Render the editorial "Issue N°" + serif display-xl headline + 4-cell stat grid. Data-source maps from the real `TradeBinderItemDTO[]`:

```ts
const stats = {
  total: listings.length,
  totalValue: listings.reduce((s, l) => s + (l.card.marketPrice ?? 0), 0),
  games: new Set(listings.map(l => l.card.game)).size,
  myListings: listings.filter(l => l.owner.id === currentUserId).length,
  myOffers: listings.filter(l => l.myOffer).length,
}
```

Full component (port structure from marketplace.jsx 60–89):

```tsx
import type { TradeBinderItemDTO } from "@/lib/dtos"
import { Eyebrow, Stat } from "@/components/ui/graphite"
import { formatUsdCents } from "@/lib/graphite/format-ask"

interface Props {
  listings: TradeBinderItemDTO[]
  currentUserId: string
}

export function Masthead({ listings, currentUserId }: Props) {
  const stats = {
    total: listings.length,
    totalValue: listings.reduce((s, l) => s + (l.card.marketPrice ?? 0), 0),
    games: new Set(listings.map((l) => l.card.game)).size,
    myListings: listings.filter((l) => l.owner.id === currentUserId).length,
    myOffers: listings.filter((l) => l.myOffer).length,
  }
  const issue = String(new Date().getMonth() + 1).padStart(2, "0")

  return (
    <section className="px-8 pt-9 pb-7 border-b border-rule">
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 items-end">
        <div>
          <Eyebrow className="mb-3.5">Issue N° {issue} · The Trading Floor</Eyebrow>
          <h1 className="display-xl serif m-0">
            Cards <span className="serif-italic">open</span> for
            <br />
            trade, today.
          </h1>
          <p className="mt-4 max-w-[520px] text-[14px] text-ink-2 leading-[1.55]">
            Browse {stats.total} listings across {stats.games} games. Every card is held in escrow
            the moment an offer is accepted — you trade with people, not strangers.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-0 border-l border-rule">
          <MastheadCell label="Open listings"      value={stats.total}                           sub={`${stats.games} games`} />
          <MastheadCell label="Total market"       value={formatUsdCents(stats.totalValue)}     sub="at mid-price" />
          <MastheadCell label="Your offers out"    value={stats.myOffers}                         sub="awaiting reply" />
          <MastheadCell label="Your listings live" value={stats.myListings}                      sub="in escrow queue" last />
        </div>
      </div>
    </section>
  )
}

function MastheadCell({ label, value, sub, last }: { label: string; value: string | number; sub: string; last?: boolean }) {
  return (
    <div className={`px-4 py-2.5 ${last ? "" : "border-b border-dashed border-rule"}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value text-[22px] mt-1">{value}</div>
      <div className="font-mono text-[10px] text-ink-3 tracking-[0.04em] mt-0.5">{sub}</div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/trade-binder/Masthead.tsx
git commit -m "feat(trade-binder): editorial masthead"
```

### Task 3.2: `FeatureStrip.tsx`

**Files:**
- Create: `src/components/admin/trade-binder/FeatureStrip.tsx`

- [ ] **Step 1: Port from marketplace.jsx 201–280**

Takes one `TradeBinderItemDTO`, renders the hero with `CardArt size="xl"`, ask/market/condition stats, owner avatar row, and "Open listing" / "List your own" buttons. Use real image via `<CardArt>` wrapper. Onclick opens listing detail dialog (callback passed as prop).

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/trade-binder/FeatureStrip.tsx
git commit -m "feat(trade-binder): feature strip hero"
```

### Task 3.3: `ListingCard.tsx` (grid tile)

**Files:**
- Create: `src/components/admin/trade-binder/ListingCard.tsx`

- [ ] **Step 1: Port GridCard from marketplace.jsx 363–469**

One `<ListingCard listing={...} currentUserId={...} index={i} onClick={...} />` per tile. Uses `CardArt size="md"` (real image when present). Plate number (`№ 001`), title in display serif, condition/set/num row, ask + market stats stacked, owner avatar + offer count badge.

- [ ] **Step 2: Commit**

### Task 3.4: `EmptyShelf.tsx`

**Files:**
- Create: `src/components/admin/trade-binder/EmptyShelf.tsx`

- [ ] **Step 1: Port EmptyShelf from marketplace.jsx 313–342** — three fanned-out placeholder cards with the serif "Nothing on the binder today" headline. Uses `<CardArtPlaceholder>` for the three fake tiles.

- [ ] **Step 2: Commit**

### Task 3.5: Rewire `TradeBinderClient.tsx`

**Files:**
- Modify: `src/components/admin/TradeBinderClient.tsx`

- [ ] **Step 1: Replace the current header strip + inline grid markup** with a compose:

```tsx
<div className="flex-1 overflow-y-auto">
  <div className="max-w-[1440px] mx-auto pb-12">
    <Masthead listings={listings} currentUserId={currentUserId} />
    {feature && <FeatureStrip listing={feature} onOpen={() => setOpenListingId(feature.holdingId)} onCreateListing={() => setCreatingListing(true)} />}
    <Toolbar
      search={search} setSearch={setSearch}
      gameFilter={gameFilter} setGameFilter={setGameFilter}
      conditionFilter={conditionFilter} setConditionFilter={setConditionFilter}
      sortBy={sortBy} setSortBy={setSortBy}
      onlyTradable={onlyTradable} setOnlyTradable={setOnlyTradable}
      count={filtered.length}
      onCreateListing={() => setCreatingListing(true)}
    />
    <div className="px-8">
      {filtered.length === 0 ? (
        <EmptyShelf onCreate={() => setCreatingListing(true)} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0 border-t border-l border-rule">
          {filtered.map((l, i) => (
            <ListingCard key={l.holdingId} listing={l} currentUserId={currentUserId} index={i} onClick={() => setOpenListingId(l.holdingId)} />
          ))}
        </div>
      )}
    </div>
  </div>

  {openListingId && (
    <ListingDetailDialog
      listingId={openListingId}
      currentUserId={currentUserId}
      onClose={() => setOpenListingId(null)}
      onMakeOffer={() => { setMakingOfferOn(openListingId); setOpenListingId(null); }}
    />
  )}
  {makingOfferOn && (
    <MakeOfferWizard
      listingId={makingOfferOn}
      currentUserId={currentUserId}
      myHoldings={myHoldings}
      onClose={() => setMakingOfferOn(null)}
    />
  )}
  {creatingListing && (
    <CreateListingDialog
      onClose={() => setCreatingListing(false)}
    />
  )}
</div>
```

The Toolbar is inline (port from marketplace.jsx 94–169). Add client-side sort + filter state to match. The `feature` memo:

```ts
const feature = useMemo(() => {
  const others = filtered.filter((l) => l.owner.id !== currentUserId)
  return [...others].sort((a, b) => (b.card.marketPrice ?? 0) - (a.card.marketPrice ?? 0))[0] ?? filtered[0] ?? null
}, [filtered, currentUserId])
```

Remove the old per-tile inline "Make Offer" / "Withdraw" buttons and the `showOffersPanel` side panel toggle — both go away in favour of the dialog + inbox route.

- [ ] **Step 2: Smoke-test in dev**

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/TradeBinderClient.tsx src/components/admin/trade-binder/
git commit -m "feat(trade-binder): marketplace page with masthead + feature + grid"
```

### Task 3.6: Deploy Phase 3 and verify

```bash
make deploy-test
```

Open `/admin/trade-binder` on the Pi and walk through: masthead renders, feature loads highest-market card not mine, tiles click (will error until Phase 4 lands — that's OK for this checkpoint; verify just the visuals).

---

## Phase 4 — Listing Detail Modal

**Goal:** Replace the inline "Make Offer" button with a rich listing detail modal featuring the card on a dark stage (left) and the offer thread (right).

**Reference:** `design/trade-binder-prototype/src/listing-detail.jsx` in full.

### Task 4.1: `ListingDetailDialog.tsx`

**Files:**
- Create: `src/components/admin/trade-binder/ListingDetailDialog.tsx`
- Create: `src/components/admin/trade-binder/OfferCard.tsx`

Server data fetch: this modal needs the full offer list for a holding, not just `listing.offerCount`. Extend `HoldingService.listTradeBinder` is **not needed** — instead, create a new server action that returns the offers for a specific listing.

- [ ] **Step 1: Add `getOffersForListing` to `src/app/actions/trade-offer.ts`**

```ts
export async function getOffersForListing(holdingId: string): Promise<ActionResult<TradeOfferDTO[]>> {
  const session = await requireUser()
  try {
    const rows = await TradeOfferRepository.findByHoldingId(holdingId)
    return { success: true, data: rows.map(toTradeOfferDTO) }
  } catch (error) {
    console.error("Get Offers For Listing Error:", error)
    return { success: false, error: (error as Error).message }
  }
}
```

And add `findByHoldingId` to `src/repositories/trade-offer.repository.ts` if it doesn't already exist:

```ts
static async findByHoldingId(holdingId: string) {
  return prisma.tradeOffer.findMany({
    where: { holdingId },
    include: TRADE_OFFER_INCLUDE, // reuse existing include constant
    orderBy: { createdAt: "desc" },
  })
}
```

- [ ] **Step 2: Create `OfferCard.tsx`** — port from listing-detail.jsx 242–416. Renders a single offer with the "They offer / They get" two-column diagram, the fairness delta bar (uses `computeFairness` from Phase 1), the message blockquote, and the action row (Accept/Decline/Counter for owners, Withdraw/Revise for mine). Wire actions to `acceptOffer` / `declineOffer` / `withdrawOffer` server actions, surface toasts via `sonner`.

- [ ] **Step 3: Create `ListingDetailDialog.tsx`** — port from listing-detail.jsx 5–212.
  - Wrap in the existing `<Dialog>` primitive from `src/components/ui/dialog.tsx` (shadcn/Radix); force a wider content via `max-w-[1080px]`.
  - Left pane: dark stage with `<CardArt size="xl">`, serif card name, meta, condition chip, `tradeNotes` rendered as italic blockquote.
  - Right pane: price panel (ask / market / owner stats), offer list (uses `OfferCard`), action bar (Make an offer / Revise offer / Edit listing).
  - Load offers on mount with `getOffersForListing`.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/trade-offer.ts src/repositories/trade-offer.repository.ts src/components/admin/trade-binder/{ListingDetailDialog,OfferCard}.tsx
git commit -m "feat(trade-binder): listing detail modal with offer thread"
```

### Task 4.2: Smoke-test and deploy

- [ ] **Step 1: In dev, click a tile on `/admin/trade-binder`**. Modal opens. Offers load. Accept a pending offer end-to-end (against a dev DB seeded with two test users).

- [ ] **Step 2: deploy-test**

```bash
make deploy-test
```

---

## Phase 5 — Make Offer Wizard

**Goal:** Replace the single-screen `MakeOfferDialog` with a 2-step wizard: compose (cash + cards + fairness feedback) → review (summary + message + escrow copy).

**Reference:** `design/trade-binder-prototype/src/make-offer.jsx` in full.

### Task 5.1: `MakeOfferWizard.tsx`

**Files:**
- Create: `src/components/admin/trade-binder/MakeOfferWizard.tsx`
- Delete: `src/components/admin/MakeOfferDialog.tsx` (do this in Phase 9 cleanup — keep around until we confirm the wizard works)

- [ ] **Step 1: Build step 1 (compose)**

Port the left column (cash input + pool of own holdings with inline select) and right column (running ledger + fairness banner) from make-offer.jsx 74–277. Reuse `CardPickerDialog` is **NOT** appropriate here — the design inlines the picker into the left column. Write an inline variant directly in this file (reuse the existing pickable-holding data from `myHoldings` prop).

Fairness banner reads from `computeFairness(offerTotal, askValue)`, where `askValue` resolves as:

```ts
const askValue = listing.askType === "trade_only"
  ? listing.card.marketPrice ?? 0
  : listing.askPrice ?? listing.askValue ?? 0
```

- [ ] **Step 2: Build step 2 (review)**

Port from make-offer.jsx 278–334. Two `SideSummary` columns (you send / you receive), message textarea, escrow note, action row. Submit calls `makeOffer` from `src/app/actions/trade-offer.ts` with the exact same input shape the old dialog used — no server changes.

- [ ] **Step 3: Step navigation**

Use `useState<1 | 2>(1)`. Step dots component from make-offer.jsx 389–401. "Review offer" button advances to 2; "Back" returns to 1. "Send offer" dispatches.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/trade-binder/MakeOfferWizard.tsx
git commit -m "feat(trade-binder): 2-step offer wizard with fairness"
```

### Task 5.2: Swap wizard into `TradeBinderClient` and `ListingDetailDialog`

- [ ] **Step 1: Replace `<MakeOfferDialog>` with `<MakeOfferWizard>` in both files.**

- [ ] **Step 2: Smoke-test end-to-end**: open a listing, click Make an offer, pick holdings, see fairness flip from Lowball → Fair → Over as cash scrubbed, submit, verify offer appears in `OffersPanel` / inbox.

- [ ] **Step 3: Commit + deploy-test**

```bash
git add src/components/admin/TradeBinderClient.tsx src/components/admin/trade-binder/ListingDetailDialog.tsx
git commit -m "feat(trade-binder): wire wizard into listing + binder flows"
make deploy-test
```

---

## Phase 6 — Create Listing Dialog

**Goal:** Add a dedicated "put a card on the shelf" composer, opened from the Trade Binder page (and optionally from Collection in a later task).

**Reference:** `design/trade-binder-prototype/src/create-listing.jsx` in full.

### Task 6.1: `CreateListingDialog.tsx`

**Files:**
- Create: `src/components/admin/trade-binder/CreateListingDialog.tsx`

- [ ] **Step 1: Build the dialog**

Two-pane layout (360px picker on left, form on right):
- Left: searchable list of own unlisted holdings. Data source: client prop `myHoldings: HoldingDTO[]` filtered by `listedForTrade === false`.
- Right: card preview with meta + ask-type picker (`custom` / `percent` / `trade_only` — **label the `custom` option as "Fixed"** to match the design while keeping the DB value).
- Ask value inputs: dollar field (`custom`), slider 70–130% (`percent`), info callout (`trade_only`).
- Notes textarea.
- Footer: Cancel + "Publish listing".

Submit wires through the existing `updateHolding` action (`src/app/actions/holding.ts`) with:

```ts
{
  id: selectedHoldingId,
  listedForTrade: true,
  askType,                               // 'custom' | 'percent' | 'trade_only'
  askValue: askType === 'custom' ? askPrice : askType === 'percent' ? percent : null,
  listedQuantity: 1,                     // default to 1; full fractional listing is existing behaviour
  tradeNotes: notes || null,
}
```

Confirm by reading `src/app/actions/holding.ts` that `updateHolding` accepts these fields. If not, add a tight `listHolding` action that sets only those fields — keep the mutation scoped.

- [ ] **Step 2: Wire into Trade Binder page**

Trigger already in place from Phase 3 (the "List a card" button in the toolbar). Pass `myHoldings` through.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/trade-binder/CreateListingDialog.tsx
git commit -m "feat(trade-binder): create listing composer"
```

---

## Phase 7 — Inbox Route

**Goal:** Replace `OffersPanel` (side-panel on trade-binder) with a dedicated `/admin/inbox` page, wired to the sidebar + bell.

**Reference:** `design/trade-binder-prototype/src/inbox.jsx` in full.

### Task 7.1: Route scaffold

**Files:**
- Create: `src/app/admin/(dashboard)/inbox/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getMyOffers, getOffersOnMyListings } from "@/app/actions/trade-offer"
import { InboxClient } from "@/components/admin/inbox/InboxClient"

export const dynamic = "force-dynamic"

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")

  const [inRes, outRes] = await Promise.all([getOffersOnMyListings(), getMyOffers()])
  const incoming = inRes.success ? inRes.data : []
  const outgoing = outRes.success ? outRes.data : []

  return <InboxClient incoming={incoming} outgoing={outgoing} currentUserId={session.user.id} />
}
```

- [ ] **Step 2: Commit**

### Task 7.2: `InboxClient.tsx`

**Files:**
- Create: `src/components/admin/inbox/InboxClient.tsx`
- Create: `src/components/admin/inbox/InboxRow.tsx`
- Create: `src/components/admin/inbox/LedgerStat.tsx`

- [ ] **Step 1: Port inbox.jsx 5–83** — serif masthead, three-tab nav (incoming / sent / settled), list body.

- [ ] **Step 2: Port InboxRow from inbox.jsx 98–188** — plate number, card art, card+offeror line, composition + vs-ask delta, status pill, action buttons (Counter / Review / Open).

- [ ] **Step 3: Actions wiring**
  - Counter button → open `MakeOfferWizard` with the same `holdingId` (counter-offer is "compose a new offer on the same listing").
  - Review / Open button → open `ListingDetailDialog` with that listing's `holdingId`, focusing the row's offer (offer highlight = pass `focusOfferId` prop; OfferCard animates with ring).

- [ ] **Step 4: Empty states**

Port from inbox.jsx 190–222 — three tab-specific editorial empty states.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/(dashboard)/inbox/ src/components/admin/inbox/
git commit -m "feat(inbox): editorial offer ledger route"
```

### Task 7.3: Remove side-panel

- [ ] **Step 1: Delete `src/components/admin/OffersPanel.tsx`**

- [ ] **Step 2: Remove side-panel toggle from `TradeBinderClient.tsx`** (already removed in Phase 3; verify nothing still imports `OffersPanel`)

```bash
grep -rn "OffersPanel" src/
```

Expected: no references.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "refactor(trade-binder): remove side-panel (superseded by /admin/inbox)"
```

### Task 7.4: Deploy Phase 7

```bash
make deploy-test
```

Verify `/admin/inbox` loads with three tabs; counter from a pending row opens the wizard; clicking Review opens the listing with the offer highlighted.

---

## Phase 8 — Login Redesign

**Goal:** Port the editorial login aesthetic (card cascade, ambient aurora, serif hero) to the real NextAuth credentials form. Persona-switcher from the demo is not brought over — replaced by email/password inputs.

**Reference:** `design/trade-binder-prototype/src/login.jsx` in full.

### Task 8.1: `src/app/admin/login/page.tsx`

**Files:**
- Modify: `src/app/admin/login/page.tsx`

- [ ] **Step 1: Read the current login page** to preserve the existing `signIn` handler, form state, and error display.

- [ ] **Step 2: Rewrite with the two-panel layout**

Left panel (`aside`): ambient `.aurora` div, wordmark, centered `FanCard` cascade (port `FanCard` component verbatim from login.jsx 267–330), bottom tagline with hero stats (static — "Since 2022 · N trades closed" etc.; drop demo numbers or read from a new `getTailnetStats` action if this is visible to logged-out users, in which case add a public-read action).

Right panel: eyebrow "Sign in · No. 01", serif display-xl hero `Welcome / back to the binder.`, email input (not persona picker), password input, Sign in button with spinner state, "Forgot?" link, footer microcopy.

Append the `fan-float` keyframe via a `<style jsx global>` block or append to `globals.css` (prefer globals):

```css
@keyframes fan-float {
  0%   { transform: translate(var(--fx, 0), var(--fy, 0)) rotateZ(var(--fr, 0deg)); }
  100% { transform: translate(0, -6px) rotateZ(0deg); }
}

.aurora {
  position: absolute; inset: 0;
  pointer-events: none;
  opacity: 0.6;
  background:
    radial-gradient(ellipse 60% 50% at 15% 20%, color-mix(in srgb, var(--accent-hot) 18%, transparent) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 85% 80%, color-mix(in srgb, var(--accent-cool) 16%, transparent) 0%, transparent 55%),
    radial-gradient(ellipse 40% 30% at 75% 15%, color-mix(in srgb, var(--signal-plum) 14%, transparent) 0%, transparent 50%);
  filter: blur(40px);
  animation: aurora-drift 18s ease-in-out infinite alternate;
}
@keyframes aurora-drift {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(3%, -2%) scale(1.08); }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/login/page.tsx src/app/globals.css
git commit -m "feat(login): editorial login with card cascade + aurora"
```

### Task 8.2: Deploy + verify login flow still works

```bash
make deploy-test
```

Log out, sign back in on the new login screen. Verify real auth (wrong password → error, correct → redirect to `/admin`).

---

## Phase 9 — Cleanup, Docs, Prod Deploy

### Task 9.1: Dead code removal

- [ ] **Step 1: Delete unused files**

```bash
rm src/components/admin/layout.tsx            # dead import path
rm src/components/admin/MakeOfferDialog.tsx   # superseded by MakeOfferWizard
# OffersPanel.tsx already deleted in Phase 7
```

- [ ] **Step 2: Verify nothing imports them**

```bash
grep -rn 'MakeOfferDialog\|components/admin/layout\|OffersPanel' src/
```

Expected: no matches.

- [ ] **Step 3: Remove stale CSS**

In `globals.css`, the `@layer components` block still holds `.gradient-brand`, `.gradient-mesh`, `.dark .gradient-mesh`, `.gradient-glow`, `.card-glow`, `.glass`, `.sidebar-link`. None of these are used by the redesigned screens. Confirm with `grep -rn 'gradient-brand\|gradient-mesh\|card-glow\|\.glass\|sidebar-link' src/` and delete any utilities with zero hits.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore: remove dead code and stale Alcove utilities"
```

### Task 9.2: Docs

- [ ] **Step 1: Update `.project-notes.md`**

- Bump "Last updated" to 2026-04-20 (or current date).
- Add a new "UI/Design" subsection noting:
  - Theme: "Graphite" — Geist + Instrument Serif; electric vermilion primary (#ff4d2e); off-white #f6f6f4 bg.
  - Reference prototype lives at `design/trade-binder-prototype/` (not shipped, gitignored? — see Step 2).
  - Trade flow is now: Trade Binder (masthead + feature + grid) → Listing Detail modal → Make Offer Wizard (2 steps) → accept surfaces in `/admin/inbox`.

- [ ] **Step 2: Decide on prototype tree in git**

Options:
- Commit `design/trade-binder-prototype/` as a reference artifact (pro: durable, linkable from docs; con: ~30KB of static JSX prototype in the repo).
- Add to `.gitignore` (pro: keeps repo slim; con: losing the artifact means rebuilds without the reference).

Recommend **commit it** but strip the included `node_modules`-equivalents (there are none, so fine as-is). Add `design/` to the README's project structure block.

- [ ] **Step 3: Update `README.md`**

In the `## Pages` table, add `/admin/inbox | Trade offer ledger (incoming / sent / settled)`. In `## Project structure`, add:

```
design/
  trade-binder-prototype/   reference design system (Graphite) + trade flow prototype
```

- [ ] **Step 4: Commit**

```bash
git add .project-notes.md README.md docs/
git commit -m "docs: record graphite redesign + inbox route"
```

### Task 9.3: Final validation

- [ ] **Step 1: Full test run**

```bash
npx vitest run       # expect ~130 + new fairness/format-ask/status-pill tests, all green
npm run typecheck    # clean
npm run lint         # clean
```

- [ ] **Step 2: Full build from clean**

```bash
DATABASE_URL="postgres://fake:fake@localhost:5432/fake" AUTH_SECRET="build-time-placeholder-min-32-chars-long" npm run build
```

- [ ] **Step 3: Test deploy and manual walkthrough on the Pi**

```bash
make deploy-test
```

Walk every redesigned route on `https://raspberrypi.tail884296.ts.net:3002/admin`:
1. `/admin/login` — card cascade renders, aurora visible, sign-in works.
2. `/admin` — sidebar + header chrome render; dashboard content still renders (out-of-scope for this redesign; the body may be visually plain, but it must not error).
3. `/admin/trade-binder` — masthead + feature + grid. Click a tile → detail modal. Make an offer wizard end-to-end.
4. `/admin/inbox` — three tabs, Counter triggers wizard, Review opens detail.
5. `/admin/collection` — still functional (out of scope); verify the new "List a card" dialog works if wired there.
6. Dark-mode toggle on the sidebar footer — full page flips palette correctly (verify with `/admin/trade-binder` side-by-side).

- [ ] **Step 4: Open PR against main**

```bash
gh pr create --title "Graphite redesign + trades workflow overhaul" --body "$(cat <<'EOF'
## Summary
- Replaces Collector's Alcove theme with Graphite (electric vermilion + Geist + Instrument Serif)
- Rebuilds trade flow: editorial Trade Binder, dark-stage Listing Detail modal, 2-step Make Offer wizard with fairness indicator, Create Listing composer, /admin/inbox ledger route
- Preserves all server action contracts — no DB migration
- Reference prototype under design/trade-binder-prototype/

## Test plan
- [x] Vitest: 130+ existing plus fairness, format-ask, status-pill
- [x] Typecheck + lint clean
- [x] Full build green
- [x] Deployed to test (cards.abhik-roy.com:3002 equivalent) and walked every redesigned route
- [x] Dark mode renders correctly across redesigned screens
- [x] Offer flow end-to-end: list → offer → accept, holdings transfer correctly, ledger reflects changes
EOF
)"
```

- [ ] **Step 5: After PR merge, prod deploy**

```bash
git checkout main
git pull
make deploy
```

- [ ] **Step 6: Post-deploy smoke** on `https://cards.abhik-roy.com` — one full offer round-trip with two real users.

- [ ] **Step 7: Clean up the worktree**

```bash
cd /home/abhikroy/Desktop/tcg-ledger-formerly-vault
git worktree remove ../tcg-ledger-graphite
```

---

## Out-of-scope explicitly deferred

The prototype shows placeholder screens for Dashboard, Collection, Targets, Ledger, Members, Settings. This plan **does not** redesign those bodies — they inherit the new chrome (sidebar + header + fonts + palette) for free from Phase 0 + 2 and visually cohere at the shell level, but their internal layouts remain as-is.

A follow-up plan, `2026-05-XX-graphite-surfaces-overhaul.md`, can tackle each in turn:
- Dashboard: editorial portfolio / activity / watchlist
- Collection: full binder grid with filters + bulk edit
- Targets: saved searches + alerts
- Ledger: settled-trade history with delta arithmetic

Counter-offer as a first-class flow (the prototype inbox's "Counter" action today just re-opens the wizard) could become `2026-05-XX-counter-offers.md` — requires a `counteredBy` column on `TradeOffer`.
