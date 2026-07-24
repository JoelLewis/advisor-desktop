import { describe, it, expect } from 'vitest'
import { formatTimeAgo as formatTimeAgoPage } from '../ReconciliationPage'
import { formatTimeAgo as formatTimeAgoPanel } from '../DataQualityPanel'
import { MOCK_NOW_ISO } from '@/lib/clock'

// Regression test for fix round 2: both ReconciliationPage and DataQualityPanel carry a duplicate
// formatTimeAgo() that previously diffed against Date.now() (the live system clock) instead of
// the frozen clock, so every reconciliation sync/break timestamp (all dated around 2026-02-25)
// would have rendered as many months stale. Anchored to now() from src/lib/clock, offsets from
// MOCK_NOW_ISO must produce the expected "Xm/Xh/Xd ago" bucket regardless of the real date.
describe.each([
  ['ReconciliationPage', formatTimeAgoPage],
  ['DataQualityPanel', formatTimeAgoPanel],
])('%s formatTimeAgo (anchored to the frozen clock)', (_name, formatTimeAgo) => {
  const mockNowMs = new Date(MOCK_NOW_ISO).getTime()
  const isoMinutesAgo = (mins: number) => new Date(mockNowMs - mins * 60_000).toISOString()
  const isoHoursAgo = (hours: number) => new Date(mockNowMs - hours * 60 * 60_000).toISOString()
  const isoDaysAgo = (days: number) => new Date(mockNowMs - days * 24 * 60 * 60_000).toISOString()

  it('formats sub-minute offsets as "just now"', () => {
    expect(formatTimeAgo(isoMinutesAgo(0))).toBe('just now')
  })

  it('formats minute offsets', () => {
    expect(formatTimeAgo(isoMinutesAgo(12))).toBe('12m ago')
  })

  it('formats hour offsets', () => {
    expect(formatTimeAgo(isoHoursAgo(5))).toBe('5h ago')
  })

  it('formats day offsets', () => {
    expect(formatTimeAgo(isoDaysAgo(3))).toBe('3d ago')
  })
})
