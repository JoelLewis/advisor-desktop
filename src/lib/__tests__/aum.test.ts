import { describe, it, expect } from 'vitest'
import {
  accountValueUSD, sumAccountsUSD, deriveHouseholdAUM, deriveClientAUM,
  deriveBookAUM, herfindahlIndex, effectiveN,
} from '@/lib/aum'

const RATES = { HKD: 7.82, SGD: 1.34, EUR: 0.92, CHF: 0.88 }

const ACCOUNTS = [
  { id: 'a1', householdId: 'h1', clientId: 'c1', totalValue: 1_000_000 },
  { id: 'a2', householdId: 'h1', clientId: 'c2', totalValue: 12_500_000, baseCurrency: 'HKD' as const },
  { id: 'a3', householdId: 'h2', clientId: 'c3', totalValue: 2_800_000, baseCurrency: 'SGD' as const },
]

describe('accountValueUSD', () => {
  it('passes USD through untouched', () => {
    expect(accountValueUSD(ACCOUNTS[0]!, RATES)).toBe(1_000_000)
  })

  it('converts HKD 12,500,000 at 7.82 to 1,598,465.4731457800 USD', () => {
    // eslint-disable-next-line no-loss-of-precision -- full-precision figure for documentation; toBeCloseTo only checks 6 decimals
    expect(accountValueUSD(ACCOUNTS[1]!, RATES)).toBeCloseTo(1_598_465.4731457800, 6)
  })

  it('converts SGD 2,800,000 at 1.34 to 2,089,552.2388059701 USD', () => {
    // eslint-disable-next-line no-loss-of-precision -- full-precision figure for documentation; toBeCloseTo only checks 6 decimals
    expect(accountValueUSD(ACCOUNTS[2]!, RATES)).toBeCloseTo(2_089_552.2388059701, 6)
  })
})

describe('sumAccountsUSD', () => {
  it('never adds mixed currencies 1:1', () => {
    const naive = ACCOUNTS.reduce((s, a) => s + a.totalValue, 0)
    expect(naive).toBe(16_300_000)
    expect(sumAccountsUSD(ACCOUNTS, RATES)).toBeCloseTo(4_688_017.712, 3)
  })

  it('is zero for an empty list', () => {
    expect(sumAccountsUSD([], RATES)).toBe(0)
  })
})

describe('deriveHouseholdAUM / deriveClientAUM / deriveBookAUM', () => {
  it('household h1 is USD 1,000,000 + HKD-converted 1,598,465.4731', () => {
    // eslint-disable-next-line no-loss-of-precision -- full-precision figure for documentation; toBeCloseTo only checks 6 decimals
    expect(deriveHouseholdAUM('h1', ACCOUNTS, RATES)).toBeCloseTo(2_598_465.4731457800, 6)
  })

  it('client c3 holds only the SGD account', () => {
    // eslint-disable-next-line no-loss-of-precision -- full-precision figure for documentation; toBeCloseTo only checks 6 decimals
    expect(deriveClientAUM('c3', ACCOUNTS, RATES)).toBeCloseTo(2_089_552.2388059701, 6)
  })

  it('book equals the sum of its households', () => {
    const byHousehold = ['h1', 'h2'].reduce((s, h) => s + deriveHouseholdAUM(h, ACCOUNTS, RATES), 0)
    expect(deriveBookAUM(ACCOUNTS, RATES)).toBeCloseTo(byHousehold, 9)
  })

  it('returns 0 for an unknown household rather than throwing', () => {
    expect(deriveHouseholdAUM('nope', ACCOUNTS, RATES)).toBe(0)
  })
})

describe('herfindahlIndex', () => {
  it('uses the 0–10,000 scale, so a monopoly is 10,000', () => {
    expect(herfindahlIndex([1])).toBeCloseTo(10_000, 6)
  })

  it('13 equal shares gives the 769 floor cited in C22', () => {
    const equal = Array.from({ length: 13 }, () => 1 / 13)
    expect(herfindahlIndex(equal)).toBeCloseTo(769.2307692308, 6)
  })

  it('effectiveN inverts HHI', () => {
    expect(effectiveN(herfindahlIndex([0.5, 0.5]))).toBeCloseTo(2, 9)
  })
})
