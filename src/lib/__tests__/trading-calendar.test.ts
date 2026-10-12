import { describe, it, expect } from 'vitest'
import { isTradingDay, tradingDayOnOrBefore, nyseSessionUtc, isDuringNyseSession } from '@/lib/trading-calendar'

describe('isTradingDay', () => {
  it('is false on weekends', () => {
    expect(isTradingDay('2026-02-21')).toBe(false) // Saturday
    expect(isTradingDay('2026-02-22')).toBe(false) // Sunday
    expect(isTradingDay('2026-02-20')).toBe(true) // Friday
    expect(isTradingDay('2026-02-25')).toBe(true) // Wednesday, the frozen today
  })

  it("is false on NYSE holidays, including Presidents' Day and Good Friday", () => {
    expect(isTradingDay('2026-02-16')).toBe(false) // Presidents' Day
    expect(isTradingDay('2026-04-03')).toBe(false) // Good Friday
    expect(isTradingDay('2025-04-18')).toBe(false) // Good Friday
    expect(isTradingDay('2025-05-26')).toBe(false) // Memorial Day
    expect(isTradingDay('2025-01-09')).toBe(false) // day of mourning for President Carter
    expect(isTradingDay('2026-07-03')).toBe(false) // Independence Day observed
    expect(isTradingDay('2022-06-20')).toBe(false) // Juneteenth observed
    expect(isTradingDay('2025-12-26')).toBe(true) // the day after Christmas trades
  })

  it('reads the UTC date of a timestamp', () => {
    expect(isTradingDay('2026-02-20T15:15:03Z')).toBe(true)
    expect(isTradingDay('2026-02-22T10:30:05Z')).toBe(false)
  })

  it('refuses a date outside the years it covers, or no date at all', () => {
    expect(() => isTradingDay('2021-12-31')).toThrow()
    expect(() => isTradingDay('2027-01-04')).toThrow()
    expect(() => isTradingDay('soon')).toThrow()
  })
})

describe('tradingDayOnOrBefore', () => {
  it('keeps a trading day and rolls a closed day back to the last session before it', () => {
    expect(tradingDayOnOrBefore('2026-02-20')).toBe('2026-02-20')
    expect(tradingDayOnOrBefore('2026-02-21')).toBe('2026-02-20')
    expect(tradingDayOnOrBefore('2025-12-27')).toBe('2025-12-26')
    expect(tradingDayOnOrBefore('2025-05-25')).toBe('2025-05-23') // Sunday before Memorial Day
    expect(tradingDayOnOrBefore('2026-02-16')).toBe('2026-02-13') // Presidents' Day → Friday
    expect(tradingDayOnOrBefore('2025-01-12')).toBe('2025-01-10')
  })
})

describe('the NYSE regular session in UTC', () => {
  it('is 14:30–21:00Z in winter and 13:30–20:00Z once daylight time starts on 2026-03-08', () => {
    expect(nyseSessionUtc('2026-02-20')).toEqual({ open: '2026-02-20T14:30:00.000Z', close: '2026-02-20T21:00:00.000Z' })
    expect(nyseSessionUtc('2026-03-06')).toEqual({ open: '2026-03-06T14:30:00.000Z', close: '2026-03-06T21:00:00.000Z' })
    expect(nyseSessionUtc('2026-03-09')).toEqual({ open: '2026-03-09T13:30:00.000Z', close: '2026-03-09T20:00:00.000Z' })
    expect(nyseSessionUtc('2025-11-03')).toEqual({ open: '2025-11-03T14:30:00.000Z', close: '2025-11-03T21:00:00.000Z' })
    expect(nyseSessionUtc('2025-10-31')).toEqual({ open: '2025-10-31T13:30:00.000Z', close: '2025-10-31T20:00:00.000Z' })
  })

  it('places a fill inside or outside it', () => {
    expect(isDuringNyseSession('2026-02-20T15:15:03Z')).toBe(true) // 10:15 ET
    expect(isDuringNyseSession('2026-02-20T10:15:03Z')).toBe(false) // 5:15 ET
    expect(isDuringNyseSession('2026-02-23T21:00:00Z')).toBe(true) // the 4:00 PM ET close, a fund's NAV
    expect(isDuringNyseSession('2026-02-21T15:15:00Z')).toBe(false) // a Saturday
  })
})
