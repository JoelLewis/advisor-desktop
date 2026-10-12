export type HoldingCharacter = 'short' | 'long'

/**
 * §0.6 · what kind of asset a gain is on. A collectible (§408(m): art, coins, any metal) is taxed
 * long-term at up to 28% (§1(h)(4)–(5)), not 20%. Short-term, it is ordinary income like any
 * other short-term gain.
 */
export type TaxCharacter = 'capital_asset' | 'collectible'

/** The rate a gain of this holding period and character is taxed at. */
export type RateFor = (holdingPeriod: HoldingCharacter, character?: TaxCharacter) => number

/**
 * IRC §1222: net short-term and long-term results within each character, then offset a net loss
 * in one against a net gain in the other. A net loss overall owes nothing here, never a negative
 * tax; the excess carries forward (§1212) and is not shown on any surface.
 *
 * `collectibleLongTerm` is the part of `longTerm` that is collectibles gain or loss. Under
 * §1(h)(4) the 28%-rate gain is collectibles gain less collectibles loss, less any net
 * short-term loss, and (Schedule D Tax Worksheet) never more than the net long-term gain left
 * after all netting, so every loss reaches the 28% gain before the 20% gain.
 */
export function netCapitalGainsTax(shortTerm: number, longTerm: number, rateFor: RateFor, collectibleLongTerm = 0): number {
  let st = shortTerm
  let lt = longTerm
  if (st < 0 && lt > 0) { lt = Math.max(0, lt + st); st = 0 }
  else if (lt < 0 && st > 0) { st = Math.max(0, st + lt); lt = 0 }
  const netLongTerm = Math.max(0, lt)
  const collectiblesGain = Math.min(netLongTerm, Math.max(0, collectibleLongTerm + Math.min(0, shortTerm)))
  return Math.round(
    Math.max(0, st) * rateFor('short')
    + (netLongTerm - collectiblesGain) * rateFor('long')
    + collectiblesGain * rateFor('long', 'collectible'),
  )
}

/**
 * What `netTaxForLegs` reads off each leg: its signed realised result by holding period, the part
 * of the long-term result that is collectibles (absent: none), and its own tax.
 */
export type TaxedLeg = { realisedShortTerm: number; realisedLongTerm: number; realisedCollectibleLongTerm?: number; taxImpact: number }

/**
 * The estimated tax on one proposal **on its own**: `net` is its legs' results netted under §1222
 * (no year-to-date realised results, no other account), `gross` the sum of the legs' own tax on
 * gains. Netting a proposal's own legs never raises its bill, so `net` is clamped to `gross`: it
 * rounds once where `gross` rounds per leg, and with nothing to net the two can differ by a dollar.
 *
 * That bound is this function's alone. The figure a preview shows is the tax the proposal adds to
 * its return (`additionalCapitalGainsTax`), which `gross` does not bound — see there.
 */
export function netTaxForLegs(legs: readonly TaxedLeg[], rateFor: RateFor): { net: number; gross: number } {
  const gross = legs.reduce((s, l) => s + l.taxImpact, 0)
  const shortTerm = legs.reduce((s, l) => s + l.realisedShortTerm, 0)
  const longTerm = legs.reduce((s, l) => s + l.realisedLongTerm, 0)
  const collectibleLongTerm = legs.reduce((s, l) => s + (l.realisedCollectibleLongTerm ?? 0), 0)
  return { net: Math.min(netCapitalGainsTax(shortTerm, longTerm, rateFor, collectibleLongTerm), gross), gross }
}

/** Signed realised results by holding period; `collectibleLongTerm` is the part of `longTerm` on collectibles (absent: none). */
export type RealisedByCharacter = { shortTerm: number; longTerm: number; collectibleLongTerm?: number }

/**
 * The tax `added` puts on a return that has already realised `prior` this year: §1222-netted tax
 * on both together, less the tax `prior` already owes. How it relates to `added`'s own tax on
 * gains (a preview's `grossTaxOnGains`):
 * - **At most the gross when `prior` is a gain or nil in both characters.** Every added dollar of
 *   gain is then taxed at no more than its own rate, and every added loss can only lower the bill.
 * - **Above the gross otherwise, legitimately.** A gain that uses up a loss which was sheltering a
 *   gain of the other character un-shelters that gain: prior ST +10,000 and LT −10,000 owe 0;
 *   adding LT +10,000 makes the ST gain taxable, 4,080 at 40.8% against 2,380 of its own tax.
 * - **Negative when `added` lowers the bill**: a loss against gains already realised this year.
 *   It is never below `−netCapitalGainsTax(prior)` — trades cannot save more than the year owes.
 *
 * Capital-gains tax only: the §1211(b) offset of net capital loss against ordinary income and any
 * §1212 carryforward from prior years are not modelled (`CAPITAL_LOSS_SCOPE_NOTE`).
 */
export function additionalCapitalGainsTax(
  prior: RealisedByCharacter,
  added: RealisedByCharacter,
  rateFor: RateFor,
): number {
  const priorCollectibles = prior.collectibleLongTerm ?? 0
  const before = netCapitalGainsTax(prior.shortTerm, prior.longTerm, rateFor, priorCollectibles)
  const after = netCapitalGainsTax(
    prior.shortTerm + added.shortTerm,
    prior.longTerm + added.longTerm,
    rateFor,
    priorCollectibles + (added.collectibleLongTerm ?? 0),
  )
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
