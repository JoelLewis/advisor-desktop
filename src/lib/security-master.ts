/**
 * A 10% single-*name* limit applied to broad index
 * ETFs made VTI (27.8%), SPY and AGG read as IPS breaches, which tells an advisor the tool does
 * not know what an ETF is. Single-issuer limits apply to individual securities; funds get a
 * separate, higher fund-level limit. NVDA at 13.9% in acc-011 is then the only breach in the
 * book — which is the genuine, and far more compelling, concentration story.
 *
 * The first pass only listed US-domiciled tickers, so eight foreign-listed pooled
 * vehicles held in the non-USD accounts (acc-041 HKD, acc-042 SGD, acc-043 EUR, acc-044 CHF) fell
 * through to the single-name default and reintroduced the false breaches for a different set of tickers.
 * Those accounts are the only non-USD accounts in
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
 * Grantor trusts that hold physical precious metal. A grantor trust's holders are treated
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
