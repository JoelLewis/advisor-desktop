import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { concentrationFor } from '@/mocks/handlers/pms'

const concentration = (id: string) => {
  const account = accounts.find((a) => a.id === id)
  if (!account) throw new Error(`no account ${id}`)
  return concentrationFor(account)
}

describe('concentration & compliance invariants', () => {
  it('positions are sorted by weight descending', () => {
    const data = concentration('acc-001')
    for (let i = 1; i < data.positions.length; i++) {
      expect(data.positions[i]!.weight).toBeLessThanOrEqual(data.positions[i - 1]!.weight)
    }
  })

  it('top10Weight === sum of top 10 position weights', () => {
    const data = concentration('acc-001')
    const top10 = data.positions.slice(0, 10)
    const expectedTop10Weight = top10.reduce((s, p) => s + p.weight, 0)
    expect(Math.abs(data.summary.top10Weight - expectedTop10Weight)).toBeLessThan(0.002)
  })

  it('breached === weight > limit for each position', () => {
    const data = concentration('acc-001')
    for (const pos of data.positions) {
      expect(pos.breached).toBe(pos.weight > pos.limit)
    }
  })

  it('breachCount matches count of breached positions', () => {
    const data = concentration('acc-001')
    const breachedCount = data.positions.filter((p) => p.breached).length
    expect(data.summary.breachCount).toBe(breachedCount)
  })

  it('totalPositions matches actual position count', () => {
    const data = concentration('acc-001')
    expect(data.summary.totalPositions).toBe(data.positions.length)
  })

  it('all positions have required fields', () => {
    const data = concentration('acc-001')
    for (const pos of data.positions) {
      expect(pos.symbol).toBeTruthy()
      expect(pos.name).toBeTruthy()
      expect(pos.assetClass).toBeTruthy()
      expect(pos.marketValue).toBeGreaterThan(0)
      expect(pos.weight).toBeGreaterThan(0)
      expect(pos.limit).toBeGreaterThan(0)
    }
  })

  it('C23: acc-001 has no breach — VTI at 27.8% is a fund, not a single issuer', () => {
    const data = concentration('acc-001')
    expect(data.summary.breachCount).toBe(0)
    const vti = data.positions.find((p) => p.symbol === 'VTI')!
    expect(vti.kind).toBe('fund')
    expect(vti.weight).toBeCloseTo(0.278, 3)
    expect(vti.limit).toBe(0.35)
    expect(vti.breached).toBe(false)
  })

  it('C23: acc-011 breaches on NVDA at 13.9% and nothing else', () => {
    const data = concentration('acc-011')
    const breaches = data.positions.filter((p) => p.breached)
    expect(breaches.map((b) => b.symbol)).toEqual(['NVDA'])
    expect(breaches[0]!.weight).toBeCloseTo(0.139, 3)
    expect(breaches[0]!.kind).toBe('single_name')
    expect(breaches[0]!.limit).toBe(0.10)
  })

  it('C22: HHI is on the 0-10,000 scale with an effective-N companion', () => {
    const data = concentration('acc-001')
    expect(data.summary.herfindahlIndex).toBeGreaterThan(100)
    expect(data.summary.effectiveN).toBeCloseTo(10_000 / data.summary.herfindahlIndex, 0)
  })

  // Fix round 1 — acc-041/042/043/044 are the only non-USD accounts in the book (the same four
  // Task 10's FX fix had to touch), and were the ones a US-centric FUND_SYMBOLS list silently
  // corrupted: their foreign-listed ETFs fell through to the single_name default and reintroduced
  // C23 for a different set of tickers. Before this round: acc-041 reported breaches on
  // ['0700.HK', '9988.HK', '0005.HK', '2800.HK'] (2800.HK, an index-tracking ETF, was a false
  // positive); acc-042 on ['D05.SI', 'O39.SI', 'CASH', 'ES3.SI', 'CLR.SI'] (ES3.SI, CLR.SI false
  // positives; MBH.SI was silently misclassified without crossing its own, much lower, limit);
  // acc-043 on ['SIE.DE', 'ASML.AS', 'MC.PA', 'CSBGU0.SW'] (CSBGU0.SW false positive); acc-044 on
  // ['NESN.SW', 'NOVN.SW', 'ROG.SW', 'CASH', 'CSBGC0.SW'] (CSBGC0.SW false positive). After this
  // round, every fund in these four accounts is classified `fund` at the 35% limit and none of
  // them breach — the remaining breaches are genuine: concentrated individual foreign stocks
  // (the same story as NVDA in acc-011) and, in acc-042/044, cash above its own 15% limit.
  it('C23 fix round 1: acc-041 (HKD) breaches only on individual stocks, not the Hang Seng tracker fund', () => {
    const data = concentration('acc-041')
    const breaches = data.positions.filter((p) => p.breached)
    expect(breaches.map((b) => b.symbol).sort()).toEqual(['0005.HK', '0700.HK', '9988.HK'].sort())
    for (const b of breaches) expect(b.kind).toBe('single_name')

    const tracker = data.positions.find((p) => p.symbol === '2800.HK')!
    expect(tracker.kind).toBe('fund')
    expect(tracker.limit).toBe(0.35)
    expect(tracker.breached).toBe(false)

    // Task 10 — 0.802, not the 0.801 the hand-typed three-decimal weights summed to. The
    // single names are 0700.HK 4,560,000 + 9988.HK 1,593,000 + 0005.HK 1,705,000 + 1299.HK
    // 1,092,000 + 2388.HK 1,078,000 = 10,028,000 of HKD 12,500,000 = 0.80224 -> 0.802.
    expect(data.summary.singleNameWeight).toBeCloseTo(0.802, 3)
  })

  it('C23 fix round 1: acc-042 (SGD) breaches only on individual stocks and cash, not the STI/bond funds or the REIT', () => {
    const data = concentration('acc-042')
    const breaches = data.positions.filter((p) => p.breached)
    expect(breaches.map((b) => b.symbol).sort()).toEqual(['CASH', 'D05.SI', 'O39.SI'].sort())
    expect(breaches.find((b) => b.symbol === 'CASH')!.kind).toBe('cash')
    expect(breaches.filter((b) => b.symbol !== 'CASH').every((b) => b.kind === 'single_name')).toBe(true)

    for (const symbol of ['ES3.SI', 'CLR.SI', 'MBH.SI', 'A17U.SI']) {
      const fund = data.positions.find((p) => p.symbol === symbol)!
      expect(fund.kind).toBe('fund')
      expect(fund.limit).toBe(0.35)
      expect(fund.breached).toBe(false)
    }

    // Task 10 — 0.303, not 0.304. D05.SI 477,600 + O39.SI 371,250 = 848,850 of SGD 2,800,000
    // = 0.303161 -> 0.303; the stored 0.171 + 0.133 rounded to 0.304.
    expect(data.summary.singleNameWeight).toBeCloseTo(0.303, 3)
  })

  it('C23 fix round 1: acc-043 (EUR) breaches only on individual stocks, not the govt/corp bond ETFs or the all-world fund', () => {
    const data = concentration('acc-043')
    const breaches = data.positions.filter((p) => p.breached)
    expect(breaches.map((b) => b.symbol).sort()).toEqual(['ASML.AS', 'MC.PA', 'SIE.DE'].sort())
    for (const b of breaches) expect(b.kind).toBe('single_name')

    for (const symbol of ['CSBGU0.SW', 'IEAC.AS', 'VWRL.AS']) {
      const fund = data.positions.find((p) => p.symbol === symbol)!
      expect(fund.kind).toBe('fund')
      expect(fund.limit).toBe(0.35)
      expect(fund.breached).toBe(false)
    }

    // Task 10 — 0.488, not 0.489. SIE.DE 648,900 + ASML.AS 552,400 + MC.PA 360,000 = 1,561,300
    // of EUR 3,200,000 = 0.487906 -> 0.488; the stored 0.203 + 0.173 + 0.113 rounded to 0.489.
    expect(data.summary.singleNameWeight).toBeCloseTo(0.488, 3)
  })

  it('C23 fix round 1: acc-044 (CHF) breaches only on individual stocks and cash, not the corp/govt bond ETFs', () => {
    const data = concentration('acc-044')
    const breaches = data.positions.filter((p) => p.breached)
    expect(breaches.map((b) => b.symbol).sort()).toEqual(['CASH', 'NESN.SW', 'NOVN.SW', 'ROG.SW'].sort())
    expect(breaches.find((b) => b.symbol === 'CASH')!.kind).toBe('cash')
    expect(breaches.filter((b) => b.symbol !== 'CASH').every((b) => b.kind === 'single_name')).toBe(true)

    for (const symbol of ['CSBGC0.SW', 'SRFCHA.SW']) {
      const fund = data.positions.find((p) => p.symbol === symbol)!
      expect(fund.kind).toBe('fund')
      expect(fund.limit).toBe(0.35)
      expect(fund.breached).toBe(false)
    }

    // Task 10 — 0.390, not 0.389. NESN.SW 246,250 + NOVN.SW 171,360 + ROG.SW 167,100 = 584,710
    // of CHF 1,500,000 = 0.389807 -> 0.390; the stored 0.164 + 0.114 + 0.111 rounded to 0.389.
    expect(data.summary.singleNameWeight).toBeCloseTo(0.390, 3)
  })

  it('C23 fix round 1: no account produces a breach on a pooled vehicle among the international funds', () => {
    for (const accountId of ['acc-041', 'acc-042', 'acc-043', 'acc-044']) {
      const data = concentration(accountId)
      const fundBreaches = data.positions.filter((p) => p.kind === 'fund' && p.breached)
      expect(fundBreaches, `${accountId} has unexpected fund breaches: ${fundBreaches.map((b) => b.symbol).join(', ')}`).toEqual([])
    }
  })
})
