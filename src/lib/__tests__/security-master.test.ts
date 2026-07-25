import { describe, it, expect } from 'vitest'
import { securityKind, concentrationLimitFor, SINGLE_NAME_LIMIT, FUND_LIMIT, CASH_LIMIT, type SecurityKind } from '@/lib/security-master'
import { allPositions } from '@/mocks/data/positions'

describe('securityKind', () => {
  it.each(['VTI', 'SPY', 'QQQ', 'AGG', 'BND', 'TLT', 'TIP', 'EFA', 'VWO', 'VXUS', 'BNDX', 'LQD', 'VCIT', 'GLD', 'VNQ', 'QAI', 'IBIT', 'ETHE', 'BXPE', 'VFIAX'])(
    '%s is a fund', (symbol) => {
      expect(securityKind(symbol, 'us_equity')).toBe('fund')
    },
  )

  it.each(['NVDA', 'AAPL', 'MSFT', 'INTC'])('%s is a single name', (symbol) => {
    expect(securityKind(symbol, 'us_equity')).toBe('single_name')
  })

  it('CASH is cash regardless of the symbol table', () => {
    expect(securityKind('CASH', 'cash')).toBe('cash')
  })

  it('treats an unknown symbol in a fund-only asset class as a fund', () => {
    expect(securityKind('ZZZZ', 'alternatives')).toBe('fund')
  })

  it('treats an unknown equity symbol as a single name — the conservative default', () => {
    expect(securityKind('ZZZZ', 'us_equity')).toBe('single_name')
  })
})

describe('concentrationLimitFor', () => {
  it('C23: applies 10% to single names, 35% to funds and 15% to cash', () => {
    expect(concentrationLimitFor('single_name')).toBe(SINGLE_NAME_LIMIT)
    expect(concentrationLimitFor('fund')).toBe(FUND_LIMIT)
    expect(concentrationLimitFor('cash')).toBe(CASH_LIMIT)
    expect(SINGLE_NAME_LIMIT).toBe(0.10)
    expect(FUND_LIMIT).toBe(0.35)
    expect(CASH_LIMIT).toBe(0.15)
  })
})

/**
 * Fix round 1 — ground truth for every symbol actually held in the fixtures, independent of
 * `FUND_SYMBOLS`/`FUND_ONLY_CLASSES`. The `it.each` tables above are hand-picked examples and
 * proved unable to catch a missing entry: the first pass of security-master.ts covered every
 * symbol they listed and still misclassified eight foreign-listed funds (acc-041/042/043/044)
 * that simply weren't in those lists. This table is derived from each security's real-world
 * identity — index fund / ETF / REIT / trust vs. individual issuer vs. direct crypto — not from
 * reading the implementation, so deleting an entry from FUND_SYMBOLS (or failing to add one for
 * new fixture data) makes this fail.
 */
const EXPECTED_KIND: Record<string, SecurityKind> = {
  // US-domiciled pooled vehicles
  VTI: 'fund', SPY: 'fund', QQQ: 'fund', EFA: 'fund', VWO: 'fund', VXUS: 'fund',
  AGG: 'fund', BND: 'fund', BNDX: 'fund', TLT: 'fund', TIP: 'fund', LQD: 'fund', VCIT: 'fund',
  GLD: 'fund', VNQ: 'fund', QAI: 'fund', IBIT: 'fund', ETHE: 'fund', BXPE: 'fund',
  // Foreign-listed pooled vehicles — the acc-041/042/043/044 gap this round closes
  '2800.HK': 'fund',   // Tracker Fund of Hong Kong (Hang Seng index ETF)
  'ES3.SI': 'fund',    // SPDR Straits Times Index ETF
  'CLR.SI': 'fund',    // Nikko AM Singapore STI ETF
  'MBH.SI': 'fund',    // ABF Singapore Bond Index Fund
  'CSBGU0.SW': 'fund', // iShares Core Euro Govt Bond ETF
  'CSBGC0.SW': 'fund', // iShares Core CHF Corp Bond ETF
  'IEAC.AS': 'fund',   // iShares Core EUR Corp Bond ETF
  'SRFCHA.SW': 'fund', // UBS ETF SBI Domestic Govt Bond
  'VWRL.AS': 'fund',   // Vanguard FTSE All-World ETF
  'A17U.SI': 'fund',   // CapitaLand Ascendas REIT (pooled vehicle, real_estate class)
  // US single names
  AAPL: 'single_name', MSFT: 'single_name', NVDA: 'single_name', INTC: 'single_name',
  // Foreign single names — individual issuers, not funds, despite being intl_equity
  '0005.HK': 'single_name',   // HSBC Holdings
  '0700.HK': 'single_name',   // Tencent Holdings
  '1299.HK': 'single_name',   // AIA Group
  '2388.HK': 'single_name',   // BOC Hong Kong
  '9988.HK': 'single_name',   // Alibaba Group
  'D05.SI': 'single_name',    // DBS Group Holdings
  'O39.SI': 'single_name',    // OCBC Bank
  'ASML.AS': 'single_name',   // ASML Holding NV
  'MC.PA': 'single_name',     // LVMH Moet Hennessy
  'NESN.SW': 'single_name',   // Nestle SA
  'NOVN.SW': 'single_name',   // Novartis AG
  'ROG.SW': 'single_name',    // Roche Holding AG
  'SIE.DE': 'single_name',    // Siemens AG
  // Direct crypto holdings — single-asset concentration, distinct from the wrapped IBIT/ETHE trusts
  BTC: 'single_name', ETH: 'single_name', SOL: 'single_name', AVAX: 'single_name',
  LINK: 'single_name', DOT: 'single_name', USDC: 'single_name',
  // Cash
  CASH: 'cash',
}

describe('C23 fix round 1: every real fixture symbol classifies correctly', () => {
  const distinctSymbols = new Map<string, string>()
  for (const p of allPositions) {
    distinctSymbols.set(p.symbol, p.assetClass)
  }

  it('the ground-truth table covers every symbol in the fixtures', () => {
    for (const symbol of distinctSymbols.keys()) {
      expect(EXPECTED_KIND, `no expected kind registered for fixture symbol ${symbol}`).toHaveProperty(symbol)
    }
  })

  it.each([...distinctSymbols.entries()])('%s (%s) classifies as expected', (symbol, assetClass) => {
    expect(securityKind(symbol, assetClass)).toBe(EXPECTED_KIND[symbol])
  })
})

describe('C23 fix round 1: no pooled vehicle in the international accounts reads as an IPS breach', () => {
  // acc-041 (HKD), acc-042 (SGD), acc-043 (EUR), acc-044 (CHF) are the only non-USD accounts in
  // the book — the same four Task 10's FX fix had to touch — and were the accounts silently
  // corrupted by the fund-symbol gap. None of their fund positions exceed the 35% fund limit, so
  // none should ever be flagged.
  const internationalFundPositions = allPositions.filter(
    (p) => ['acc-041', 'acc-042', 'acc-043', 'acc-044'].includes(p.accountId)
      && securityKind(p.symbol, p.assetClass) === 'fund',
  )

  it('has fund positions to check in all four accounts (sanity check on the fixture)', () => {
    expect(internationalFundPositions.length).toBeGreaterThanOrEqual(8)
  })

  it.each(internationalFundPositions.map((p) => ({ label: `${p.accountId} ${p.symbol} at weight ${p.weight}`, weight: p.weight })))(
    '$label is under the fund limit', ({ weight }) => {
      expect(weight).toBeLessThanOrEqual(FUND_LIMIT)
    },
  )
})
