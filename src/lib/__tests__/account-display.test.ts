import { describe, it, expect } from 'vitest'
import { accountDisplayName } from '@/lib/account-display'
import { accounts } from '@/mocks/data/accounts'

describe('accountDisplayName', () => {
  it('reads owner · type (…last four)', () => {
    expect(accountDisplayName({ name: 'Robert Johnson Individual', type: 'individual', accountNumber: 'BRK-293847' })).toBe('Robert Johnson · Individual (…3847)')
    expect(accountDisplayName({ name: 'Robert Johnson Traditional IRA', type: 'traditional_ira', accountNumber: 'IRA-339201' })).toBe('Robert Johnson · Traditional IRA (…9201)')
  })
  it('a named account keeps its name', () => {
    expect(accountDisplayName({ name: 'Johnson Family Trust', type: 'trust_revocable', accountNumber: 'TRU-847291' })).toBe('Johnson Family Trust (…7291)')
  })
  it('every account in the book has a display name', () => {
    for (const a of accounts) expect(accountDisplayName(a), a.id).toMatch(/ \(…\d{4}\)$/)
  })
  it('refuses a number without four digits', () => {
    expect(() => accountDisplayName({ name: 'X', type: 'individual', accountNumber: 'BRK-12' })).toThrow('BRK-12 has no last four digits')
  })
})
