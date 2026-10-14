import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { deriveBookAUM } from '@/lib/aum'
import { assetWeightedEffectiveFee, bps } from '@/lib/fees'
import { billingView } from '@/mocks/reference/billing'
import { practiceView } from '@/mocks/reference/practice'

const billing = () => {
  const v = billingView('user-001')
  if (!v) throw new Error('Adrian reads billing')
  return v
}

describe('one fee number across every surface', () => {
  it('practice and billing report the same effective fee, 74.4 bps', () => {
    expect(Math.round(bps(billing().totals.effectiveRate) * 10) / 10).toBe(74.4)
    expect(practiceView('user-001')?.revenue.effectiveRate).toBeCloseTo(billing().totals.effectiveRate, 12)
  })

  it('the effective fee is Σ fees ÷ Σ value, not the mean of household rates', () => {
    const rows = billing().households.map((h) => ({ aum: h.value, annualFee: h.annualFee }))
    expect(assetWeightedEffectiveFee(rows)).toBeCloseTo(bps(billing().totals.effectiveRate), 9)
    const unweighted = billing().households.reduce((s, h) => s + h.effectiveRate, 0) / rows.length
    expect(Math.abs(bps(unweighted) - bps(billing().totals.effectiveRate))).toBeGreaterThan(10)
  })

  it('Σ billed value === book value: nobody is billed on a stale basis', () => {
    expect(billing().totals.value).toBeCloseTo(deriveBookAUM(accounts, FX_RATES_USD_BASE), 4)
  })
})
