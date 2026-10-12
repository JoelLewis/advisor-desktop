export type HoldingCharacter = 'short' | 'long'

/**
 * IRC §1222: net short-term and long-term results within each character, then offset a net loss
 * in one against a net gain in the other. A net loss overall owes nothing here, never a negative
 * tax; the excess carries forward (§1212) and is not shown on any surface.
 */
export function netCapitalGainsTax(shortTerm: number, longTerm: number, rateFor: (p: HoldingCharacter) => number): number {
  let st = shortTerm
  let lt = longTerm
  if (st < 0 && lt > 0) { lt = Math.max(0, lt + st); st = 0 }
  else if (lt < 0 && st > 0) { st = Math.max(0, st + lt); lt = 0 }
  return Math.round(Math.max(0, st) * rateFor('short') + Math.max(0, lt) * rateFor('long'))
}

/** What `netTaxForLegs` reads off each leg: its signed realised result by character, and its own tax. */
export type TaxedLeg = { realisedShortTerm: number; realisedLongTerm: number; taxImpact: number }

/**
 * The estimated tax on one proposal: `net` is its legs' results netted under §1222 (this
 * proposal only — no year-to-date realised results, no other account), `gross` the sum of the
 * legs' own tax on gains. `net` is clamped to `gross`: it rounds once where `gross` rounds per
 * leg, so with nothing to net the two can differ by a dollar, and netting never raises a bill.
 */
export function netTaxForLegs(legs: readonly TaxedLeg[], rateFor: (p: HoldingCharacter) => number): { net: number; gross: number } {
  const gross = legs.reduce((s, l) => s + l.taxImpact, 0)
  const shortTerm = legs.reduce((s, l) => s + l.realisedShortTerm, 0)
  const longTerm = legs.reduce((s, l) => s + l.realisedLongTerm, 0)
  return { net: Math.min(netCapitalGainsTax(shortTerm, longTerm, rateFor), gross), gross }
}

/** Signed realised results by character. */
export type RealisedByCharacter = { shortTerm: number; longTerm: number }

/**
 * The tax `added` puts on a return that has already realised `prior` this year: §1222-netted tax
 * on both together, less the tax `prior` already owes. It is not clamped to the legs' own tax —
 * a gain that uses up a loss which was sheltering a short-term gain legitimately costs more than
 * its own rate — and it is negative when `added` is a loss against gains already realised.
 */
export function additionalCapitalGainsTax(
  prior: RealisedByCharacter,
  added: RealisedByCharacter,
  rateFor: (p: HoldingCharacter) => number,
): number {
  const before = netCapitalGainsTax(prior.shortTerm, prior.longTerm, rateFor)
  const after = netCapitalGainsTax(prior.shortTerm + added.shortTerm, prior.longTerm + added.longTerm, rateFor)
  return after - before
}
