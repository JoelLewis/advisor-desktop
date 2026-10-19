import { describe, it, expect } from 'vitest'
import { roundTo, notFound } from '../utils'

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
