import { describe, it, expect } from 'vitest'
import {
  MINUS, MeasureError, normaliseMinus, isNegative, fmtMoney, fmtResult, fmtPrice, fmtWeight, fmtReturn, fmtDrift,
  fmtTolerance, fmtQuantity, splitFraction, fmtDays, fmtScore, fmtDate, fmtTimestamp, clientMoney,
  clientPercent, clientDate, fmtEasternTime, fmtEasternDayTime, fmtEasternRange, clientRate, fmtDayMonthYear,
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
    expect(fmtTimestamp('2026-02-25T12:00:00Z')).toBe('2026-02-25 12:00 UTC')
  })
  it('client copy is plain language', () => {
    expect(clientMoney(45_850)).toBe('$45,850')
    expect(clientMoney(-45_850)).toBe(`${MINUS}$45,850`)
    expect(clientPercent(0.682)).toBe('68.2%')
    expect(clientDate('2026-03-27')).toBe('March 27, 2026')
  })
  it('normalises engine hyphen-minus and detects negatives', () => {
    expect(normaliseMinus('cash would be -1.5%')).toBe(`cash would be ${MINUS}1.5%`)
    expect(normaliseMinus('2026-03-23')).toBe('2026-03-23')
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

  describe('normaliseMinus leaves non-negative hyphens alone', () => {
    it.each(['3-5', 'acc-002', '2026-03-23'])('%s is unchanged', (s) => {
      expect(normaliseMinus(s)).toBe(s)
    })
  })

  describe('MeasureError', () => {
    it.each([NaN, Infinity, -Infinity, 'garbage' as unknown as number])('number formatter throws for %s', (v) => {
      expect(() => fmtMoney(v)).toThrow(MeasureError)
      expect(() => clientMoney(v)).toThrow(MeasureError)
    })
    it.each(['garbage', '2026-03-23T12:00:00', '2026-02-30'])('date formatter throws for %s', (iso) => {
      expect(() => fmtDate(iso)).toThrow(MeasureError)
      expect(() => fmtTimestamp(iso)).toThrow(MeasureError)
      expect(() => clientDate(iso)).toThrow(MeasureError)
    })
    it('carries the error name', () => {
      expect(new MeasureError('x').name).toBe('MeasureError')
    })
  })

  describe('time zones', () => {
    it('converts an offset datetime to UTC', () => {
      expect(fmtTimestamp('2026-02-25T07:00:00-05:00')).toBe('2026-02-25 12:00 UTC')
    })
  })
  it('reads a time in Eastern Time, 24-hour, and a range with its zone', () => {
    expect(fmtEasternTime('2026-02-25T19:00:00.000Z')).toBe('14:00')
    expect(fmtEasternTime('2026-02-25T14:00:00-05:00')).toBe('14:00')
    expect(fmtEasternTime('2026-02-25T05:05:00Z')).toBe('00:05')
    expect(fmtEasternRange('2026-02-25T19:00:00.000Z', '2026-02-25T20:15:00.000Z')).toBe('14:00–15:15 ET')
    expect(() => fmtEasternTime('2026-02-25T14:00:00')).toThrow(MeasureError)
  })
})

describe('prospect-proposal formats', () => {
  it('states a fee rate to two places and a price date as the proposal says it', () => {
    expect(clientRate(20_850 / 2_100_000)).toBe('0.99%')
    expect(fmtDayMonthYear('2026-02-25')).toBe('25 Feb 2026')
  })
})

describe('fmtEasternDayTime', () => {
  it('states a jump as the control names it', () => {
    expect(fmtEasternDayTime('2026-02-26T14:10:00.000Z')).toBe('Thu 26 Feb 09:10 ET')
    expect(fmtEasternDayTime('2026-03-02T15:00:00.000Z')).toBe('Mon 2 Mar 10:00 ET')
  })
})
