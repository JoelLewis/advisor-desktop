import { describe, it, expect } from 'vitest'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { assetClassLabel } from '@/workspace/asset-class-label'

describe('assetClassLabel', () => {
  it('maps engine keys case-insensitively', () => {
    expect(assetClassLabel('us_equity')).toBe('US Equity')
    expect(assetClassLabel('US_EQUITY')).toBe('US Equity')
  })
  it('throws naming an unmapped key', () => {
    expect(() => assetClassLabel('moonshots')).toThrow(/moonshots/)
  })
})

describe('ASSET_CLASS_LABELS', () => {
  it('spells every asset class out, one form everywhere', () => {
    expect(ASSET_CLASS_LABELS.intl_equity).toBe('International Equity')
    expect(ASSET_CLASS_LABELS.emerging_markets).toBe('Emerging Markets')
    for (const label of Object.values(ASSET_CLASS_LABELS)) expect(label).not.toMatch(/Intl|Mkts/)
  })
})
