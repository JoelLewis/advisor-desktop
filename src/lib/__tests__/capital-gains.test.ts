import { describe, it, expect } from 'vitest'
import { netCapitalGainsTax } from '@/lib/capital-gains'

const rate = (p: 'short' | 'long') => (p === 'short' ? 0.37 : 0.238)

describe('netCapitalGainsTax (IRC §1222 netting)', () => {
  it('taxes each character at its own rate when both are gains', () => {
    expect(netCapitalGainsTax(1_000, 2_000, rate)).toBe(Math.round(370 + 476))
  })
  it('a long-term loss offsets a short-term gain', () => {
    expect(netCapitalGainsTax(10_000, -4_000, rate)).toBe(Math.round(6_000 * 0.37))
  })
  it('a short-term loss offsets a long-term gain', () => {
    expect(netCapitalGainsTax(-3_000, 10_000, rate)).toBe(Math.round(7_000 * 0.238))
  })
  it('a pure harvest (losses only) owes nothing — never a negative tax', () => {
    expect(netCapitalGainsTax(-5_000, -45_850, rate)).toBe(0)
  })
  it('losses larger than gains net to zero tax', () => {
    expect(netCapitalGainsTax(2_000, -9_000, rate)).toBe(0)
  })
})
