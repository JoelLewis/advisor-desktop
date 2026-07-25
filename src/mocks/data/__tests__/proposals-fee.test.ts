import { describe, it, expect } from 'vitest'
import { generateSectionContent } from '@/mocks/data/proposals'

describe('C33: proposal fee illustration is derived, not a hardcoded $5M/$40,250 example', () => {
  it('tpl-001 on a $5,000,000 basis shows $45,500 / 0.91%, not the stale $40,250 / 0.805%', () => {
    const content = generateSectionContent('fee_schedule', 'Test Client', 'tpl-001', 5_000_000)
    expect(content).toContain('$45,500')
    expect(content).toContain('0.910%')
    expect(content).not.toContain('$40,250')
    expect(content).not.toContain('0.805%')
  })

  it('recomputes for a different basis rather than always illustrating $5,000,000', () => {
    const content = generateSectionContent('fee_schedule', 'Test Client', 'tpl-001', 8_000_000)
    // tpl-001 tiers: 1.00% to $2M, 0.85% $2-5M, 0.70% $5-10M
    // fee = 2M*0.01 + 3M*0.0085 + 3M*0.0070 = 20,000 + 25,500 + 21,000 = 66,500
    expect(content).toContain('$66,500')
    expect(content).toContain('$8,000,000')
  })

  it('falls back to a $5,000,000 illustrative basis when no household AUM is supplied', () => {
    const content = generateSectionContent('fee_schedule', 'Test Client', 'tpl-001')
    expect(content).toContain('$45,500')
  })

  it('states the real per-trade commission schedule instead of claiming there are none', () => {
    const content = generateSectionContent('fee_schedule', 'Test Client', 'tpl-001', 5_000_000)
    expect(content.toLowerCase()).not.toContain('no additional trading commissions')
    expect(content).toContain('$4.95')
    expect(content).toContain('$0.65')
    expect(content).toContain('$1.00')
  })
})
