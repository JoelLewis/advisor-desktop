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
  it('a trust keeps its full legal name, revocable or irrevocable', () => {
    expect(accountDisplayName({ name: 'Chen Family Irrevocable Trust', type: 'trust_irrevocable', accountNumber: 'TRU-880182' })).toBe('Chen Family Irrevocable Trust (…0182)')
    expect(accountDisplayName({ name: 'Smith Family Revocable Trust', type: 'trust_revocable', accountNumber: 'TRU-880555' })).toBe('Smith Family Revocable Trust (…0555)')
  })
  it('every account in the book has a display name', () => {
    for (const a of accounts) expect(accountDisplayName(a), a.id).toMatch(/ \(…\d{4}\)$/)
  })
  it('refuses a number without four digits', () => {
    expect(() => accountDisplayName({ name: 'X', type: 'individual', accountNumber: 'BRK-12' })).toThrow('BRK-12 has no last four digits')
  })
})
