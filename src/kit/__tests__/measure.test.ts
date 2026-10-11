import { describe, it, expect } from 'vitest'
import {
  MINUS, normaliseMinus, isNegative, fmtMoney, fmtResult, fmtPrice, fmtWeight, fmtReturn, fmtDrift,
  fmtTolerance, fmtQuantity, splitFraction, fmtDays, fmtScore, fmtDate, fmtTimestamp, clientMoney,
  clientPercent, clientDate,
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
})
