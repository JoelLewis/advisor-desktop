import { describe, it, expect } from 'vitest'
import { yieldToMaturity, priceFromYield, modifiedDuration, yearsToMaturity } from '@/lib/bond-math'

describe('yearsToMaturity', () => {
  it('measures from the frozen clock, not the live system clock', () => {
    expect(yearsToMaturity('2028-02-28', '2026-02-25')).toBeCloseTo(2.01, 2)
  })

  it('matches every fixture maturity date at MOCK_TODAY_ISO', () => {
    const fixtures: [string, number][] = [
      ['2028-02-28', 2.01], ['2031-02-15', 4.97], ['2036-02-15', 9.97], ['2056-02-15', 29.97],
      ['2030-06-20', 4.31], ['2031-08-08', 5.45], ['2029-10-01', 3.60], ['2028-07-08', 2.37],
      ['2032-10-01', 6.60], ['2030-03-15', 4.05], ['2033-08-01', 7.43], ['2028-09-12', 2.55],
    ]
    for (const [maturityDate, expected] of fixtures) {
      expect(yearsToMaturity(maturityDate, '2026-02-25')).toBeCloseTo(expected, 2)
    }
  })
})

describe('price / yield inversion', () => {
  it('round-trips: price(ytm(p)) === p', () => {
    const p = 97.5
    expect(priceFromYield(yieldToMaturity(p, 3.85, 2.37), 3.85, 2.37)).toBeCloseTo(p, 4)
  })

  it('C19: a bond below par must yield more than its coupon (UST-2Y)', () => {
    // UST-2Y: price 99.45, coupon 4.625%, 2.01 years. The fixture stated 4.35%.
    const ytm = yieldToMaturity(99.45, 4.625, 2.01)
    expect(ytm).toBeGreaterThan(4.625)
    expect(ytm).toBeCloseTo(4.92, 2)
  })

  it('C20: a bond above par must yield less than its coupon (CA-GO-32)', () => {
    // CA-GO-32: price 105.25, coupon 5.00%, 6.60 years. The fixture stated 3.25%.
    const ytm = yieldToMaturity(105.25, 5.0, 6.6)
    expect(ytm).toBeLessThan(5.0)
    expect(ytm).toBeCloseTo(4.07, 2)
  })

  it('prices at par when yield equals coupon', () => {
    expect(priceFromYield(4.0, 4.0, 10)).toBeCloseTo(100, 6)
  })

  it('a higher yield always produces a lower price, holding coupon and maturity fixed', () => {
    const lowYieldPrice = priceFromYield(3.0, 4.0, 10)
    const highYieldPrice = priceFromYield(5.0, 4.0, 10)
    expect(highYieldPrice).toBeLessThan(lowYieldPrice)
  })

  it('yields more than coupon whenever price is below par, and less whenever above, across every fixture bond', () => {
    const bonds: [number, number, number][] = [
      [99.45, 4.625, 2.01], [97.88, 4.250, 4.97], [95.25, 4.000, 9.97], [88.50, 4.375, 29.97],
      [94.75, 3.000, 4.31], [91.20, 2.400, 5.45], [98.80, 4.250, 3.60], [97.50, 3.850, 2.37],
      [105.25, 5.000, 6.60], [102.75, 4.500, 4.05], [103.50, 4.750, 7.43], [96.80, 3.500, 2.55],
    ]
    for (const [price, coupon, years] of bonds) {
      const ytm = yieldToMaturity(price, coupon, years)
      if (price < 100) expect(ytm).toBeGreaterThan(coupon)
      if (price > 100) expect(ytm).toBeLessThan(coupon)
    }
  })
})

describe('modifiedDuration', () => {
  it('UST-10Y at a 4.60% yield has a modified duration of about 8.08 years', () => {
    expect(modifiedDuration(4.60, 4.0, 9.97)).toBeCloseTo(8.08, 1)
  })

  it('is a positive number of years', () => {
    expect(modifiedDuration(4.5, 4.0, 10)).toBeGreaterThan(0)
  })

  it('rises with maturity, holding coupon and yield fixed', () => {
    expect(modifiedDuration(4.5, 4.0, 30)).toBeGreaterThan(modifiedDuration(4.5, 4.0, 2))
  })

  it('rises as coupon falls, holding maturity and yield fixed', () => {
    expect(modifiedDuration(4.5, 2.0, 10)).toBeGreaterThan(modifiedDuration(4.5, 6.0, 10))
  })

  it('is always less than years to maturity (a coupon-bearing bond pays back before the horizon)', () => {
    const years = 9.97
    expect(modifiedDuration(4.6, 4.0, years)).toBeLessThan(years)
  })
})
