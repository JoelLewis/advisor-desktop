import { describe, it, expect } from 'vitest'
import { getBookOfBusiness } from '@/services/pms'
import { householdFees } from '@/mocks/data/billing'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { deriveBookAUM } from '@/lib/aum'
import { assetWeightedEffectiveFee } from '@/lib/fees'

describe('one fee number across every surface', () => {
  it('Book of Business reports 76.4 bps, in basis points', async () => {
    const book = await getBookOfBusiness()
    expect(book.effectiveFeeBps).toBe(76.4)
  })

  it('effectiveFeeBps === annualRevenue ÷ totalAUM', async () => {
    const book = await getBookOfBusiness()
    expect((book.annualRevenue / book.totalAUM) * 10_000).toBeCloseTo(book.effectiveFeeBps, 1)
  })

  it('annualRevenue === Σ household annual fees', async () => {
    const book = await getBookOfBusiness()
    expect(book.annualRevenue)
      .toBe(Math.round(householdFees.reduce((s, f) => s + f.quarterlyAmount * 4, 0)))
    expect(book.annualRevenue).toBe(697_466)
  })

  it('the billing surface reports the same asset-weighted rate, not the unweighted mean', async () => {
    const rows = householdFees.map((f) => ({ aum: f.aumBasis, annualFee: f.quarterlyAmount * 4 }))
    const weighted = assetWeightedEffectiveFee(rows)
    const unweighted = householdFees.reduce((s, f) => s + f.annualRate, 0) / householdFees.length * 10_000
    expect(weighted).toBeCloseTo(76.3753, 3)
    expect(unweighted).toBeCloseTo(88.0769, 3)
  })

  it('Σ aumBasis === book AUM — nobody is billed on a stale basis', () => {
    expect(householdFees.reduce((s, f) => s + f.aumBasis, 0))
      .toBeCloseTo(deriveBookAUM(accounts, FX_RATES_USD_BASE), 4)
  })
})
