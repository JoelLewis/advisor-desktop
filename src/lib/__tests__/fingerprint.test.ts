import { it, expect } from 'vitest'
import { fingerprint } from '@/lib/fingerprint'

it('is deterministic, 8 hex chars, and sensitive to content', () => {
  expect(fingerprint('abc')).toMatch(/^[0-9A-F]{8}$/)
  expect(fingerprint('abc')).toBe(fingerprint('abc'))
  expect(fingerprint('abc')).not.toBe(fingerprint('abd'))
})
