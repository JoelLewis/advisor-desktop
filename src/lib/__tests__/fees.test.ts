import { describe, it, expect } from 'vitest'
import { assetWeightedEffectiveFee, bps, rateFromBps, blendedTieredFee } from '@/lib/fees'

describe('bps', () => {
  it('0.0085 is 85 basis points, not 0.85', () => {
    expect(bps(0.0085)).toBe(85)
    expect(rateFromBps(85)).toBeCloseTo(0.0085, 10)
  })
})

describe('assetWeightedEffectiveFee', () => {
  const BOOK = [
    { aum: 18_750_000, annualFee: 140_625 },
    { aum: 30_308_017.71195, annualFee: 197_002.11512 },
    { aum: 4_995_000, annualFee: 42_457.5 },
    { aum: 9_500_000, annualFee: 76_000 },
    { aum: 4_385_000, annualFee: 41_657.5 },
    { aum: 7_200_000, annualFee: 57_600 },
    { aum: 5_965_000, annualFee: 47_720 },
    { aum: 1_385_000, annualFee: 13_850 },
    { aum: 1_050_000, annualFee: 10_500 },
    { aum: 720_000, annualFee: 7_200 },
    { aum: 1_500_000, annualFee: 15_000 },
    { aum: 380_000, annualFee: 3_800 },
    { aum: 5_182_806.32411, annualFee: 44_053.85376 },
  ]

  it('is 76.4 bps on the derived book, not 88 bps and not 0.85', () => {
    expect(assetWeightedEffectiveFee(BOOK)).toBeCloseTo(76.3753, 3)
  })

  it('differs from the unweighted mean of the rates', () => {
    const unweighted = BOOK.reduce((s, r) => s + (r.annualFee / r.aum), 0) / BOOK.length * 10_000
    expect(unweighted).toBeCloseTo(88.0769, 3)
    expect(Math.abs(unweighted - assetWeightedEffectiveFee(BOOK))).toBeGreaterThan(10)
  })

  it('is zero on an empty book rather than NaN', () => {
    expect(assetWeightedEffectiveFee([])).toBe(0)
  })
})

describe('blendedTieredFee', () => {
  // tpl-001 from proposals.ts: 1.00% to $2M, 0.85% $2-5M, 0.70% above $5M
  const TIERS = [
    { upTo: 2_000_000, rate: 0.0100 },
    { upTo: 5_000_000, rate: 0.0085 },
    { upTo: null, rate: 0.0070 },
  ]

  it('C33: a $5,000,000 portfolio pays $45,500, a 0.91% blended rate — not $40,250 / 0.805%', () => {
    const { fee, blendedRate } = blendedTieredFee(5_000_000, TIERS)
    expect(fee).toBeCloseTo(45_500, 2)
    expect(blendedRate).toBeCloseTo(0.0091, 6)
  })

  it('charges marginally, so the first $2M always costs $20,000', () => {
    expect(blendedTieredFee(2_000_000, TIERS).fee).toBeCloseTo(20_000, 2)
  })

  it('applies the top tier above the last breakpoint', () => {
    // 20,000 + 25,500 + 0.70% x 5,000,000 = 80,500
    expect(blendedTieredFee(10_000_000, TIERS).fee).toBeCloseTo(80_500, 2)
  })
})
