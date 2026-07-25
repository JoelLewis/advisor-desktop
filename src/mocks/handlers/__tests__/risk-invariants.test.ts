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
    expect(risk.sharpe).toBe(0.63)
    expect(risk.standardDeviation).toBe(0.0935)
    expect(risk.beta).toBe(0.64)
  })

  it('risk differs between a bond-heavy IRA and a crypto account', async () => {
    const thompsonIRA = await getRiskMetrics('acc-020')
    const crypto = await getRiskMetrics('acc-045')
    expect(thompsonIRA.standardDeviation).toBe(0.061)
    expect(crypto.standardDeviation).toBe(0.636)
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
})

describe('monte carlo', () => {
  it('C7: percentiles and histogram come from the same distribution', async () => {
    const { monteCarlo } = await getSensitivity('acc-001')
    expect(monteCarlo.expectedReturn).toBeCloseTo(0.0985, 4)
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
