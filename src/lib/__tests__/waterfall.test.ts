import { describe, it, expect } from 'vitest'
import { computeWaterfallDomain, type WaterfallBar } from '@/lib/waterfall'

// The real trailing-12M decomposition on a derived book of 91,320,824.
const BARS: WaterfallBar[] = [
  { label: 'Starting AUM', value: 84_015_158, kind: 'anchor' },
  { label: 'Market appreciation', value: 5_935_854, kind: 'delta' },
  { label: 'New assets', value: 2_922_266, kind: 'delta' },
  { label: 'Withdrawals', value: -1_095_850, kind: 'delta' },
  { label: 'Attrition', value: -456_604, kind: 'delta' },
  { label: 'Current AUM', value: 91_320_824, kind: 'anchor' },
]

describe('computeWaterfallDomain', () => {
  it('brackets the running cumulative range, not zero', () => {
    const [lo, hi] = computeWaterfallDomain(BARS)
    // running values span 84,015,158 → 92,873,278; span 8,858,120; 8% pad = 708,649.6
    expect(lo).toBeCloseTo(83_306_508.4, 1)
    expect(hi).toBeCloseTo(93_581_927.6, 1)
    expect(lo).toBeGreaterThan(0)
  })

  it('makes the smallest bar legible: >4% of plot height instead of <0.5%', () => {
    const [lo, hi] = computeWaterfallDomain(BARS)
    const smallest = Math.min(...BARS.filter((b) => b.kind === 'delta').map((b) => Math.abs(b.value)))
    const truncatedShare = smallest / (hi - lo)
    const zeroBasedShare = smallest / 92_873_278
    expect(truncatedShare).toBeGreaterThan(0.04)
    expect(zeroBasedShare).toBeLessThan(0.005)
    expect(truncatedShare / zeroBasedShare).toBeGreaterThan(8)
  })

  it('falls back to a zero-based domain when every bar is a delta from zero', () => {
    const [lo] = computeWaterfallDomain([{ label: 'x', value: 100, kind: 'delta' }])
    expect(lo).toBe(0)
  })
})
