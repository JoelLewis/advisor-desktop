import { describe, it, expect } from 'vitest'
import {
  ASSET_CLASS_RISK, RISK_FREE_RATE, Z_95,
  assetClassWeights, portfolioBeta, portfolioVolatility, portfolioReturn1Y,
  trackingError, parametricVaR, sharpe, sortino, downsideDeviation, modelledMaxDrawdown,
} from '@/lib/risk-model'

// A 60/40-ish book: acc-001's actual asset-class mix.
const ACC_001 = [
  { assetClass: 'us_equity', weight: 0.470 },
  { assetClass: 'intl_equity', weight: 0.065 },
  { assetClass: 'emerging_markets', weight: 0.023 },
  { assetClass: 'fixed_income', weight: 0.280 },
  { assetClass: 'commodities', weight: 0.039 },
  { assetClass: 'real_estate', weight: 0.041 },
  { assetClass: 'cash', weight: 0.081 },
]

describe('assetClassWeights', () => {
  it('normalises so weights always sum to exactly 1', () => {
    // acc-045's fixture weights sum to 0.925 — D4.
    const w = assetClassWeights([
      { assetClass: 'digital_assets', weight: 0.700 },
      { assetClass: 'cash', weight: 0.225 },
    ])
    expect([...w.values()].reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12)
    expect(w.get('digital_assets')).toBeCloseTo(0.7 / 0.925, 12)
  })

  it('merges duplicate asset classes', () => {
    const w = assetClassWeights([
      { assetClass: 'us_equity', weight: 0.3 },
      { assetClass: 'us_equity', weight: 0.2 },
      { assetClass: 'cash', weight: 0.5 },
    ])
    expect(w.size).toBe(2)
    expect(w.get('us_equity')).toBeCloseTo(0.5, 12)
  })
})

describe('portfolio statistics', () => {
  const w = assetClassWeights(ACC_001)

  it('beta is the weighted average of asset-class betas', () => {
    expect(portfolioBeta(w)).toBeCloseTo(0.64, 2)
  })

  it('volatility accounts for imperfect correlation, so it is below the weighted average of vols', () => {
    const weightedAvgVol = [...w.entries()].reduce((s, [ac, x]) => s + x * ASSET_CLASS_RISK[ac]!.vol, 0)
    expect(portfolioVolatility(w)).toBeCloseTo(0.0935, 4)
    expect(portfolioVolatility(w)).toBeLessThan(weightedAvgVol)
  })

  it('a single-asset-class portfolio has exactly that class volatility', () => {
    const single = assetClassWeights([{ assetClass: 'us_equity', weight: 1 }])
    expect(portfolioVolatility(single)).toBeCloseTo(ASSET_CLASS_RISK.us_equity!.vol, 12)
  })

  it('trailing 1Y return is the weighted average of asset-class returns', () => {
    expect(portfolioReturn1Y(w)).toBeCloseTo(0.0985, 4)
  })
})

describe('parametricVaR', () => {
  it('C5: scales with portfolio value — a $100K IRA and a $12M trust cannot share a VaR', () => {
    const vol = 0.0935
    expect(parametricVaR(100_000, vol)).toBeCloseTo(4_440, 0)
    expect(parametricVaR(12_000_000, vol)).toBeCloseTo(532_805, 0)
    expect(parametricVaR(12_000_000, vol) / parametricVaR(100_000, vol)).toBeCloseTo(120, 6)
  })

  it('is z95 x monthly sigma x value at the default 1-month horizon', () => {
    expect(parametricVaR(1_000_000, 0.12))
      .toBeCloseTo(1_000_000 * Z_95 * 0.12 / Math.sqrt(12), 6)
  })

  it('scales with the square root of the horizon', () => {
    expect(parametricVaR(1_000_000, 0.12, 12) / parametricVaR(1_000_000, 0.12, 1))
      .toBeCloseTo(Math.sqrt(12), 9)
  })
})

describe('sharpe and sortino', () => {
  it('C4: the app reported 1.34 against its own 12.4% return and 11.8% sigma; the identity gives 0.71', () => {
    expect(sharpe(0.124, 0.118)).toBeCloseTo(0.7119, 4)
    expect(RISK_FREE_RATE).toBe(0.04)
  })

  it('sortino exceeds sharpe because downside deviation is below total volatility', () => {
    expect(downsideDeviation(0.0935)).toBeCloseTo(0.06545, 5)
    expect(sortino(0.0985, downsideDeviation(0.0935)))
      .toBeGreaterThan(sharpe(0.0985, 0.0935))
  })

  it('modelled max drawdown is negative and scales with volatility', () => {
    expect(modelledMaxDrawdown(0.118)).toBeCloseTo(-0.1416, 4)
    expect(modelledMaxDrawdown(0.636)).toBeLessThan(modelledMaxDrawdown(0.061))
  })
})

describe('trackingError', () => {
  it('is zero when the portfolio matches its benchmark exactly', () => {
    const w = assetClassWeights([{ assetClass: 'us_equity', weight: 0.6 }, { assetClass: 'fixed_income', weight: 0.4 }])
    expect(trackingError(w, w)).toBeCloseTo(0, 12)
  })

  it('C6: is one annualised statistic, and it grows with active weight', () => {
    const bench = assetClassWeights([{ assetClass: 'us_equity', weight: 0.6 }, { assetClass: 'fixed_income', weight: 0.4 }])
    const near = assetClassWeights([{ assetClass: 'us_equity', weight: 0.65 }, { assetClass: 'fixed_income', weight: 0.35 }])
    const far = assetClassWeights([{ assetClass: 'us_equity', weight: 0.95 }, { assetClass: 'fixed_income', weight: 0.05 }])
    expect(trackingError(far, bench)).toBeGreaterThan(trackingError(near, bench))
  })
})
