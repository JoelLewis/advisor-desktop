import { describe, it, expect } from 'vitest'
import { isExternalRole } from '@/lib/external-party'

describe('isExternalRole', () => {
  it.each([['client', true], ['prospect', true], ['advisor', false], ['csa', false], ['analyst', false], ['compliance', false]] as const)(
    '%s → %s', (role, expected) => expect(isExternalRole(role)).toBe(expected))
})
