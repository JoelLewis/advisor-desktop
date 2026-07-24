import { describe, it, expect } from 'vitest'
import { MOCK_NOTIFICATIONS } from '../notifications'
import { MOCK_NOW_ISO } from '@/lib/clock'

// Regression test for fix round 1: daysAgo/hoursAgo/minutesAgo previously anchored to the live
// system clock, so a notification like minutesAgo(12) would carry a timestamp from whenever the
// test/app happened to run — potentially months away from the frozen fixture data it references.
// Anchored to now() from src/lib/clock, every notification timestamp must fall within a few days
// of MOCK_NOW_ISO, and never after it.
describe('notification timestamp invariants', () => {
  const mockNow = new Date(MOCK_NOW_ISO).getTime()

  it('no notification is timestamped after the frozen clock', () => {
    for (const n of MOCK_NOTIFICATIONS) {
      expect(new Date(n.timestamp).getTime()).toBeLessThanOrEqual(mockNow)
    }
  })

  it('every notification is within 3 days of the frozen clock', () => {
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000
    for (const n of MOCK_NOTIFICATIONS) {
      expect(mockNow - new Date(n.timestamp).getTime()).toBeLessThan(threeDaysMs)
    }
  })
})
