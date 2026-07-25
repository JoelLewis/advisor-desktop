import { describe, it, expect } from 'vitest'
import { getConcentration } from '@/services/pms'

describe('concentration & compliance invariants', () => {
  it('positions are sorted by weight descending', async () => {
    const data = await getConcentration('acc-001')
    for (let i = 1; i < data.positions.length; i++) {
      expect(data.positions[i]!.weight).toBeLessThanOrEqual(data.positions[i - 1]!.weight)
    }
  })

  it('top10Weight === sum of top 10 position weights', async () => {
    const data = await getConcentration('acc-001')
    const top10 = data.positions.slice(0, 10)
    const expectedTop10Weight = top10.reduce((s, p) => s + p.weight, 0)
    expect(Math.abs(data.summary.top10Weight - expectedTop10Weight)).toBeLessThan(0.002)
  })

  it('breached === weight > limit for each position', async () => {
    const data = await getConcentration('acc-001')
    for (const pos of data.positions) {
      expect(pos.breached).toBe(pos.weight > pos.limit)
    }
  })

  it('breachCount matches count of breached positions', async () => {
    const data = await getConcentration('acc-001')
    const breachedCount = data.positions.filter((p) => p.breached).length
    expect(data.summary.breachCount).toBe(breachedCount)
  })

  it('totalPositions matches actual position count', async () => {
    const data = await getConcentration('acc-001')
    expect(data.summary.totalPositions).toBe(data.positions.length)
  })

  it('all positions have required fields', async () => {
    const data = await getConcentration('acc-001')
    for (const pos of data.positions) {
      expect(pos.symbol).toBeTruthy()
      expect(pos.name).toBeTruthy()
      expect(pos.assetClass).toBeTruthy()
      expect(pos.marketValue).toBeGreaterThan(0)
      expect(pos.weight).toBeGreaterThan(0)
      expect(pos.limit).toBeGreaterThan(0)
    }
  })

  it('C23: acc-001 has no breach — VTI at 27.8% is a fund, not a single issuer', async () => {
    const data = await getConcentration('acc-001')
    expect(data.summary.breachCount).toBe(0)
    const vti = data.positions.find((p) => p.symbol === 'VTI')!
    expect(vti.kind).toBe('fund')
    expect(vti.weight).toBeCloseTo(0.278, 3)
    expect(vti.limit).toBe(0.35)
    expect(vti.breached).toBe(false)
  })

  it('C23: acc-011 breaches on NVDA at 13.9% and nothing else', async () => {
    const data = await getConcentration('acc-011')
    const breaches = data.positions.filter((p) => p.breached)
    expect(breaches.map((b) => b.symbol)).toEqual(['NVDA'])
    expect(breaches[0]!.weight).toBeCloseTo(0.139, 3)
    expect(breaches[0]!.kind).toBe('single_name')
    expect(breaches[0]!.limit).toBe(0.10)
  })

  it('C22: HHI is on the 0-10,000 scale with an effective-N companion', async () => {
    const data = await getConcentration('acc-001')
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
  it('C23 fix round 1: acc-041 (HKD) breaches only on individual stocks, not the Hang Seng tracker fund', async () => {
    const data = await getConcentration('acc-041')
    const breaches = data.positions.filter((p) => p.breached)
    expect(breaches.map((b) => b.symbol).sort()).toEqual(['0005.HK', '0700.HK', '9988.HK'].sort())
    for (const b of breaches) expect(b.kind).toBe('single_name')

    const tracker = data.positions.find((p) => p.symbol === '2800.HK')!
    expect(tracker.kind).toBe('fund')
    expect(tracker.limit).toBe(0.35)
    expect(tracker.breached).toBe(false)

    expect(data.summary.singleNameWeight).toBeCloseTo(0.801, 3)
  })

  it('C23 fix round 1: acc-042 (SGD) breaches only on individual stocks and cash, not the STI/bond funds or the REIT', async () => {
    const data = await getConcentration('acc-042')
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

    expect(data.summary.singleNameWeight).toBeCloseTo(0.304, 3)
  })

  it('C23 fix round 1: acc-043 (EUR) breaches only on individual stocks, not the govt/corp bond ETFs or the all-world fund', async () => {
    const data = await getConcentration('acc-043')
    const breaches = data.positions.filter((p) => p.breached)
    expect(breaches.map((b) => b.symbol).sort()).toEqual(['ASML.AS', 'MC.PA', 'SIE.DE'].sort())
    for (const b of breaches) expect(b.kind).toBe('single_name')

    for (const symbol of ['CSBGU0.SW', 'IEAC.AS', 'VWRL.AS']) {
      const fund = data.positions.find((p) => p.symbol === symbol)!
      expect(fund.kind).toBe('fund')
      expect(fund.limit).toBe(0.35)
      expect(fund.breached).toBe(false)
    }

    expect(data.summary.singleNameWeight).toBeCloseTo(0.489, 3)
  })

  it('C23 fix round 1: acc-044 (CHF) breaches only on individual stocks and cash, not the corp/govt bond ETFs', async () => {
    const data = await getConcentration('acc-044')
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

    expect(data.summary.singleNameWeight).toBeCloseTo(0.389, 3)
  })

  it('C23 fix round 1: no account produces a breach on a pooled vehicle among the international funds', async () => {
    for (const accountId of ['acc-041', 'acc-042', 'acc-043', 'acc-044']) {
      const data = await getConcentration(accountId)
      const fundBreaches = data.positions.filter((p) => p.kind === 'fund' && p.breached)
      expect(fundBreaches, `${accountId} has unexpected fund breaches: ${fundBreaches.map((b) => b.symbol).join(', ')}`).toEqual([])
    }
  })
})
