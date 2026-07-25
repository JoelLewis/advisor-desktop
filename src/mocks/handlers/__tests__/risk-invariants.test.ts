import { describe, it, expect } from 'vitest'
import {
  getRiskMetrics, getBenchmarkComparison, getStressScenarios, getSensitivity, getPerformance,
} from '@/services/pms'
import { RISK_FREE_RATE, Z_95 } from '@/lib/risk-model'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { accounts } from '@/mocks/data/accounts'

describe('risk metrics are per account', () => {
  it('C5: VaR scales with the account — Taylor $100K vs Chen Trust $12M', async () => {
    const taylor = await getRiskMetrics('acc-040')
    const chen = await getRiskMetrics('acc-006')
    expect(taylor.var95).toBe(4_435)
    expect(chen.var95).toBe(515_140)
    expect(chen.var95 / taylor.var95).toBeGreaterThan(100)
  })

  it('C5: VaR carries a horizon, a confidence level, a method and a percent-of-value', async () => {
    const risk = await getRiskMetrics('acc-001')
    expect(risk.var95Horizon).toBe('1 month')
    expect(risk.var95Confidence).toBe(0.95)
    expect(risk.var95Method).toBe('parametric')
    expect(risk.var95Percent).toBeCloseTo(0.0444, 4)
    expect(risk.var95).toBe(364_083)
  })

  it('C5: VaR never exceeds the account value', async () => {
    for (const id of ['acc-001', 'acc-006', 'acc-011', 'acc-020', 'acc-040', 'acc-045']) {
      const risk = await getRiskMetrics(id)
      expect(risk.var95Percent).toBeLessThan(1)
    }
  })

  it('C4: sharpe === (portfolio 1Y return − risk-free) ÷ σ, using the same series the app shows', async () => {
    const risk = await getRiskMetrics('acc-001')
    const bench = await getBenchmarkComparison('acc-001')
    const oneYear = bench.find((b) => b.period === '1y')!
    expect(risk.riskFreeRate).toBe(RISK_FREE_RATE)
    expect(risk.sharpe).toBeCloseTo(
      (oneYear.portfolioReturn - RISK_FREE_RATE) / risk.standardDeviation, 2,
    )
    // 0.66, not the 0.63 frozen here before Task 12: the account's return now includes the
    // manager edge inside each asset class that the attribution counts as selection and
    // interaction. Excluding it here while the attribution page counted it was the same figure
    // quoted two ways. The invariant above is the assertion that matters; this pins the value.
    expect(risk.sharpe).toBe(0.66)
    expect(risk.standardDeviation).toBe(0.0935)
    expect(risk.beta).toBe(0.64)
  })

  it('risk differs between a bond-heavy IRA and a crypto account', async () => {
    const thompsonIRA = await getRiskMetrics('acc-020')
    const crypto = await getRiskMetrics('acc-045')
    expect(thompsonIRA.standardDeviation).toBe(0.061)
    // 0.589, not the 0.636 frozen here before Task 18. acc-045's positions summed to $393,630
    // against a $425,000 balance (D4) and its weights to 0.925; `assetClassWeights` normalised
    // that gap away, so the account was modelled as 97.8% digital assets. The missing $31,370 is
    // cash, which makes the real mix 90.5% digital assets and 9.4% cash and lowers sigma.
    expect(crypto.standardDeviation).toBe(0.589)
    expect(crypto.beta).toBeGreaterThan(thompsonIRA.beta * 3)
  })

  it('C6: the benchmark table reports active return and names its benchmark; TE is one number', async () => {
    const bench = await getBenchmarkComparison('acc-001')
    const risk = await getRiskMetrics('acc-001')
    for (const row of bench) {
      expect(row.activeReturn).toBeCloseTo(row.portfolioReturn - row.benchmarkReturn, 6)
      expect(row).not.toHaveProperty('alpha')
      expect(row).not.toHaveProperty('trackingError')
    }
    expect(risk.benchmark).toBe('S&P 500 / Agg 60/40')
    expect(risk.trackingError).toBeCloseTo(0.0126, 4)
  })
})

describe('stress scenarios reconcile to holdings', () => {
  it('C9: Σ position impact === portfolioImpact × account value', async () => {
    const scenarios = await getStressScenarios('acc-001')
    for (const s of scenarios) {
      const summed = s.positionImpacts.reduce((acc, p) => acc + p.impact, 0)
      const headline = s.portfolioImpact * s.positionImpacts.reduce((acc, p) => acc + p.currentValue, 0)
      expect(summed).toBeCloseTo(headline, 0)
    }
  })

  it('C8: core aggregate bonds rallied Sep-08 to Mar-09, so AGG impact is positive', async () => {
    const scenarios = await getStressScenarios('acc-001')
    const crisis = scenarios.find((s) => s.id === 'stress-001')!
    const agg = crisis.positionImpacts.find((p) => p.symbol === 'AGG')!
    expect(agg.impactPercent).toBeGreaterThan(0)
    expect(crisis.portfolioImpact).toBeCloseTo(-0.2774, 3)
  })

  it('C9: a crypto-only account is not shown VTI, AGG and GLD rows', async () => {
    const scenarios = await getStressScenarios('acc-045')
    const symbols = scenarios[0]!.positionImpacts.map((p) => p.symbol)
    expect(symbols).not.toContain('VTI')
    expect(symbols).not.toContain('AGG')
  })

  it('C5, C9: holds for every account in the book, not only the six worked examples', async () => {
    for (const account of accounts) {
      const risk = await getRiskMetrics(account.id)
      expect(risk.var95Percent, account.id).toBeGreaterThan(0)
      expect(risk.var95Percent, account.id).toBeLessThan(1)
      for (const s of await getStressScenarios(account.id)) {
        const summed = s.positionImpacts.reduce((acc, p) => acc + p.impact, 0)
        const headline = s.portfolioImpact * s.positionImpacts.reduce((acc, p) => acc + p.currentValue, 0)
        expect(Math.abs(summed - headline), `${account.id}/${s.id}`).toBeLessThan(0.5)
        expect(s.portfolioImpact, `${account.id}/${s.id}`).toBeGreaterThan(-1)
      }
    }
  })
})

describe('the performance series the risk numbers are quoted against', () => {
  it('C34: is trailing — it ends at the frozen clock and never runs into the future', async () => {
    const series = await getPerformance('acc-001')
    expect(series[series.length - 1]!.date).toBe(MOCK_TODAY_ISO)
    expect(series.every((p) => p.date <= MOCK_TODAY_ISO)).toBe(true)
    expect(series.every((p) => p.value > 0)).toBe(true)
  })

  // The chart's benchmark line and the benchmark table are both pure functions of the account's
  // model, so accounts sharing a model must show the identical line. Before this, the chart
  // compounded a hand-typed 0.92 multiple of the *portfolio's* return, which made the benchmark
  // account-specific and put the chart 0.0036/yr away from the table for acc-001.
  it('the chart benchmark and the table benchmark are the same model figure', async () => {
    // acc-011 and acc-040 are both assigned mod-002.
    const [a, b] = await Promise.all([getPerformance('acc-011'), getPerformance('acc-040')])
    expect(a.map((p) => p.benchmark)).toEqual(b.map((p) => p.benchmark))

    const [benchA, benchB] = await Promise.all([
      getBenchmarkComparison('acc-011'), getBenchmarkComparison('acc-040'),
    ])
    const oneYear = (rows: Awaited<ReturnType<typeof getBenchmarkComparison>>) =>
      rows.find((r) => r.period === '1y')!.benchmarkReturn
    expect(oneYear(benchA)).toBe(oneYear(benchB))

    // Accounts on different models must not share it, or the assertion above proves nothing.
    const other = await getPerformance('acc-020')
    expect(other.map((p) => p.benchmark)).not.toEqual(a.map((p) => p.benchmark))
  })
})

describe('the modelled return distribution', () => {
  it('never shows a projected account value below zero', async () => {
    for (const id of ['acc-001', 'acc-020', 'acc-045']) {
      const { monteCarlo } = await getSensitivity(id)
      for (const p of monteCarlo.percentiles) {
        expect(p.value, `${id} p${p.percentile}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  // Task 18 note: acc-045 used to force the percentile floor to bite (sigma 0.636, mu 0.4041 gave
  // a 1st percentile of -0.0755 of value). Correcting D4 — the account's positions summed to
  // $393,630 against a $425,000 balance, and the missing $31,370 is cash — dropped sigma to 0.589,
  // just under the 0.596 at which `1 + mu - 2.3263 * sigma` turns negative. No fixture account
  // reaches the floor any more, so this asserts the invariant across the whole book rather than
  // the single account that happened to breach it, plus how close the sharpest account now comes.
  it('never projects a percentile below zero, on any account in the book', async () => {
    for (const account of accounts) {
      const { monteCarlo } = await getSensitivity(account.id)
      for (const p of monteCarlo.percentiles) {
        expect(p.value, `${account.id} p${p.percentile}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('acc-045 is the account that comes closest to the floor', async () => {
    const { monteCarlo } = await getSensitivity('acc-045')
    expect(monteCarlo.volatility).toBe(0.589)
    const p1 = monteCarlo.percentiles.find((p) => p.percentile === 1)!
    // 1 + 0.3868 - 0.589 * 2.3263 = 0.0166 of a $425,000 base: a 98.3% loss, positive by a hair.
    expect(p1.value / monteCarlo.baseValue).toBeCloseTo(0.0166, 4)
    expect(monteCarlo.percentiles.find((p) => p.percentile === 5)!.value).toBeGreaterThan(p1.value)
  })

  it('never shows a return bucket below total loss', async () => {
    for (const id of ['acc-001', 'acc-020', 'acc-045']) {
      const { monteCarlo } = await getSensitivity(id)
      for (const b of monteCarlo.histogram) {
        expect(b.returnBucket, `${id} bucket`).toBeGreaterThanOrEqual(-1)
      }
    }
  })

  // acc-045's raw domain is mu - 3*sigma = 0.3868 - 1.767 = -1.3802, i.e. a -138% return. The
  // domain starts at total loss instead; the upper end is untouched, and the bars are still the
  // raw density, so the truncated mass is dropped rather than redistributed. Unlike the percentile
  // floor above, this clamp still bites after Task 18's D4 correction.
  //
  // mu is 0.3868 rather than the 0.4139 frozen here before Task 18 (itself 0.4041 before Task 12,
  // which added the manager edge inside each asset class). The move is the same D4 correction: the
  // account's real 9.4% cash weight had been normalised away. Only the constants moved.
  it('bounds the domain at total loss without reshaping the density', async () => {
    const { monteCarlo } = await getSensitivity('acc-045')
    const buckets = monteCarlo.histogram.map((b) => b.returnBucket)
    expect(buckets[0]).toBe(-1)
    expect(buckets[buckets.length - 1]).toBeCloseTo(0.3868 + 3 * 0.589, 3)
    // A lower-sigma account is unaffected — the clamp only bites where the domain runs past -100%.
    const calm = await getSensitivity('acc-001')
    expect(calm.monteCarlo.histogram[0]!.returnBucket).toBeCloseTo(0.1021 - 3 * 0.0935, 4)
  })
})

describe('monte carlo', () => {
  it('C7: percentiles and histogram come from the same distribution', async () => {
    const { monteCarlo } = await getSensitivity('acc-001')
    // 0.1021, not the 0.0985 frozen here before Task 12 — see SELECTION_EDGE in pms.ts. The
    // curve's mu is the account's own one-year return, and that return now includes the manager
    // edge the attribution attributes to selection and interaction.
    expect(monteCarlo.expectedReturn).toBeCloseTo(0.1021, 4)
    expect(monteCarlo.volatility).toBeCloseTo(0.0935, 4)
    // p5 = exp of (mu + z5*sigma) applied to the account value; recover sigma from p5 and p95
    const p5 = monteCarlo.percentiles.find((p) => p.percentile === 5)!.value
    const p95 = monteCarlo.percentiles.find((p) => p.percentile === 95)!.value
    const impliedSigma = ((p95 - p5) / (2 * Z_95)) / monteCarlo.baseValue
    expect(impliedSigma).toBeCloseTo(monteCarlo.volatility, 3)
  })

  it('C7: does not claim 10,000 simulations for a closed-form curve', async () => {
    const { monteCarlo } = await getSensitivity('acc-001')
    // "normal" names the delta-normal form the handler actually implements. See the comment on
    // the `method` field in pms.ts before changing this string.
    expect(monteCarlo.method).toBe('closed-form normal')
    expect(monteCarlo).not.toHaveProperty('simulations')
  })
})
