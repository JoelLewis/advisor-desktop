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
 * The estimated tax on one proposal **on its own**: `net` is its legs' results netted under §1222
 * (no year-to-date realised results, no other account), `gross` the sum of the legs' own tax on
 * gains. Netting a proposal's own legs never raises its bill, so `net` is clamped to `gross`: it
 * rounds once where `gross` rounds per leg, and with nothing to net the two can differ by a dollar.
 *
 * That bound is this function's alone. The figure a preview shows is the tax the proposal adds to
 * its return (`additionalCapitalGainsTax`), which `gross` does not bound — see there.
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
 * on both together, less the tax `prior` already owes. How it relates to `added`'s own tax on
 * gains (a preview's `grossTaxOnGains`):
 * - **At most the gross when `prior` is a gain or nil in both characters.** Every added dollar of
 *   gain is then taxed at no more than its own rate, and every added loss can only lower the bill.
 * - **Above the gross otherwise, legitimately.** A gain that uses up a loss which was sheltering a
 *   gain of the other character un-shelters that gain: prior ST +10,000 and LT −10,000 owe 0;
 *   adding LT +10,000 makes the ST gain taxable, 3,700 at 37% against 2,380 of its own tax.
 * - **Negative when `added` lowers the bill**: a loss against gains already realised this year.
 *   It is never below `−netCapitalGainsTax(prior)` — trades cannot save more than the year owes.
 *
 * Capital-gains tax only: the §1211(b) offset of net capital loss against ordinary income and any
 * §1212 carryforward from prior years are not modelled (`CAPITAL_LOSS_SCOPE_NOTE`).
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

/** §1211(b): net capital loss offsets up to this much ordinary income a year ($1,500 married filing separately). */
export const ORDINARY_INCOME_OFFSET_LIMIT = 3_000 as const

/** What every return-level tax estimate leaves out, stated wherever one is shown. */
export const CAPITAL_LOSS_SCOPE_NOTE =
  `Capital-gains tax only: excludes the up-to-${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(ORDINARY_INCOME_OFFSET_LIMIT)} ` +
  'offset of net capital loss against ordinary income (§1211(b)) and any prior-year loss carryforward (§1212).'

/**
 * A return-level estimate is signed: positive is tax the trades add, negative tax they save
 * against what the year's realised results already owe. Surfaces state the direction in words and
 * the amount unsigned, rather than a signed "tax added" figure.
 */
export function taxEstimateDirection(estimate: number): { direction: 'added to' | 'saved on'; amount: number } {
  return estimate < 0 ? { direction: 'saved on', amount: -estimate } : { direction: 'added to', amount: estimate }
}
