import { describe, it, expect } from 'vitest'
import { constraintsFromForm, formFromConstraints } from '@/workspace/proposal/constraint-form'

describe('the revise form', () => {
  it('reads a version\'s constraints back into the form', () => {
    expect(formFromConstraints([{ kind: 'avoid_self_wash' }, { kind: 'cap_realised_gains', usd: 50_000 }, { kind: 'exclude_asset_class', assetClass: 'digital_assets' }]))
      .toEqual({ harvestOnly: false, capOn: true, cap: '50000', exclude: 'digital_assets' })
  })
  it('turns the form into constraints, accepting dollar signs and commas', () => {
    expect(constraintsFromForm({ harvestOnly: true, capOn: true, cap: '$50,000', exclude: '' }))
      .toEqual({ ok: true, constraints: [{ kind: 'harvest_only' }, { kind: 'cap_realised_gains', usd: 50_000 }] })
  })
  it('accepts a cap of zero', () => {
    expect(constraintsFromForm({ harvestOnly: false, capOn: true, cap: '0', exclude: '' }))
      .toEqual({ ok: true, constraints: [{ kind: 'cap_realised_gains', usd: 0 }] })
  })
  it.each(['', 'abc', '-5', '1e999'])('refuses a cap of %j', (cap) => {
    expect(constraintsFromForm({ harvestOnly: false, capOn: true, cap, exclude: '' }).ok).toBe(false)
  })
  it('refuses an unknown asset class, and cash', () => {
    expect(constraintsFromForm({ harvestOnly: false, capOn: false, cap: '', exclude: 'gold' }).ok).toBe(false)
    expect(constraintsFromForm({ harvestOnly: false, capOn: false, cap: '', exclude: 'cash' }).ok).toBe(false)
  })
})
