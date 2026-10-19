import { describe, it, expect } from 'vitest'
import { blendedTieredFee } from '@/lib/fees'

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
