import { describe, it, expect } from 'vitest'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO, now, todayISO, startOfToday, eventTime } from '@/lib/clock'

describe('clock', () => {
  it('is frozen at 2026-02-25T12:00:00Z', () => {
    expect(MOCK_NOW_ISO).toBe('2026-02-25T12:00:00Z')
    expect(MOCK_TODAY_ISO).toBe('2026-02-25')
    expect(now().toISOString()).toBe('2026-02-25T12:00:00.000Z')
  })

  it('todayISO agrees with now()', () => {
    expect(todayISO()).toBe(now().toISOString().slice(0, 10))
  })

  it('startOfToday is midnight UTC on the same day', () => {
    expect(startOfToday().toISOString()).toBe('2026-02-25T00:00:00.000Z')
    expect(startOfToday().getTime()).toBeLessThan(now().getTime())
  })

  it('returns a fresh Date each call so callers cannot mutate the clock', () => {
    const a = now()
    a.setFullYear(1999)
    expect(now().getUTCFullYear()).toBe(2026)
  })
})

describe('eventTime', () => {
  it('advances one minute per sequence from the frozen now', () => {
    expect(eventTime(0)).toBe('2026-02-25T12:00:00.000Z')
    expect(eventTime(6)).toBe('2026-02-25T12:06:00.000Z')
    expect(eventTime(-30)).toBe('2026-02-25T11:30:00.000Z')
  })
})
