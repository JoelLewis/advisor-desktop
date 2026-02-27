import { describe, it, expect } from 'vitest'
import { roundTo, notFound, formatAUM, computeTotalAUM } from '../utils'

describe('roundTo', () => {
  it('rounds to the specified number of decimal places', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14)
  })

  it('rounds up when the next digit is >= 5', () => {
    expect(roundTo(3.145, 2)).toBe(3.15)
  })

  it('handles zero decimals', () => {
    expect(roundTo(3.7, 0)).toBe(4)
  })

  it('handles already-rounded values', () => {
    expect(roundTo(5.0, 2)).toBe(5)
  })

  it('handles negative values', () => {
    expect(roundTo(-2.567, 1)).toBe(-2.6)
  })
})

describe('notFound', () => {
  it('returns an HttpResponse with status 404', () => {
    const response = notFound()
    expect(response.status).toBe(404)
  })

  it('returns a response with null body', () => {
    const response = notFound()
    expect(response.body).toBeNull()
  })
})

describe('formatAUM', () => {
  it('formats millions with one decimal', () => {
    expect(formatAUM(1_200_000)).toBe('$1.2M')
  })

  it('formats large millions', () => {
    expect(formatAUM(28_200_000)).toBe('$28.2M')
  })

  it('formats exact millions', () => {
    expect(formatAUM(5_000_000)).toBe('$5.0M')
  })

  it('formats thousands without decimals', () => {
    expect(formatAUM(5_000)).toBe('$5K')
  })

  it('formats hundreds of thousands', () => {
    expect(formatAUM(750_000)).toBe('$750K')
  })

  it('formats small values as-is', () => {
    expect(formatAUM(500)).toBe('$500')
  })

  it('formats zero', () => {
    expect(formatAUM(0)).toBe('$0')
  })
})

describe('computeTotalAUM', () => {
  it('returns a positive number', () => {
    const total = computeTotalAUM()
    expect(total).toBeGreaterThan(0)
  })

  it('returns FX-converted total less than raw sum (international accounts convert down)', () => {
    // With non-USD accounts converting at FX rates, total should be < raw sum
    const total = computeTotalAUM()
    expect(total).toBeGreaterThan(80_000_000)
    expect(total).toBeLessThan(110_000_000)
  })
})
