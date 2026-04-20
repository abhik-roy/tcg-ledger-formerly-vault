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
  delta: number
  deltaPct: number
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
