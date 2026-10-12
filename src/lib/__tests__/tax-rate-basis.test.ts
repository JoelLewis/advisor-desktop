import { describe, it, expect } from 'vitest'
import {
  SHORT_TERM_RATE, LONG_TERM_RATE, TOP_ORDINARY_RATE, TOP_LONG_TERM_GAINS_RATE, NIIT_RATE, TAX_RATE_BASIS, taxRateFor,
  TOP_COLLECTIBLES_RATE, COLLECTIBLE_LONG_TERM_RATE, RATE_DISCLOSURE, buildClientRateDisclosure,
} from '@/lib/tax-rules'
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

describe('the client letter states the same basis in US spelling', () => {
  it('is templated from the basis it is given', () => {
    const basis = { shortTerm: 0.4, longTerm: 0.25, collectibleLongTerm: 0.33, includes: ['federal', 'niit'], excludes: ['state'] } as const
    expect(buildClientRateDisclosure(basis)).toBe(
      'These estimates use top federal rates, including the 3.8% net investment income tax: 40% on short-term gains and 25% on long-term gains '
      + '(33% on collectibles, including physically backed precious-metal funds). State tax is not modeled. They are estimates, not tax advice.')
    expect(buildClientRateDisclosure({ ...basis, includes: ['federal'], excludes: [] })).not.toMatch(/investment income|State tax/)
  })
  it('quotes the rates applied, and leaves the firm disclosure as it was', () => {
    const client = buildClientRateDisclosure(TAX_RATE_BASIS)
    expect(client).toContain('40.8% on short-term gains and 23.8% on long-term gains (31.8% on collectibles')
    expect(client).not.toMatch(/modell|realis/)
    expect(RATE_DISCLOSURE).toContain('State tax is not modelled.')
  })
})
