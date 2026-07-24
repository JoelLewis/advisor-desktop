import { describe, it, expect } from 'vitest'
import { formatDateLabel, addDays } from '../SchedulePanel'
import { MOCK_TODAY_ISO } from '@/lib/clock'

// Regression test for fix round 1: formatDateLabel previously parsed its date-only string as
// LOCAL time (`new Date(dateStr + 'T00:00:00')`) while comparing it against startOfToday()'s
// UTC midnight. Outside UTC, those two instants never lined up, so "Today" could silently fail
// to render even for the frozen clock's own date. The fix parses/compares everything as UTC, so
// the assertions below hold no matter what timezone the test runner's process is in — they do
// not depend on (and do not need to fake) process.env.TZ.
describe('SchedulePanel date-label helpers (timezone-independent)', () => {
  it('labels the frozen MOCK_TODAY_ISO date as "Today"', () => {
    expect(formatDateLabel(MOCK_TODAY_ISO)).toBe('Today')
  })

  it('labels the day after MOCK_TODAY_ISO as "Tomorrow"', () => {
    expect(formatDateLabel(addDays(MOCK_TODAY_ISO, 1))).toBe('Tomorrow')
  })

  it('labels a date more than a day out with a weekday/month/day string, not Today/Tomorrow', () => {
    const label = formatDateLabel(addDays(MOCK_TODAY_ISO, 5))
    expect(label).not.toBe('Today')
    expect(label).not.toBe('Tomorrow')
    expect(label).toMatch(/\w+, \w+ \d{1,2}/)
  })

  it('addDays never shifts by a calendar day due to local timezone offset', () => {
    expect(addDays(MOCK_TODAY_ISO, 1)).toBe('2026-02-26')
    expect(addDays(MOCK_TODAY_ISO, -1)).toBe('2026-02-24')
    expect(addDays(MOCK_TODAY_ISO, 0)).toBe(MOCK_TODAY_ISO)
  })
})
