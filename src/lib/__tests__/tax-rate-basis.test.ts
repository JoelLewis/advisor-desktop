import { describe, it, expect } from 'vitest'
import {
  SHORT_TERM_RATE, LONG_TERM_RATE, TOP_ORDINARY_RATE, TOP_LONG_TERM_GAINS_RATE, NIIT_RATE, TAX_RATE_BASIS, taxRateFor,
  TOP_COLLECTIBLES_RATE, COLLECTIBLE_LONG_TERM_RATE, RATE_DISCLOSURE,
} from '@/features/portfolios/tax/shared'
import { taxCharacterOf } from '@/lib/security-master'

describe('§0.6 · both rates carry the 3.8% net investment income tax', () => {
  it('short-term is the top ordinary rate plus NIIT: 40.8%', () => {
    expect(SHORT_TERM_RATE).toBeCloseTo(TOP_ORDINARY_RATE + NIIT_RATE, 12)
    expect(taxRateFor('short')).toBe(0.408)
  })
  it('long-term is the top capital-gains rate plus NIIT: 23.8%', () => {
    expect(LONG_TERM_RATE).toBeCloseTo(TOP_LONG_TERM_GAINS_RATE + NIIT_RATE, 12)
    expect(taxRateFor('long')).toBe(0.238)
  })
  it('the basis states what the rates include and leave out', () => {
    expect(TAX_RATE_BASIS).toEqual({
      shortTerm: 0.408, longTerm: 0.238, collectibleLongTerm: 0.318, includes: ['federal', 'niit'], excludes: ['state'],
    })
  })
})

describe('§0.6 · physically backed precious-metal ETFs are taxed as collectibles', () => {
  it('a long-term collectibles gain is taxed at the 28% maximum plus NIIT: 31.8%', () => {
    expect(COLLECTIBLE_LONG_TERM_RATE).toBeCloseTo(TOP_COLLECTIBLES_RATE + NIIT_RATE, 12)
    expect(taxRateFor('long', 'collectible')).toBe(0.318)
  })
  it('a short-term collectibles gain is taxed like any short-term gain: 40.8%', () => {
    expect(taxRateFor('short', 'collectible')).toBe(0.408)
  })
  it('a long-term GLD gain is taxed at 31.8%; a long-term SPY gain at 23.8%', () => {
    expect(taxRateFor('long', taxCharacterOf('GLD'))).toBe(0.318)
    expect(taxRateFor('long', taxCharacterOf('SPY'))).toBe(0.238)
  })
  it('the disclosure states the collectibles rate', () => {
    expect(RATE_DISCLOSURE).toContain('31.8% on collectibles')
  })
})
