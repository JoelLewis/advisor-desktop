import { describe, it, expect } from 'vitest'
import { formatTimeAgo } from '../NotificationCenter'
import { MOCK_NOW_ISO } from '@/lib/clock'

// Regression test for fix round 2: formatTimeAgo previously diffed against Date.now() (the live
// system clock). Round 1 already anchored notification timestamps to the frozen clock in
// src/mocks/data/notifications.ts — this closes the other half: the display function reading
// those timestamps must use the same frozen clock, or every notification would still render as
// many months old.
describe('NotificationCenter formatTimeAgo (anchored to the frozen clock)', () => {
  const mockNowMs = new Date(MOCK_NOW_ISO).getTime()
  const isoMinutesAgo = (mins: number) => new Date(mockNowMs - mins * 60_000).toISOString()

  it('formats sub-minute offsets as "Just now"', () => {
    expect(formatTimeAgo(isoMinutesAgo(0))).toBe('Just now')
  })

  it('formats minute offsets', () => {
    expect(formatTimeAgo(isoMinutesAgo(12))).toBe('12m ago')
  })

  it('formats hour offsets', () => {
    expect(formatTimeAgo(isoMinutesAgo(5 * 60))).toBe('5h ago')
  })

  it('formats "Yesterday" for a ~1-day offset', () => {
    expect(formatTimeAgo(isoMinutesAgo(24 * 60 + 30))).toBe('Yesterday')
  })

  it('formats multi-day offsets', () => {
    expect(formatTimeAgo(isoMinutesAgo(3 * 24 * 60))).toBe('3d ago')
  })
})
