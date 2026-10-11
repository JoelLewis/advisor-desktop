import { describe, it, expect } from 'vitest'
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
