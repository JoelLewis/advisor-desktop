import { describe, it, expect } from 'vitest'
import { netCapitalGainsTax, netTaxForLegs, additionalCapitalGainsTax } from '@/lib/capital-gains'

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

describe('netTaxForLegs', () => {
  it('nets the legs\' summed results and reports the per-leg gross alongside', () => {
    const legs = [
      { realisedShortTerm: 0, realisedLongTerm: -4_000, taxImpact: 0 },
      { realisedShortTerm: 10_000, realisedLongTerm: 0, taxImpact: 3_700 },
    ]
    expect(netTaxForLegs(legs, rate)).toEqual({ net: Math.round(6_000 * 0.37), gross: 3_700 })
  })
  it('never exceeds gross: the net rounds once, the gross rounds per leg', () => {
    // Each leg's own tax is 1.4 x 0.25 = 0.35, which rounds to 0; the net is 2.8 x 0.25 = 0.7,
    // which rounds to 1. Nothing was netted, so the bill cannot be higher than the gross.
    const legs = [
      { realisedShortTerm: 0, realisedLongTerm: 1.4, taxImpact: 0 },
      { realisedShortTerm: 0, realisedLongTerm: 1.4, taxImpact: 0 },
    ]
    expect(netTaxForLegs(legs, () => 0.25)).toEqual({ net: 0, gross: 0 })
  })
  it('an empty proposal owes nothing', () => {
    expect(netTaxForLegs([], rate)).toEqual({ net: 0, gross: 0 })
  })
})

describe('additionalCapitalGainsTax (a proposal on top of results already realised)', () => {
  const none = { shortTerm: 0, longTerm: 0 }
  it('with nothing realised yet, it is the proposal\'s own netted tax', () => {
    expect(additionalCapitalGainsTax(none, { shortTerm: 1_000, longTerm: 2_000 }, rate)).toBe(netCapitalGainsTax(1_000, 2_000, rate))
  })
  it('a year-to-date long-term loss shelters a proposal\'s long-term gain (acc-002: −32,750 against +76,538)', () => {
    expect(additionalCapitalGainsTax({ shortTerm: 0, longTerm: -32_750 }, { shortTerm: 0, longTerm: 76_538 }, rate))
      .toBe(Math.round(43_788 * 0.238))
  })
  it('a gain can cost more than its own rate when it uses up a loss that was sheltering short-term gains', () => {
    // Before: ST +10,000 sheltered by LT −10,000 → 0. After adding LT +10,000: ST +10,000 → 3,700.
    expect(additionalCapitalGainsTax({ shortTerm: 10_000, longTerm: -10_000 }, { shortTerm: 0, longTerm: 10_000 }, rate)).toBe(3_700)
  })
  it('a loss against gains already realised this year is a negative change — tax saved', () => {
    expect(additionalCapitalGainsTax({ shortTerm: 0, longTerm: 50_000 }, { shortTerm: 0, longTerm: -20_000 }, rate))
      .toBe(Math.round(30_000 * 0.238) - Math.round(50_000 * 0.238))
  })
})
