import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatPercent, formatDate, formatTime } from '../utils'

describe('formatCurrency', () => {
  it('formats standard values with $ and commas', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats negative values', () => {
    expect(formatCurrency(-500.1)).toBe('-$500.10')
  })

  it('formats large values in standard mode', () => {
    expect(formatCurrency(1_234_567.89)).toBe('$1,234,567.89')
  })

  it('compact: formats billions', () => {
    expect(formatCurrency(2_500_000_000, true)).toBe('$2.5B')
  })

  it('compact: formats millions', () => {
    expect(formatCurrency(1_200_000, true)).toBe('$1.2M')
  })

  it('compact: formats thousands', () => {
    expect(formatCurrency(5_000, true)).toBe('$5K')
  })

  it('compact: small values fall through to standard', () => {
    expect(formatCurrency(999, true)).toBe('$999.00')
  })
})

describe('formatPercent', () => {
  it('adds + prefix to positive values', () => {
    expect(formatPercent(5.25)).toBe('+5.25%')
  })

  it('keeps - prefix on negative values', () => {
    expect(formatPercent(-3.1)).toBe('-3.10%')
  })

  it('adds + to zero', () => {
    expect(formatPercent(0)).toBe('+0.00%')
  })

  it('respects decimal parameter', () => {
    expect(formatPercent(5.2567, 1)).toBe('+5.3%')
  })
})

describe('formatDate', () => {
  it('formats ISO string to readable date', () => {
    const result = formatDate('2024-01-15T12:00:00Z')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('accepts Date object', () => {
    const result = formatDate(new Date(2024, 5, 20))
    expect(result).toContain('Jun')
    expect(result).toContain('20')
  })
})

describe('formatTime', () => {
  it('formats time with AM/PM', () => {
    const result = formatTime('2024-01-15T14:30:00Z')
    // Time depends on local timezone, just verify it contains AM or PM
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i)
  })
})

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('deduplicates conflicting Tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null)).toBe('base')
  })
})
