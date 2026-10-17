import { convertToBase } from '@/lib/currency'
import type { TaxCharacter } from '@/lib/capital-gains'
import type { TaxLot } from '@/types/portfolio'
import type { CurrencyCode, FXRateMap } from '@/types/currency'

/** The caveat a prospect proposal's tax figures carry. */
export const TAX_ESTIMATE_NOTE = 'Tax figures are estimates at the top federal rate; state tax is not modeled; consult your tax professional.'

/**
 * A flat 37% was applied to every lot and rendered directly beside a
 * "Long" holding-period badge. Long-term losses offset long-term gains at capital-gains rates.
 *
 * These are the top federal marginal rates and exclude state tax. The screen must say so.
 *
 * The 3.8% net investment income tax (IRC §1411) applies to net gain of either character,
 * so it belongs on the short-term rate as much as the long-term one: a top-bracket short-term gain
 * is taxed at 37% + 3.8% = 40.8%, not 37%. The components are kept so the rates can be checked
 * against them; the rates themselves are literals because 0.37 + 0.038 is not exactly 0.408 in
 * floating point.
 */
export const TOP_ORDINARY_RATE = 0.37 as const
export const TOP_LONG_TERM_GAINS_RATE = 0.2 as const
export const NIIT_RATE = 0.038 as const
/** 37% top ordinary rate + 3.8% net investment income tax. */
export const SHORT_TERM_RATE = 0.408 as const
/** 20% long-term capital gains + 3.8% net investment income tax. */
export const LONG_TERM_RATE = 0.238 as const

/**
 * A long-term collectibles gain — including a sale of GLD or another grantor trust holding
 * physical metal (`taxCharacterOf`) — is taxed at up to 28% (§1(h)(4)), not 20%, and NIIT applies
 * to it as to any gain. Short-term, a collectible is taxed like any short-term gain.
 */
export const TOP_COLLECTIBLES_RATE = 0.28 as const
/** 28% maximum collectibles rate + 3.8% net investment income tax. */
export const COLLECTIBLE_LONG_TERM_RATE = 0.318 as const

/** What the rates include and leave out, so a screen can state the basis of every estimate. */
export type TaxRateBasis = {
  shortTerm: number
  longTerm: number
  collectibleLongTerm: number
  includes: readonly ('federal' | 'niit')[]
  excludes: readonly 'state'[]
}

export const TAX_RATE_BASIS: TaxRateBasis = {
  shortTerm: SHORT_TERM_RATE,
  longTerm: LONG_TERM_RATE,
  collectibleLongTerm: COLLECTIBLE_LONG_TERM_RATE,
  includes: ['federal', 'niit'],
  excludes: ['state'],
}

/**
 * 0.238 → "23.8%", 0.37 → "37%". Trims a bare ".0" so whole-percent rates read cleanly.
 * Exported so every place that quotes a rate formats it identically rather than re-deriving the
 * same trim logic per call site.
 */
export function formatRatePercent(rate: number): string {
  return `${Number((rate * 100).toFixed(1))}%`
}

/**
 * A test asserting `RATE_DISCLOSURE` contains `'37%'` and
 * `'23.8%'` passes identically whether the string is templated from the rate constants or
 * hardcoded prose that happens to say the same thing — it cannot distinguish "derived" from
 * "coincidentally correct today". Exporting the builder as a function of its own arguments lets
 * a test drive it with values that appear nowhere else in the codebase (see
 * tax-invariants.test.ts), which a hardcoded string cannot satisfy by coincidence.
 */
export function buildRateDisclosure(shortTermRate: number, longTermRate: number, collectibleLongTermRate: number): string {
  return (
    `Estimated at top federal marginal rates including the ${formatRatePercent(NIIT_RATE)} net ` +
    `investment income tax — ${formatRatePercent(shortTermRate)} short-term, ` +
    `${formatRatePercent(longTermRate)} long-term (${formatRatePercent(collectibleLongTermRate)} on ` +
    'collectibles, including physically backed precious-metal ETFs). State tax is not modeled. ' +
    'Estimates only, not tax advice.'
  )
}

// Templated from the constants above, not restated as free text — changing SHORT_TERM_RATE or
// LONG_TERM_RATE previously would not have changed this copy, so the disclosure could silently
// lie about the rates actually applied.
export const RATE_DISCLOSURE = buildRateDisclosure(SHORT_TERM_RATE, LONG_TERM_RATE, COLLECTIBLE_LONG_TERM_RATE)

/**
 * The same basis as `RATE_DISCLOSURE`, worded for a client letter: US spelling and plain sentences.
 * Templated from the basis it is given, so the client's copy cannot drift from the rates applied.
 * `collectibles`: whether the letter's holdings include any; a reader who holds none is not told their rate.
 */
export function buildClientRateDisclosure(basis: TaxRateBasis, { collectibles }: { collectibles: boolean }): string {
  const niit = basis.includes.includes('niit') ? `, including the ${formatRatePercent(NIIT_RATE)} net investment income tax` : ''
  const state = basis.excludes.includes('state') ? ' State tax is not modeled.' : ''
  const collectibleRate = collectibles ? ` (${formatRatePercent(basis.collectibleLongTerm)} on collectibles, including physically backed precious-metal funds)` : ''
  return `These estimates use top federal rates${niit}: ${formatRatePercent(basis.shortTerm)} on short-term gains and ${formatRatePercent(basis.longTerm)} on long-term gains${collectibleRate}.${state} They are estimates, not tax advice.`
}

export function taxRateFor(holdingPeriod: TaxLot['holdingPeriod'], character: TaxCharacter = 'capital_asset'): number {
  if (holdingPeriod === 'short') return SHORT_TERM_RATE
  return character === 'collectible' ? COLLECTIBLE_LONG_TERM_RATE : LONG_TERM_RATE
}

/**
 * PRE-FLIGHT correction 1 · the harvest threshold (`TaxManagementPage.tsx`) compared each lot's
 * native-currency `gainLoss` directly against a bare `-1000`, applied identically across acc-041
 * (HKD), acc-042 (SGD), acc-043 (EUR) and acc-044 (CHF). HK$1,000 is about US$128 and CHF 1,000
 * about US$1,120, so the same literal meant wildly different real losses per account. The
 * threshold is in USD; convert the lot to USD before comparing. Exported so every caller imports this
 * constant rather than hardcoding `-1000` a third time.
 */
export const HARVEST_LOSS_THRESHOLD_USD = -1000 as const

export function isHarvestable(gainLoss: number, currency: CurrencyCode, rates: FXRateMap): boolean {
  return convertToBase(gainLoss, currency, rates) < HARVEST_LOSS_THRESHOLD_USD
}

type WashFacts = Pick<TaxLot, 'gainLoss' | 'quantity' | 'saleWash'>

/** The part of a loss lot's loss that falls on `shares` of it; 0 for a lot at a gain. */
function lossOnShares(lot: WashFacts, shares: number): number {
  if (lot.gainLoss >= 0 || lot.quantity <= 0) return 0
  return lot.gainLoss * Math.min(1, shares / lot.quantity)
}

/**
 * The loss a sale of this lot today realizes this year (negative), or 0. §1091 takes only the
 * loss on the shares a replacement was matched to (Treas. Reg. §1.1091-1(c)); the rest is
 * allowed. Every harvest total counts this figure, never the lot's whole loss.
 */
export function lossAllowedNow(lot: WashFacts): number {
  const { deferredShares, disallowedShares } = lot.saleWash
  return lossOnShares(lot, lot.quantity - deferredShares - disallowedShares)
}

/** The part of the loss §1091 moves into a taxable replacement's basis (§1091(d)): not realized now, recovered later. */
export function lossDeferred(lot: WashFacts): number {
  return lossOnShares(lot, lot.saleWash.deferredShares)
}

/** The part of the loss lost for good because the replacement was bought in an IRA, Roth or other tax-advantaged account (Rev. Rul. 2008-5). */
export function lossDisallowed(lot: WashFacts): number {
  return lossOnShares(lot, lot.saleWash.disallowedShares)
}
