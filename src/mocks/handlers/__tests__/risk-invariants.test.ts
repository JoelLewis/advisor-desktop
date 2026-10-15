import { describe, it, expect } from 'vitest'
import { parametricVaR } from '@/lib/risk-model'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { accounts } from '@/mocks/data/accounts'
import { performanceSeriesFor, periodReturnsFor, periodYears, riskProfileFor, stressScenariosFor } from '@/mocks/handlers/pms'

const account = (id: string) => {
  const found = accounts.find((a) => a.id === id)
  if (!found) throw new Error(`no account ${id}`)
  return found
}
const profile = (id: string) => riskProfileFor(account(id))
const var95 = (id: string) => {
  const p = profile(id)
  return Math.round(parametricVaR(p.value, p.vol))
}

describe('risk metrics are per account', () => {
  it('C5: VaR scales with the account — Taylor $100K vs Chen Trust $12M', () => {
    const taylor = var95('acc-040')
    const chen = var95('acc-006')
    // Phase 7a Task 5b — the grouped correlations (equity 0.85 with equity, not a flat 0.35) raise
    // σ: acc-040 0.0934 -> 0.1019, acc-006 0.0904 -> 0.1047, so VaR = value x 1.645 x σ x √(1/12)
    // moves 4,435 -> 4,839 and 515,140 -> 596,627. Phase 7a · C1: acc-040 now holds its own model's
    // lineup (Conservative Income, tilted), not the generic 58/35/5/2 mix, so its VaR falls to 3,053.
    // Phase 7a final: private equity correlates 0.75 with public equity (was 0.5), so acc-006's σ
    // rises 0.1047 -> 0.1069 and its VaR 596,627 -> 609,164; acc-040 holds neither gold nor PE.
    expect(taylor).toBe(3_053)
    expect(chen).toBe(609_164)
    expect(chen / taylor).toBeGreaterThan(100)
  })

  it('C5: VaR is a percent of value, one month at 95%', () => {
    // 1.645 x 0.0977 x √(1/12) = 0.0464 of value (0.0479 at 5b's σ of 0.1008, 0.0444 at the flat-0.35
    // σ of 0.0935). Phase 7a final: gold (3.9% of acc-001) correlates 0.05 with equity, not 0.5.
    expect(var95('acc-001') / profile('acc-001').value).toBeCloseTo(0.0464, 4)
    expect(var95('acc-001')).toBe(380_438)
  })

  it('C5: VaR never exceeds the account value', () => {
    for (const id of ['acc-001', 'acc-006', 'acc-011', 'acc-020', 'acc-040', 'acc-045']) {
      expect(var95(id) / profile(id).value).toBeLessThan(1)
    }
  })

  it('C4: acc-001 carries a σ of 9.77%, a beta of 0.61 and a one-year return of 10.22%', () => {
    // Phase 7a final: gold in its own group lowers σ 0.1008 -> 0.0977; beta is derived from the
    // correlations (ρ with US equity x σ / σ US), 0.61. The one-year return is the benchmark
    // table's own figure, so the risk numbers are quoted against the series the app shows.
    const p = profile('acc-001')
    expect(p.ret).toBe(periodReturnsFor(account('acc-001'), 1).portfolioReturn)
    expect(p.ret).toBeCloseTo(0.1022, 4)
    expect(p.vol).toBe(0.0977)
    expect(p.beta).toBe(0.61)
  })

  it('risk differs between a bond-heavy IRA and a crypto account', () => {
    const thompsonIRA = profile('acc-020')
    const crypto = profile('acc-045')
    // 0.0625 under the grouped correlations (0.061 at a flat 0.35): its equity sleeves now move
    // together at 0.85.
    expect(thompsonIRA.vol).toBe(0.0625)
    // 0.5892, not the 0.589 frozen here before Task 10 (itself 0.636 before Task 18, when
    // acc-045's positions summed to $393,630 against a $425,000 balance and `assetClassWeights`
    // normalized the gap away, modeling the account as 97.8% digital assets).
    // Task 10 derives the weights: digital_assets 385,130 / 425,000 = 0.906188235 and cash
    // 39,870 / 425,000 = 0.093811765, against the stored 0.905/0.999 = 0.9059059 and
    // 0.094/0.999 = 0.0940941. With s_digital 0.650, s_cash 0.005 and rho 0.35:
    //   var = 0.906188235^2 x 0.4225 + 0.093811765^2 x 0.000025
    //       + 2 x 0.906188235 x 0.093811765 x 0.65 x 0.005 x 0.35
    //       = 0.34694735 + 0.00000022 + 0.00019342 = 0.34714099,  sqrt = 0.58918669 -> 0.5892
    // The same arithmetic on the stored weights gives 0.34692519, sqrt 0.58900351 -> 0.589.
    // Phase 7a Task 5b: cash is uncorrelated with digital assets (rho 0, not 0.35), so the cross
    // term drops: var = 0.34694735 + 0.00000022 = 0.34694757, sqrt 0.58902255 -> 0.5890.
    expect(crypto.vol).toBe(0.589)
    expect(crypto.beta).toBeGreaterThan(thompsonIRA.beta * 3)
  })

  it('C6: the benchmark table reports active return and names its benchmark; TE is one number', () => {
    const acc001 = account('acc-001')
    for (const years of Object.values(periodYears())) {
      const row = periodReturnsFor(acc001, years)
      expect(row.activeReturn).toBeCloseTo(row.portfolioReturn - row.benchmarkReturn, 6)
      expect(row).not.toHaveProperty('alpha')
      expect(row).not.toHaveProperty('trackingError')
    }
    const p = profile('acc-001')
    expect(p.benchmarkName).toBe('Balanced Growth policy benchmark')
    // TE is computed from the account's own weights against the model's target weights. 0.0069
    // under Phase 7a Task 5b's grouped correlations (0.0127 at a flat 0.35): acc-001's active
    // weights are mostly an overweight in one equity class against underweights in the others,
    // and equity classes that move together at 0.85 largely offset one another. Phase 7a final: 0.0074,
    // since its gold overweight no longer offsets equity at 0.5.
    expect(p.te).toBeCloseTo(0.0074, 4)
  })
})

describe('stress scenarios reconcile to holdings', () => {
  it('C9: Σ position impact === portfolioImpact × account value', () => {
    const scenarios = stressScenariosFor(account('acc-001'))
    for (const s of scenarios) {
      const summed = s.positionImpacts.reduce((acc, p) => acc + p.impact, 0)
      const headline = s.portfolioImpact * s.positionImpacts.reduce((acc, p) => acc + p.currentValue, 0)
      expect(summed).toBeCloseTo(headline, 0)
    }
  })

  it('C8: core aggregate bonds rallied Sep-08 to Mar-09, so AGG impact is positive', () => {
    const scenarios = stressScenariosFor(account('acc-001'))
    const crisis = scenarios.find((s) => s.id === 'stress-001')!
    const agg = crisis.positionImpacts.find((p) => p.symbol === 'AGG')!
    expect(agg.impactPercent).toBeGreaterThan(0)
    expect(crisis.portfolioImpact).toBeCloseTo(-0.2774, 3)
  })

  it('C9: a crypto-only account is not shown VTI, AGG and GLD rows', () => {
    const scenarios = stressScenariosFor(account('acc-045'))
    const symbols = scenarios[0]!.positionImpacts.map((p) => p.symbol)
    expect(symbols).not.toContain('VTI')
    expect(symbols).not.toContain('AGG')
  })

  it('C5, C9: holds for every account in the book, not only the six worked examples', () => {
    for (const { id } of accounts) {
      const varPercent = var95(id) / profile(id).value
      expect(varPercent, id).toBeGreaterThan(0)
      expect(varPercent, id).toBeLessThan(1)
      for (const s of stressScenariosFor(account(id))) {
        const summed = s.positionImpacts.reduce((acc, p) => acc + p.impact, 0)
        const headline = s.portfolioImpact * s.positionImpacts.reduce((acc, p) => acc + p.currentValue, 0)
        expect(Math.abs(summed - headline), `${id}/${s.id}`).toBeLessThan(0.5)
        expect(s.portfolioImpact, `${id}/${s.id}`).toBeGreaterThan(-1)
      }
    }
  })
})

describe('the performance series the risk numbers are quoted against', () => {
  it('C34: is trailing — it ends at the frozen clock and never runs into the future', () => {
    const series = performanceSeriesFor(account('acc-001'))
    expect(series[series.length - 1]!.date).toBe(MOCK_TODAY_ISO)
    expect(series.every((p) => p.date <= MOCK_TODAY_ISO)).toBe(true)
    expect(series.every((p) => p.value > 0)).toBe(true)
  })

  // The chart's benchmark line and the benchmark table are both pure functions of the account's
  // model, so accounts sharing a model must show the identical line. Before this, the chart
  // compounded a hand-typed 0.92 multiple of the *portfolio's* return, which made the benchmark
  // account-specific and put the chart 0.0036/yr away from the table for acc-001.
  it('the chart benchmark and the table benchmark are the same model figure', () => {
    // acc-011 and acc-019 are both assigned mod-002 (acc-040 moved to Conservative Income in Phase 7a · C1).
    const a = performanceSeriesFor(account('acc-011'))
    const b = performanceSeriesFor(account('acc-019'))
    expect(a.map((p) => p.benchmark)).toEqual(b.map((p) => p.benchmark))

    const oneYear = (id: string) => periodReturnsFor(account(id), periodYears()['1y']!).benchmarkReturn
    expect(oneYear('acc-011')).toBe(oneYear('acc-019'))

    // Accounts on different models must not share it, or the assertion above proves nothing.
    const other = performanceSeriesFor(account('acc-020'))
    expect(other.map((p) => p.benchmark)).not.toEqual(a.map((p) => p.benchmark))
  })
})
