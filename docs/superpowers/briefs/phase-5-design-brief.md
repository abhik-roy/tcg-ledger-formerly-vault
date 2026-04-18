# Phase 5 Frontend Design Brief

## Context

Retargeted TCG collection tracker, admin-facing, Tailnet-scoped. Dev admin
seeded at dev@local/devpassword with 10 fixture cards. Phase 4 has retargeted
all pages to compile and render against new Card+Holding DTOs — you are now
applying the visual refresh and mobile responsive work.

## Stack

- Next.js 16.1, React 19.2, TypeScript 5
- Tailwind CSS 4
- shadcn/ui + Radix UI primitives (already installed — stay with these)
- next-themes (light/dark, both modes must work)
- React Compiler enabled
- Lucide icons

## Priority pages (full visual refresh + mobile)

1. `/admin/login` — currently generic auth card; needs distinctive TCG-aware landing
2. `/admin` (dashboard) — currently revenue-chart layout retargeted; needs "collection at a glance" feel with personal + Tailnet stats
3. `/admin/trade-binder` — brand new page; most design attention; grid of listed cards with good empty state
4. `/admin/collection` — power-user density preserved; better type hierarchy, cleaner filters
5. Card detail modal (src/components/CardDetailDialog.tsx) — desktop centered dialog, mobile full-screen sheet

## Minimal-touch pages (responsive only, no visual redesign beyond what's structurally necessary)

- `/admin/ledger`, `/admin/targets`, `/admin/add-cards`, `/admin/users`, `/admin/settings`

## Responsive requirements

Every retained page must work in iOS Safari + Android Chrome at 375-428px
portrait and 667-926px landscape. Specific patterns per spec §6.2:

- Sidebar → hamburger drawer on mobile
- TanStack tables → card-per-row below md breakpoint
- Card detail modal → full-screen sheet on mobile
- Touch targets: 44x44 px minimum

## Research inputs

Read these before designing:

- docs/superpowers/research/frontend-audit.md (code-based current state)
- docs/superpowers/research/ux-heuristic-audit.md (pain points)
- docs/superpowers/research/competitive-analysis.md (Deckbox/Moxfield/ManaBox patterns)
- docs/superpowers/research/user-journeys.md (the three core journeys)

## Out of scope

- No new component library (stay with shadcn + Radix)
- No new animation library unless you can prove it's needed (Tailwind + CSS transitions preferred)
- No PWA / service worker / offline mode
- No mobile app
- No i18n / translations
- No custom illustrations or original artwork
- No design system documentation site

## Success criteria

- Playwright smoke passes at both 1440x900 and 390x844 viewports
- No body horizontal overflow on any page at 390px
- All touch targets >= 44x44 on mobile
- Dark mode works on every priority page
- The login page does NOT look like a default shadcn template
- The dashboard does NOT look like a Vercel template
