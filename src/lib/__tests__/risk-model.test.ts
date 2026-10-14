import { describe, it, expect } from 'vitest'
import {
  ASSET_CLASS_RISK, CORRELATION_GROUP, RISK_FREE_RATE, Z_95,
  assetClassCorrelation, assetClassWeights, portfolioBeta, portfolioVolatility, portfolioReturn1Y,
  trackingError, parametricVaR, sharpe, sortino, downsideDeviation, modeledMaxDrawdown, assetClassBeta,
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

// acc-006's actual asset-class mix — an $8-figure trust, chosen because the drift from
// skipping the rounding step is largest in dollar terms at this scale.
const ACC_006 = [
  { assetClass: 'us_equity', weight: 0.344 },
  { assetClass: 'intl_equity', weight: 0.142 },
  { assetClass: 'emerging_markets', weight: 0.052 },
  { assetClass: 'fixed_income', weight: 0.197 },
  { assetClass: 'private_equity', weight: 0.045 },
  { assetClass: 'alternatives', weight: 0.088 },
  { assetClass: 'real_estate', weight: 0.048 },
  { assetClass: 'cash', weight: 0.084 },
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

  it('beta is the weighted average of asset-class betas, each derived from ρ and σ', () => {
    // Phase 7a final: βᵢ = ρ(i, US equity) σᵢ / σ_US, so gold (0.05) and real estate (0.565) no
    // longer carry hand-set 0.35 and 0.80; acc-001's mix reads 0.61, not 0.64.
    expect(portfolioBeta(w)).toBeCloseTo(0.61, 2)
    expect(portfolioBeta(w)).toBeCloseTo([...w].reduce((s, [ac, x]) => s + x * assetClassCorrelation(ac, 'us_equity') * ASSET_CLASS_RISK[ac as keyof typeof ASSET_CLASS_RISK].vol / ASSET_CLASS_RISK.us_equity.vol, 0), 12)
    expect(assetClassBeta('us_equity')).toBe(1)
    expect(assetClassBeta('private_equity')).toBeCloseTo(0.75 * 0.23 / 0.155, 12)
  })

  it('volatility accounts for imperfect correlation, so it is below the weighted average of vols', () => {
    const weightedAvgVol = [...w.entries()].reduce((s, [ac, x]) => s + x * ASSET_CLASS_RISK[ac as keyof typeof ASSET_CLASS_RISK].vol, 0)
    // 0.0976 under Phase 7a final's correlations (0.1007 with gold at 0.5 to equity).
    expect(portfolioVolatility(w)).toBeCloseTo(0.0976, 4)
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
    const vol = 0.1007
    expect(parametricVaR(100_000, vol)).toBeCloseTo(4_782, 0)
    expect(parametricVaR(12_000_000, vol)).toBeCloseTo(573_834, 0)
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

describe('the round-then-VaR sequence (rounding order is load-bearing)', () => {
  // acc-006, $12M — exercises the real caller sequence: portfolioVolatility's full-precision
  // output must be rounded to 4dp *before* it reaches parametricVaR, exactly as `parametricVaR`'s
  // JSDoc requires. This is the seam Task 10 wires up; a caller that forgets to round here is
  // wrong by tens of dollars, not by a rounding artefact.
  const value = 12_000_000
  const rawVol = portfolioVolatility(assetClassWeights(ACC_006))
  const roundedVol = Math.round(rawVol * 10_000) / 10_000

  it('rounding sigma to 4dp before calling parametricVaR reproduces the correct, disclosed VaR', () => {
    // Phase 7a final: private equity 0.75 with public equity (was 0.5) lifts σ 0.1047 -> 0.1069.
    expect(roundedVol).toBeCloseTo(0.1069, 4)
    expect(parametricVaR(value, roundedVol)).toBeCloseTo(609_164, 0)
  })

  it('skipping the round is not a cosmetic omission — it moves VaR by tens of dollars, ' +
    'far past the ±1 tolerance the model promises, so Task 10 must round sigma before calling parametricVaR', () => {
    const correctVaR = parametricVaR(value, roundedVol)
    const wrongVaR = parametricVaR(value, rawVol)
    expect(Math.abs(wrongVaR - correctVaR)).toBeGreaterThan(10)
  })
})

describe('sharpe and sortino', () => {
  it('C4: the app reported 1.34 against its own 12.4% return and 11.8% sigma; the identity gives 0.71', () => {
    expect(sharpe(0.124, 0.118)).toBeCloseTo(0.7119, 4)
    expect(RISK_FREE_RATE).toBe(0.04)
  })

  it('sortino exceeds sharpe because downside deviation is below total volatility', () => {
    expect(downsideDeviation(0.1007)).toBeCloseTo(0.07049, 5)
    expect(sortino(0.0985, downsideDeviation(0.1007)))
      .toBeGreaterThan(sharpe(0.0985, 0.1007))
  })

  it('modeled max drawdown is negative and scales with volatility', () => {
    expect(modeledMaxDrawdown(0.118)).toBeCloseTo(-0.1416, 4)
    expect(modeledMaxDrawdown(0.636)).toBeLessThan(modeledMaxDrawdown(0.061))
  })
})

describe('trackingError', () => {
  it('is zero when the portfolio matches its benchmark exactly', () => {
    const w = assetClassWeights([{ assetClass: 'us_equity', weight: 0.6 }, { assetClass: 'fixed_income', weight: 0.4 }])
    expect(trackingError(w, w)).toBeCloseTo(0, 12)
  })

  it('C6: is one annualized statistic, and it grows with active weight', () => {
    const bench = assetClassWeights([{ assetClass: 'us_equity', weight: 0.6 }, { assetClass: 'fixed_income', weight: 0.4 }])
    const near = assetClassWeights([{ assetClass: 'us_equity', weight: 0.65 }, { assetClass: 'fixed_income', weight: 0.35 }])
    const far = assetClassWeights([{ assetClass: 'us_equity', weight: 0.95 }, { assetClass: 'fixed_income', weight: 0.05 }])
    expect(trackingError(far, bench)).toBeGreaterThan(trackingError(near, bench))
  })
})

describe('the correlation assumptions', () => {
  const classes = Object.keys(CORRELATION_GROUP)
  const matrix = classes.map((a) => classes.map((b) => assetClassCorrelation(a, b)))

  it('cover every asset class the risk assumptions do, and no other', () => {
    expect([...classes].sort()).toEqual(Object.keys(ASSET_CLASS_RISK).sort())
  })

  it('define every pair: symmetric, 1 on the diagonal, each entry a correlation', () => {
    classes.forEach((a, i) => classes.forEach((b, j) => {
      const rho = matrix[i]![j]!
      expect(rho, `${a}/${b}`).toBe(matrix[j]![i])
      expect(Math.abs(rho), `${a}/${b}`).toBeLessThanOrEqual(1)
      if (i === j) expect(rho, a).toBe(1)
      else expect(rho, `${a}/${b}`).toBeLessThan(1)
    }))
  })

  it('form a positive semidefinite matrix (a Cholesky factorization exists)', () => {
    const n = matrix.length
    const lower: number[][] = matrix.map(() => new Array<number>(n).fill(0))
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let s = matrix[i]![j]!
        for (let k = 0; k < j; k++) s -= lower[i]![k]! * lower[j]![k]!
        if (i === j) {
          expect(s, `pivot ${classes[i]}`).toBeGreaterThan(-1e-12)
          lower[i]![i] = Math.sqrt(Math.max(s, 0))
        } else {
          lower[i]![j] = lower[j]![j]! === 0 ? 0 : s / lower[j]![j]!
        }
      }
    }
  })

  it('are grouped: equity closely together, real assets moderately, bonds and cash loosely', () => {
    expect(assetClassCorrelation('us_equity', 'intl_equity')).toBe(0.85)
    expect(assetClassCorrelation('intl_equity', 'emerging_markets')).toBe(0.85)
    expect(assetClassCorrelation('us_equity', 'fixed_income')).toBe(0.3)
    expect(assetClassCorrelation('fixed_income', 'cash')).toBe(0.1)
    expect(assetClassCorrelation('real_estate', 'alternatives')).toBe(0.6)
    expect(assetClassCorrelation('private_equity', 'alternatives')).toBe(0.6)
    // Phase 7a final: gold (the commodities sleeve holds GLD) barely moves with equity; private
    // equity is equity, marked less often.
    expect(assetClassCorrelation('commodities', 'us_equity')).toBe(0.05)
    expect(assetClassCorrelation('real_estate', 'commodities')).toBe(0.2)
    expect(assetClassCorrelation('private_equity', 'us_equity')).toBe(0.75)
    expect(assetClassCorrelation('emerging_markets', 'real_estate')).toBe(0.5)
    expect(assetClassCorrelation('digital_assets', 'us_equity')).toBe(0.4)
  })

  it('name an unknown asset class rather than guess its correlation', () => {
    expect(() => assetClassCorrelation('us_equity', 'collectibles')).toThrow(/collectibles/)
  })
})
