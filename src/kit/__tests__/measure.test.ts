import { describe, it, expect } from 'vitest'
import {
  MINUS, MeasureError, isNegative, fmtMoney, fmtResult, fmtPrice, fmtWeight, fmtReturn, fmtDrift,
  fmtTolerance, fmtQuantity, splitFraction, fmtDays, fmtScore, fmtDate, fmtEasternStamp, fmtUtcStamp, clientMoney,
  clientPercent, clientWholePercent, clientDate, fmtEasternTime, fmtEasternDayTime, fmtEasternRange, fmtEasternWindow, clientRate, fmtDayMonthYear,
  fmtYear, fmtAsOf, isCalendarDate, driftChange, fmtEasternDay, fmtWaited,
} from '@/kit/measure'

describe('measure', () => {
  it('money is whole dollars with a true minus', () => {
    expect(fmtMoney(4_500_000)).toBe('4,500,000')
    expect(fmtMoney(-2954.4)).toBe(`${MINUS}2,954`)
  })
  it('results are always signed', () => {
    expect(fmtResult(69_411)).toBe('+69,411')
    expect(fmtResult(-45_850)).toBe(`${MINUS}45,850`)
    expect(fmtResult(0)).toBe('0')
  })
  it('never prints a negative zero', () => {
    expect(fmtResult(-0.4)).toBe('0')
    expect(fmtMoney(-0.4)).toBe('0')
    expect(fmtDrift(-0.0004)).toBe('0.0')
    expect(fmtReturn(-0.0004)).toBe('0.0')
  })
  it('prices, weights, returns, drift, tolerance', () => {
    expect(fmtPrice(520.3)).toBe('520.30')
    expect(fmtWeight(0.4486)).toBe('44.9')
    expect(fmtReturn(0.214)).toBe('+21.4')
    expect(fmtReturn(-0.187)).toBe(`${MINUS}18.7`)
    expect(fmtDrift(0.1322)).toBe('+13.2')
    expect(fmtDrift(-0.074)).toBe(`${MINUS}7.4`)
    expect(fmtTolerance(0.05)).toBe('±5.0')
  })
  it('quantities keep custodian fractions to 3 dp and split for display', () => {
    expect(fmtQuantity(7000)).toBe('7,000')
    expect(fmtQuantity(1515.331804)).toBe('1,515.332')
    expect(splitFraction('1,515.332')).toEqual({ whole: '1,515', fraction: '.332' })
    expect(splitFraction('7,000')).toEqual({ whole: '7,000', fraction: '' })
  })
  it('days, scores, dates, timestamps', () => {
    expect(fmtDays(26)).toBe('26')
    expect(fmtScore(0.92)).toBe('92')
    expect(fmtDate('2026-03-23')).toBe('2026-03-23')
    expect(fmtDate('2026-02-25T12:00:00Z')).toBe('2026-02-25')
  })
  it('client copy is plain language', () => {
    expect(clientMoney(45_850)).toBe('$45,850')
    expect(clientMoney(-45_850)).toBe(`${MINUS}$45,850`)
    expect(clientPercent(0.682)).toBe('68.2%')
    expect(clientWholePercent(0.952)).toBe('95%')
    expect(clientWholePercent(0.75)).toBe('75%')
    expect(clientDate('2026-03-27')).toBe('March 27, 2026')
  })
  it('detects negatives', () => {
    expect(isNegative(`${MINUS}45,850`)).toBe(true)
    expect(isNegative('+69,411')).toBe(false)
  })

  describe('rounds the decimal value, not the binary one', () => {
    it('half-way cases round up in magnitude', () => {
      expect(fmtPrice(1.005)).toBe('1.01')
      expect(fmtPrice(2.675)).toBe('2.68')
      expect(fmtQuantity(0.0045)).toBe('0.005')
      expect(fmtReturn(0.0705)).toBe('+7.1')
    })
    it('negative mirrors round the same way', () => {
      expect(fmtPrice(-1.005)).toBe(`${MINUS}1.01`)
      expect(fmtPrice(-2.675)).toBe(`${MINUS}2.68`)
      expect(fmtQuantity(-0.0045)).toBe(`${MINUS}0.005`)
      expect(fmtReturn(-0.0705)).toBe(`${MINUS}7.1`)
    })
  })

  describe('negative zero', () => {
    const formatters: ReadonlyArray<readonly [string, (v: number) => string]> = [
      ['fmtMoney', fmtMoney],
      ['fmtResult', fmtResult],
      ['fmtPrice', fmtPrice],
      ['fmtWeight', (v) => fmtWeight(v)],
      ['fmtReturn', (v) => fmtReturn(v)],
      ['fmtDrift', (v) => fmtDrift(v)],
      ['fmtTolerance', (v) => fmtTolerance(v)],
      ['fmtQuantity', fmtQuantity],
      ['fmtDays', fmtDays],
      ['fmtScore', (v) => fmtScore(v)],
      ['clientMoney', clientMoney],
      ['clientPercent', (v) => clientPercent(v)],
      ['clientWholePercent', (v) => clientWholePercent(v)],
    ]
    it.each(formatters)('%s never prints a minus for a value that rounds to zero', (_name, fmt) => {
      for (const v of [-0, -0.0004]) {
        expect(fmt(v).startsWith(MINUS)).toBe(false)
      }
    })
    it.each(formatters.filter(([name]) => ['fmtMoney', 'fmtResult', 'fmtDays', 'clientMoney'].includes(name)))(
      '%s never prints a minus for -0.4 at whole-unit precision',
      (_name, fmt) => {
        expect(fmt(-0.4).startsWith(MINUS)).toBe(false)
      },
    )
    it('fmtWeight shows a negative weight rather than hiding it', () => {
      expect(fmtWeight(-0.015)).toBe(`${MINUS}1.5`)
    })
  })

  describe('MeasureError', () => {
    it.each([NaN, Infinity, -Infinity, 'garbage' as unknown as number])('number formatter throws for %s', (v) => {
      expect(() => fmtMoney(v)).toThrow(MeasureError)
      expect(() => clientMoney(v)).toThrow(MeasureError)
    })
    it.each(['garbage', '2026-03-23T12:00:00', '2026-02-30'])('date formatter throws for %s', (iso) => {
      expect(() => fmtDate(iso)).toThrow(MeasureError)
      expect(() => fmtUtcStamp(iso)).toThrow(MeasureError)
      expect(() => clientDate(iso)).toThrow(MeasureError)
    })
    it('carries the error name', () => {
      expect(new MeasureError('x').name).toBe('MeasureError')
    })
  })

  describe('time zones', () => {
    it('converts an offset datetime to UTC', () => {
      expect(fmtUtcStamp('2026-02-25T07:00:00-05:00')).toBe('2026-02-25 12:00 UTC')
    })
  })
  it('reads a time in Eastern Time, 24-hour, and a range with its zone', () => {
    expect(fmtEasternTime('2026-02-25T19:00:00.000Z')).toBe('14:00')
    expect(fmtEasternTime('2026-02-25T14:00:00-05:00')).toBe('14:00')
    expect(fmtEasternTime('2026-02-25T05:05:00Z')).toBe('00:05')
    expect(fmtEasternRange('2026-02-25T19:00:00.000Z', '2026-02-25T20:15:00.000Z')).toBe('14:00–15:15\u00a0ET')
    expect(() => fmtEasternTime('2026-02-25T14:00:00')).toThrow(MeasureError)
  })
})

describe('fmtEasternStamp', () => {
  it('states the New York day and time with the zone', () => {
    expect(fmtEasternStamp('2026-02-25T12:00:00Z')).toBe('25 Feb 07:00\u00a0ET')
    expect(fmtEasternStamp('2026-02-25T19:00:00.000Z')).toBe('25 Feb 14:00\u00a0ET')
    expect(fmtEasternStamp('2026-03-02T15:00:00-05:00')).toBe('2 Mar 15:00\u00a0ET')
  })
  it('takes the New York date across UTC midnight', () => {
    expect(fmtEasternStamp('2026-02-26T03:30:00Z')).toBe('25 Feb 22:30\u00a0ET')
  })
  it('follows daylight saving time both ways', () => {
    expect(fmtEasternStamp('2026-03-08T06:30:00Z')).toBe('8 Mar 01:30\u00a0ET')
    expect(fmtEasternStamp('2026-03-08T07:30:00Z')).toBe('8 Mar 03:30\u00a0ET')
    expect(fmtEasternStamp('2026-11-01T05:30:00Z')).toBe('1 Nov 01:30\u00a0ET')
    expect(fmtEasternStamp('2026-11-01T06:30:00Z')).toBe('1 Nov 01:30\u00a0ET')
  })
  it('drops the date on the New York day it is compared with, and only then', () => {
    expect(fmtEasternStamp('2026-02-25T19:00:00Z', '2026-02-25T12:00:00Z')).toBe('14:00\u00a0ET')
    expect(fmtEasternStamp('2026-02-26T03:30:00Z', '2026-02-25T12:00:00Z')).toBe('22:30\u00a0ET')
    expect(fmtEasternStamp('2026-02-25T19:00:00Z', '2026-02-26T14:10:00Z')).toBe('25 Feb 14:00\u00a0ET')
  })
  it('refuses a time with no offset', () => {
    expect(() => fmtEasternStamp('2026-02-25T12:00:00')).toThrow(MeasureError)
  })
  it('refuses a calendar date, which has no time to state', () => {
    expect(() => fmtEasternStamp('2025-12-01')).toThrow(MeasureError)
    expect(() => fmtEasternTime('2025-12-01')).toThrow(MeasureError)
    expect(() => fmtEasternDayTime('2025-12-01')).toThrow(MeasureError)
    expect(() => fmtEasternWindow('2025-12-01', '2025-12-01')).toThrow(MeasureError)
  })
})

describe('date-only facts', () => {
  const ZONES = ['America/Los_Angeles', 'America/New_York', 'UTC', 'Europe/London', 'Asia/Tokyo', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']
  const withZone = (zone: string, check: () => void) => {
    const saved = process.env.TZ
    process.env.TZ = zone
    try {
      check()
    } finally {
      if (saved === undefined) delete process.env.TZ
      else process.env.TZ = saved
    }
  }
  it('knows a calendar date from a moment', () => {
    expect(isCalendarDate('2025-12-01')).toBe(true)
    expect(isCalendarDate('2025-12-01T00:00:00Z')).toBe(false)
  })
  it('says 2025-12-01 as 1 Dec 2025 in every machine zone', () => {
    const offsets = new Set<number>()
    for (const zone of ZONES) {
      withZone(zone, () => {
        offsets.add(new Date('2025-12-01T00:00:00Z').getTimezoneOffset())
        expect(fmtDayMonthYear('2025-12-01'), zone).toBe('1 Dec 2025')
        expect(fmtAsOf('2025-12-01'), zone).toBe('1 Dec 2025')
      })
    }
    expect(offsets.size, 'the machine zone really changed between checks').toBe(ZONES.length - 1)
  })
  it('says a moment as its ET stamp, and its day as the New York day', () => {
    expect(fmtAsOf('2026-02-25T12:00:00Z')).toBe('25 Feb 07:00\u00a0ET')
    expect(fmtDayMonthYear('2026-02-26T03:30:00Z')).toBe('25 Feb 2026')
    expect(fmtDayMonthYear('2026-02-25T19:00:00.000Z')).toBe('25 Feb 2026')
  })
})

describe('fmtUtcStamp', () => {
  it('is the books-and-records time, labeled UTC', () => {
    expect(fmtUtcStamp('2026-02-25T07:00:00-05:00')).toBe('2026-02-25 12:00 UTC')
  })
})

describe('prospect-proposal formats', () => {
  it('states a fee rate to two places and a price date as the proposal says it', () => {
    expect(clientRate(20_850 / 2_100_000)).toBe('0.99%')
    expect(fmtDayMonthYear('2026-02-25')).toBe('25 Feb 2026')
  })
  it('abbreviates every month to three letters, September included', () => {
    expect(fmtDayMonthYear('2025-09-30')).toBe('30 Sep 2025')
    expect(fmtDayMonthYear('2026-12-01')).toBe('1 Dec 2026')
  })
})

describe('fmtEasternDayTime', () => {
  it('states a jump as the control names it', () => {
    expect(fmtEasternDayTime('2026-02-26T14:10:00.000Z')).toBe('Thu 26 Feb 09:10\u00a0ET')
    expect(fmtEasternDayTime('2026-03-02T15:00:00.000Z')).toBe('Mon 2 Mar 10:00\u00a0ET')
  })
  it('names the New York day, three-letter weekday and month', () => {
    expect(fmtEasternDayTime('2025-09-30T14:00:00.000Z')).toBe('Tue 30 Sep 10:00\u00a0ET')
    expect(fmtEasternDayTime('2026-03-03T03:30:00.000Z')).toBe('Mon 2 Mar 22:30\u00a0ET')
  })
})

describe('the kit formats dates without a regional locale', () => {
  it('no formatter in the kit uses en-GB', async () => {
    const { readFileSync } = await import('node:fs')
    expect(readFileSync('src/kit/measure.ts', 'utf8')).not.toContain("'en-GB'")
  })
})

describe("no source formats or dates in the host's locale or time zone", () => {
  /** A locale-less `toLocale…String()`, an `Intl` formatter given no locale, or a local-time date getter or setter. */
  const HOST_DEPENDENT = /\.toLocale(?:Date|Time)?String\(\s*\)|new Intl\.\w+\(\s*(?:undefined\b|\))|\.(?:get|set)(?:FullYear|Month|Date|Day|Hours|Minutes)\(/g
  it('every file under src, the engine included, names its locale and reads dates in UTC', async () => {
    const { readFileSync } = await import('node:fs')
    const { listSourceFiles } = await import('@/__tests__/guardrails/detectors')
    const files = listSourceFiles('src')
    expect(files.length).toBeGreaterThan(200)
    const found = files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(HOST_DEPENDENT)].map((m) => `${f}: ${m[0]}`))
    expect(found).toEqual([])
  })
  it('the pattern catches what it names', () => {
    for (const bad of ['n.toLocaleString()', 'd.toLocaleDateString( )', 'new Intl.NumberFormat()', 'new Intl.DateTimeFormat(undefined, {})', 'd.setDate(1)', 'd.getMonth()']) {
      expect(bad.match(HOST_DEPENDENT), bad).not.toBeNull()
    }
    for (const good of ["n.toLocaleString('en-US')", "new Intl.NumberFormat('en-US')", 'd.setUTCDate(1)', 'd.getUTCMonth()']) expect(good.match(HOST_DEPENDENT), good).toBeNull()
  })
})

describe('fmtEasternWindow', () => {
  it('drops the date on the compared day, states it otherwise', () => {
    expect(fmtEasternWindow('2026-02-25T19:00:00.000Z', '2026-02-25T20:15:00.000Z', '2026-02-25T12:00:00Z')).toBe('14:00–15:15\u00a0ET')
    expect(fmtEasternWindow('2026-02-25T19:00:00.000Z', '2026-02-25T20:15:00.000Z', '2026-02-26T14:10:00Z')).toBe('25 Feb 14:00–15:15\u00a0ET')
  })
})
describe('driftChange', () => {
  it('is the change between the drifts as fmtDrift shows them', () => {
    expect(fmtDrift(driftChange(-0.07449, -0.05351))).toBe('+2.0')
    expect(fmtDrift(-0.05351 - -0.07449), 'the unrounded change, which disagrees with the figures').toBe('+2.1')
  })
  it('rounds each side half away from zero first, as the figures do', () => {
    expect([fmtDrift(-0.07405), fmtDrift(-0.05355)]).toEqual(['−7.4', '−5.4'])
    expect(fmtDrift(driftChange(-0.07405, -0.05355))).toBe('+2.0')
    expect(fmtDrift(driftChange(0.0125, 0.0105))).toBe('−0.2')
    expect(driftChange(0.132, 0.012)).toBe(-0.12)
    expect(driftChange(0.0004, -0.0004)).toBe(0)
  })
})

describe('fmtEasternDay', () => {
  it("names a moment's New York day with its weekday", () => {
    expect(fmtEasternDay('2026-02-26T14:10:00.000Z')).toBe('Thu 26 Feb')
    expect(fmtEasternDay('2026-02-26T03:30:00.000Z')).toBe('Wed 25 Feb')
  })
})

describe('fmtYear', () => {
  it('writes a calendar year with no separator, and refuses anything else', () => {
    expect(fmtYear(2031)).toBe('2031')
    expect(() => fmtYear(2031.5)).toThrow('not a calendar year: 2031.5')
    expect(() => fmtYear(31)).toThrow('not a calendar year: 31')
  })
})

describe('fmtWaited', () => {
  it('says how long, in the largest whole unit', () => {
    expect(fmtWaited('2026-02-25T12:01:00Z', '2026-02-25T12:46:00Z')).toBe('45 min')
    expect(fmtWaited('2026-02-25T12:01:00Z', '2026-02-25T20:30:00Z')).toBe('8h')
    expect(fmtWaited('2026-02-25T12:01:00Z', '2026-02-27T12:30:00Z')).toBe('2d')
    expect(fmtWaited('2026-02-25T12:01:00Z', '2026-02-25T12:01:00Z')).toBe('0 min')
  })
  it('refuses a wait that ends before it starts, and a bare date', () => {
    expect(() => fmtWaited('2026-02-25T13:00:00Z', '2026-02-25T12:00:00Z')).toThrow('2026-02-25T13:00:00Z is after 2026-02-25T12:00:00Z')
    expect(() => fmtWaited('2026-02-25', '2026-02-25T12:00:00Z')).toThrow(MeasureError)
  })
})
