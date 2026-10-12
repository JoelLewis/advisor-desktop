/**
 * C23 · diversification / investment-policy — a 10% single-*name* limit applied to broad index
 * ETFs made VTI (27.8%), SPY and AGG read as IPS breaches, which tells an advisor the tool does
 * not know what an ETF is. Single-issuer limits apply to individual securities; funds get a
 * separate, higher fund-level limit. NVDA at 13.9% in acc-011 is then the only breach in the
 * book — which is the genuine, and far more compelling, concentration story.
 *
 * Fix round 1: the first pass only listed US-domiciled tickers, so eight foreign-listed pooled
 * vehicles held in the non-USD accounts (acc-041 HKD, acc-042 SGD, acc-043 EUR, acc-044 CHF) fell
 * through to the single-name default and reintroduced C23 for a different set of tickers. Those
 * accounts are also the ones the FX fix (Task 10) touched — they are the only non-USD accounts in
 * the book, so anything written against a US-centric symbol list breaks there first. Note that
 * `intl_equity` also holds genuine individual foreign stocks (HSBC, Tencent, ASML, Nestle, ...),
 * so the fix is explicit symbols, not adding `intl_equity`/`fixed_income` to FUND_ONLY_CLASSES —
 * that would misclassify those single stocks as funds instead.
 */
import type { TaxCharacter } from './capital-gains'

export type SecurityKind = 'single_name' | 'fund' | 'cash'

/** Pooled vehicles held anywhere in the fixtures. */
const FUND_SYMBOLS = new Set([
  'VTI', 'SPY', 'QQQ', 'VOO', 'IVV', 'VXUS', 'VWO', 'EFA', 'IEFA',
  'AGG', 'BND', 'BNDX', 'TLT', 'TIP', 'LQD', 'VCIT', 'SCHZ', 'MUB',
  'GLD', 'SLV', 'VNQ', 'QAI', 'IBIT', 'ETHE', 'BXPE', 'SMH',
  'VFIAX', 'VTMGX', 'PRWCX', 'VWENX', 'PIMIX',
  // Foreign-listed pooled vehicles (acc-041 HKD, acc-042 SGD, acc-043 EUR, acc-044 CHF).
  '2800.HK',   // Tracker Fund of Hong Kong — Hang Seng index ETF
  'ES3.SI',    // SPDR Straits Times Index ETF
  'CLR.SI',    // Nikko AM Singapore STI ETF
  'MBH.SI',    // ABF Singapore Bond Index Fund
  'CSBGU0.SW', // iShares Core Euro Govt Bond ETF
  'CSBGC0.SW', // iShares Core CHF Corp Bond ETF
  'IEAC.AS',   // iShares Core EUR Corp Bond ETF
  'SRFCHA.SW', // UBS ETF SBI Domestic Govt Bond
  'VWRL.AS',   // Vanguard FTSE All-World ETF
])

/** Asset classes that cannot hold a single issuer position in this dataset. */
const FUND_ONLY_CLASSES = new Set(['alternatives', 'real_estate', 'commodities', 'private_equity'])

/**
 * Semi-liquid evergreen vehicles: redeemable only at periodic repurchase windows, each capped as
 * a share of NAV (BXPE: quarterly). A rebalance cannot sell them at market, so the engine leaves
 * them in place and lets the drift surface report the exposure.
 */
const PERIODIC_LIQUIDITY_SYMBOLS = new Set(['BXPE'])

export function isMarketTradable(symbol: string): boolean {
  return !PERIODIC_LIQUIDITY_SYMBOLS.has(symbol)
}

/**
 * The first day each security could be bought, for every security held in the book that launched
 * after 2022-03-25 — the earliest date the custodian's synthetic lot generator can produce
 * (`generateTaxLots` dates lots 3 to 47 whole months before 2026-02-25). Every other held security
 * launched before that date, so no lot can predate it.
 *
 * - IBIT: iShares Bitcoin Trust ETF began trading on 11 January 2024, the first day of US spot
 *   bitcoin ETFs.
 * - BXPE: Blackstone Private Equity Strategies Fund L.P. held its first close, its inception, on
 *   2 January 2024.
 */
const INCEPTION_DATES: ReadonlyMap<string, string> = new Map([
  ['IBIT', '2024-01-11'],
  ['BXPE', '2024-01-02'],
])

export function inceptionDate(symbol: string): string | undefined {
  return INCEPTION_DATES.get(symbol)
}

export const SINGLE_NAME_LIMIT = 0.10 as const
export const FUND_LIMIT = 0.35 as const
export const CASH_LIMIT = 0.15 as const

/**
 * The weight at or below which a holding is not worth a row in the concentration table.
 *
 * Task 10 review — this comparison used to sit on a hand-typed three-decimal weight, so a holding
 * at exactly 2% arrived as the literal `0.02`. It now sits on `marketValue / totalValue`, and
 * `(totalValue * 0.02) / totalValue !== 0.02` for **645 of 16,166 sampled account totals (3.99%)** —
 * e.g. $102,462 yields `0.020000000000000004`, which a bare `> 0.02` admits. Thirty accounts in the
 * book already hold a generated CASH line at exactly 2%; all thirty land on the exact side today,
 * but the next account with an unlucky total would push its cash into the table for no reason a
 * reader could see.
 *
 * The epsilon restores the pre-derivation behaviour — exactly 2% is *below* the bar — and makes it
 * hold regardless of how the division lands. It is a display threshold, not a money bound, so a
 * float-scale tolerance is the right shape here.
 *
 * Excluding cash by asset class instead was considered and rejected: `acc-042` (20.7%),
 * `acc-044` (22.3%) and `acc-046` (18.8%) hold genuinely breaching CASH lines against cash's own
 * 15% IPS limit, and this table's Limit and Status columns exist to show exactly that. No breach is
 * ever hidden by the 2% bar either way — the smallest limit any kind carries is 10%, and the
 * smallest breach in the book is 10.16%.
 */
const MATERIAL_WEIGHT = 0.02
const MATERIAL_WEIGHT_EPSILON = 1e-9

export function isMaterialWeight(weight: number): boolean {
  return weight > MATERIAL_WEIGHT + MATERIAL_WEIGHT_EPSILON
}

export function securityKind(symbol: string, assetClass: string): SecurityKind {
  if (assetClass === 'cash' || symbol === 'CASH') return 'cash'
  if (FUND_SYMBOLS.has(symbol)) return 'fund'
  if (FUND_ONLY_CLASSES.has(assetClass)) return 'fund'
  return 'single_name'
}

export function concentrationLimitFor(kind: SecurityKind): number {
  switch (kind) {
    case 'cash': return CASH_LIMIT
    case 'fund': return FUND_LIMIT
    case 'single_name': return SINGLE_NAME_LIMIT
  }
}

/**
 * §0.6 · grantor trusts that hold physical precious metal. A grantor trust's holders are treated
 * as owning its assets (§§671–677), so selling a share is selling metal, a collectible under
 * §408(m)(2): its long-term gain is collectibles gain, taxed at up to 28% (§1(h)(4)–(5)), not
 * 20%. Funds that hold futures or miners' shares are not collectibles and are not listed.
 */
const PHYSICAL_PRECIOUS_METAL_TRUSTS = new Set(['GLD', 'IAU', 'SLV', 'PPLT'])

export function taxCharacterOf(symbol: string): TaxCharacter {
  return PHYSICAL_PRECIOUS_METAL_TRUSTS.has(symbol) ? 'collectible' : 'capital_asset'
}

/**
 * Coins held directly, not through a fund or trust. §1091 disallows losses on "stock or
 * securities"; a directly held coin is property (Notice 2014-21), so selling one at a loss and
 * buying it straight back washes nothing. Exchange-traded crypto trusts (IBIT, ETHE) are not
 * listed: they stay subject, the conservative reading.
 */
export const SPOT_CRYPTO_SYMBOLS: ReadonlySet<string> = new Set([
  'BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOT', 'USDC', 'ADA', 'MATIC', 'UNI', 'ATOM',
])

/** Whether IRC §1091 reaches a loss on `symbol` — every security; not a directly held coin. */
export function isSubjectToWashSale(symbol: string): boolean {
  return !SPOT_CRYPTO_SYMBOLS.has(symbol)
}
