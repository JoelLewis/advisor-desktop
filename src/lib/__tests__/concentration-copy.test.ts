import { describe, it, expect } from 'vitest'
import { describeBreaches } from '@/lib/concentration-copy'

describe('describeBreaches', () => {
  it('returns an empty string for no breaches', () => {
    expect(describeBreaches([])).toBe('')
  })

  it('states the basis for a single breach', () => {
    const text = describeBreaches([
      { symbol: 'NVDA', weight: 0.139, limit: 0.10, kind: 'single_name' },
    ])
    expect(text).toBe('NVDA at 13.9% exceeds the 10% single-issuer limit.')
  })

  it('groups multiple breaches of the same kind under one clause', () => {
    const text = describeBreaches([
      { symbol: 'D05.SI', weight: 0.171, limit: 0.10, kind: 'single_name' },
      { symbol: 'O39.SI', weight: 0.133, limit: 0.10, kind: 'single_name' },
    ])
    expect(text).toBe('D05.SI at 17.1% and O39.SI at 13.3% exceed the 10% single-issuer limit.')
  })

  // C23 fix round 1 — Important 3. Before this fix, the banner applied the *first* breached
  // position's limit/kind to every symbol in the sentence, so a mixed-kind breach set (acc-042:
  // two single-issuer breaches plus a cash breach) would misstate the 15% cash breach as a 10%
  // single-issuer breach. Each kind must state its own limit.
  it('C23 fix round 1: states the correct limit for each kind in a mixed breach set', () => {
    const text = describeBreaches([
      { symbol: 'D05.SI', weight: 0.171, limit: 0.10, kind: 'single_name' },
      { symbol: 'O39.SI', weight: 0.133, limit: 0.10, kind: 'single_name' },
      { symbol: 'CASH', weight: 0.207, limit: 0.15, kind: 'cash' },
    ])
    expect(text).toBe(
      'D05.SI at 17.1% and O39.SI at 13.3% exceed the 10% single-issuer limit. '
      + 'CASH at 20.7% exceeds the 15% cash limit.',
    )
    // The old bug: every clause would have said "10% single-issuer limit", including the cash one.
    expect(text).not.toContain('CASH at 20.7% exceeds the 10%')
  })

  it('states the pooled-vehicle basis for a fund breach', () => {
    const text = describeBreaches([
      { symbol: 'SPY', weight: 0.452, limit: 0.35, kind: 'fund' },
    ])
    expect(text).toBe('SPY at 45.2% exceeds the 35% pooled-vehicle limit.')
  })
})
