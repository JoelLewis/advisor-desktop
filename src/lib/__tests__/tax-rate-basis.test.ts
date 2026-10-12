import { describe, it, expect } from 'vitest'
import {
  SHORT_TERM_RATE, LONG_TERM_RATE, TOP_ORDINARY_RATE, TOP_LONG_TERM_GAINS_RATE, NIIT_RATE, TAX_RATE_BASIS, taxRateFor,
} from '@/features/portfolios/tax/shared'

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
    expect(TAX_RATE_BASIS).toEqual({ shortTerm: 0.408, longTerm: 0.238, includes: ['federal', 'niit'], excludes: ['state'] })
  })
})
