import { describe, it, expect } from 'vitest'
import { holdingPeriodOn } from '@/lib/holding-period'

describe('holdingPeriodOn (more than one year is long-term)', () => {
  it.each([
    ['2025-02-25', '2026-02-25', 'short'], ['2025-02-25', '2026-02-26', 'long'], ['2016-08-15', '2026-02-25', 'long'], ['2026-01-02', '2026-02-25', 'short'],
  ] as const)('%s held to %s is %s', (acquired, day, expected) => expect(holdingPeriodOn(acquired, day)).toBe(expected))
  it('refuses a date that is not one', () => expect(() => holdingPeriodOn('2026-02-31', '2026-03-05')).toThrow('Not a date: 2026-02-31'))
})
