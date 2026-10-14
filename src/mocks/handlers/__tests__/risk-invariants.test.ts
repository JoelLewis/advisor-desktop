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
    // Phase 7a Task 5b — the grouped correlations (equity 0.85 with equity, not a flat 0.35) raise
    // σ: acc-040 0.0934 -> 0.1019, acc-006 0.0904 -> 0.1047, so VaR = value x 1.645 x σ x √(1/12)
    // moves 4,435 -> 4,839 and 515,140 -> 596,627. Phase 7a · C1: acc-040 now holds its own model's
    // lineup (Conservative Income, tilted), not the generic 58/35/5/2 mix, so its VaR falls to 3,053.
    // Phase 7a final: private equity correlates 0.75 with public equity (was 0.5), so acc-006's σ
    // rises 0.1047 -> 0.1069 and its VaR 596,627 -> 609,164; acc-040 holds neither gold nor PE.
    expect(taylor.var95).toBe(3_053)
    expect(chen.var95).toBe(609_164)
    expect(chen.var95 / taylor.var95).toBeGreaterThan(100)
  })

  it('C5: VaR carries a horizon, a confidence level, a method and a percent-of-value', async () => {
    const risk = await getRiskMetrics('acc-001')
    expect(risk.var95Horizon).toBe('1 month')
    expect(risk.var95Confidence).toBe(0.95)
    expect(risk.var95Method).toBe('parametric')
    // 1.645 x 0.0977 x √(1/12) = 0.0464 of value (0.0479 at 5b's σ of 0.1008, 0.0444 at the flat-0.35
    // σ of 0.0935). Phase 7a final: gold (3.9% of acc-001) correlates 0.05 with equity, not 0.5.
    expect(risk.var95Percent).toBeCloseTo(0.0464, 4)
    expect(risk.var95).toBe(380_438)
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
    // 0.67, not the 0.66 frozen here before Task 10 (itself 0.63 before Task 12, which added the
    // manager edge inside each asset class that the attribution counts as selection and
    // interaction). Task 10 derives every position weight from `marketValue / totalValue` instead
    // of reading a hand-typed three-decimal figure. acc-001's stored weights summed to 0.999, so
    // `assetClassWeights` renormalised by 1/0.999 and shifted every class: us_equity 0.470470 ->
    // 0.470585 (3,858,800 / 8,200,000), cash 0.081081 -> 0.080509 (660,170 / 8,200,000). Sw.rp
    // rises from 0.10210209 to 0.10214623 — 0.44 bp of a percentage point — which carries the
    // reported 1Y return across the 0.10215 four-decimal boundary from 0.1021 to 0.1022. Then
    // (0.1022 - 0.04) / 0.0935 = 0.665241 -> 0.67. Sigma is unmoved: 0.09353998 -> 0.0935.
    // Phase 7a Task 5b: the grouped correlations move σ 0.0935 -> 0.1008, so
    // (0.1022 - 0.04) / 0.1008 = 0.617 -> 0.62. Beta is unmoved (it is linear in the weights).
    // Phase 7a final: gold in its own group lowers σ 0.1008 -> 0.0977, so (0.1022 - 0.04) / 0.0977
    // = 0.637 -> 0.64; beta is now derived from the correlations (ρ with US equity x σ / σ US), 0.61.
    // The invariant above is the assertion that matters; this pins the value.
    expect(risk.sharpe).toBe(0.64)
    expect(risk.standardDeviation).toBe(0.0977)
    expect(risk.beta).toBe(0.61)
  })

  it('risk differs between a bond-heavy IRA and a crypto account', async () => {
    const thompsonIRA = await getRiskMetrics('acc-020')
    const crypto = await getRiskMetrics('acc-045')
    // 0.0625 under the grouped correlations (0.061 at a flat 0.35): its equity sleeves now move
    // together at 0.85.
    expect(thompsonIRA.standardDeviation).toBe(0.0625)
    // 0.5892, not the 0.589 frozen here before Task 10 (itself 0.636 before Task 18, when
    // acc-045's positions summed to $393,630 against a $425,000 balance and `assetClassWeights`
    // normalised the gap away, modelling the account as 97.8% digital assets).
    // Task 10 derives the weights: digital_assets 385,130 / 425,000 = 0.906188235 and cash
    // 39,870 / 425,000 = 0.093811765, against the stored 0.905/0.999 = 0.9059059 and
    // 0.094/0.999 = 0.0940941. With s_digital 0.650, s_cash 0.005 and rho 0.35:
    //   var = 0.906188235^2 x 0.4225 + 0.093811765^2 x 0.000025
    //       + 2 x 0.906188235 x 0.093811765 x 0.65 x 0.005 x 0.35
    //       = 0.34694735 + 0.00000022 + 0.00019342 = 0.34714099,  sqrt = 0.58918669 -> 0.5892
    // The same arithmetic on the stored weights gives 0.34692519, sqrt 0.58900351 -> 0.589.
    // Phase 7a Task 5b: cash is uncorrelated with digital assets (rho 0, not 0.35), so the cross
    // term drops: var = 0.34694735 + 0.00000022 = 0.34694757, sqrt 0.58902255 -> 0.5890.
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
    expect(risk.benchmark).toBe('Balanced Growth policy benchmark')
    // TE is computed from the account's own weights against the model's target weights. 0.0069
    // under Phase 7a Task 5b's grouped correlations (0.0127 at a flat 0.35): acc-001's active
    // weights are mostly an overweight in one equity class against underweights in the others,
    // and equity classes that move together at 0.85 largely offset one another. Phase 7a final: 0.0074,
    // since its gold overweight no longer offsets equity at 0.5.
    expect(risk.trackingError).toBeCloseTo(0.0074, 4)
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
    // acc-011 and acc-019 are both assigned mod-002 (acc-040 moved to Conservative Income in Phase 7a · C1).
    const [a, b] = await Promise.all([getPerformance('acc-011'), getPerformance('acc-019')])
    expect(a.map((p) => p.benchmark)).toEqual(b.map((p) => p.benchmark))

    const [benchA, benchB] = await Promise.all([
      getBenchmarkComparison('acc-011'), getBenchmarkComparison('acc-019'),
    ])
    const oneYear = (rows: Awaited<ReturnType<typeof getBenchmarkComparison>>) =>
      rows.find((r) => r.period === '1y')!.benchmarkReturn
    expect(oneYear(benchA)).toBe(oneYear(benchB))

    // Accounts on different models must not share it, or the assertion above proves nothing.
    const other = await getPerformance('acc-020')
    expect(other.map((p) => p.benchmark)).not.toEqual(a.map((p) => p.benchmark))
  })
})

describe('the modeled return distribution', () => {
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
  // $393,630 against a $425,000 balance, and the missing $31,370 is cash — dropped sigma to 0.589
  // (0.5892 after Task 10 derived the weights), just under the 0.596 at which
  // `1 + mu - 2.3263 * sigma` turns negative. No fixture account
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
    // Task 10 — 0.5892/0.3869 from the derived weights (digital_assets 385,130 / 425,000 =
    // 0.906188235, cash 39,870 / 425,000 = 0.093811765), where the stored three-decimal weights
    // renormalised to 0.9059059 / 0.0940941 and gave 0.589/0.3868. mu = 0.906188235 x 0.422 +
    // 0.093811765 x 0.048 = 0.38241143 + 0.00450296 = 0.38691440 -> 0.3869.
    // Phase 7a Task 5b: σ 0.5890, cash now uncorrelated with digital assets (see above).
    expect(monteCarlo.volatility).toBe(0.589)
    const p1 = monteCarlo.percentiles.find((p) => p.percentile === 1)!
    // 1 + 0.3869 - 0.5890 * 2.3263 = 0.0167 of a $425,000 base: a 98.3% loss, positive by a hair.
    expect(p1.value / monteCarlo.baseValue).toBeCloseTo(0.0167, 4)
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
  // mu is 0.3869 rather than the 0.3868 frozen here before Task 10 (itself 0.4139 before Task 18
  // and 0.4041 before Task 12, which added the manager edge inside each asset class). Task 10's
  // move is the derived weight: 0.906188235 x 0.422 + 0.093811765 x 0.048 = 0.38691440 against
  // the stored-weight 0.9059059 x 0.422 + 0.0940941 x 0.048 = 0.38680881. Only the constants
  // moved. acc-001's mu moves 0.1021 -> 0.1022 for the same reason.
  it('bounds the domain at total loss without reshaping the density', async () => {
    const { monteCarlo } = await getSensitivity('acc-045')
    const buckets = monteCarlo.histogram.map((b) => b.returnBucket)
    expect(buckets[0]).toBe(-1)
    // 0.3869 + 3 x 0.5890 = 0.3869 + 1.7670 = 2.1539
    expect(buckets[buckets.length - 1]).toBeCloseTo(0.3869 + 3 * 0.589, 3)
    // A lower-sigma account is unaffected — the clamp only bites where the domain runs past -100%.
    const calm = await getSensitivity('acc-001')
    // 0.1022 - 3 x 0.0977 = 0.1022 - 0.2931 = -0.1909 (Phase 7a final σ; -0.2002 at 5b's 0.1008)
    expect(calm.monteCarlo.histogram[0]!.returnBucket).toBeCloseTo(0.1022 - 3 * 0.0977, 4)
  })
})

describe('monte carlo', () => {
  it('C7: percentiles and histogram come from the same distribution', async () => {
    const { monteCarlo } = await getSensitivity('acc-001')
    // 0.1022, not the 0.1021 frozen here before Task 10 (itself 0.0985 before Task 12 — see
    // SELECTION_EDGE in pms.ts). The curve's mu is the account's own one-year return; Task 10
    // derives the weights it is built from, moving Sw.rp from 0.10210209 to 0.10214623.
    expect(monteCarlo.expectedReturn).toBeCloseTo(0.1022, 4)
    expect(monteCarlo.volatility).toBeCloseTo(0.0977, 4)
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
