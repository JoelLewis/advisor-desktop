import { describe, it, expect } from 'vitest'
import { easternDayOf } from '@/lib/eastern-day'

describe('easternDayOf', () => {
  it('reads the day in New York, not in UTC', () => {
    expect(easternDayOf('2026-02-25T12:00:00Z')).toBe('2026-02-25')
    expect(easternDayOf('2026-02-26T03:00:00Z')).toBe('2026-02-25')
    expect(easternDayOf('2026-03-09T04:30:00Z')).toBe('2026-03-09')
  })
  it('refuses what is not an instant', () => {
    expect(() => easternDayOf('not a date')).toThrow('Not an ISO instant: not a date')
  })
})
