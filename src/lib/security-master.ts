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
