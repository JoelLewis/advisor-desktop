import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { households } from '@/mocks/data/households'

const clientIds = new Set(clients.map((c) => c.id))
const householdIds = new Set(households.map((h) => h.id))
const validModelIds = new Set([
  'mod-001',
  'mod-002',
  'mod-003',
  'mod-004',
  'mod-005',
  'mod-006',
  'mod-007',
])

describe('Account Invariants', () => {
  it('has exactly 40 accounts', () => {
    expect(accounts).toHaveLength(40)
  })

  describe('Tax treatment mapping', () => {
    const taxDeferredTypes = ['traditional_ira', 'sep_ira'] as const
    const taxFreeTypes = ['roth_ira', '529'] as const
    const taxableTypes = [
      'individual',
      'trust_revocable',
      'trust_irrevocable',
    ] as const

    it.each(
      accounts
        .filter((a) =>
          (taxDeferredTypes as readonly string[]).includes(a.type),
        )
        .map((a) => [a.id, a.type, a]),
    )(
      '%s (%s): tax-deferred account types have tax_deferred treatment',
      (_id, _type, account) => {
        expect(account.taxTreatment).toBe('tax_deferred')
      },
    )

    it.each(
      accounts
        .filter((a) => (taxFreeTypes as readonly string[]).includes(a.type))
        .map((a) => [a.id, a.type, a]),
    )(
      '%s (%s): tax-free account types have tax_free treatment',
      (_id, _type, account) => {
        expect(account.taxTreatment).toBe('tax_free')
      },
    )

    it.each(
      accounts
        .filter((a) => (taxableTypes as readonly string[]).includes(a.type))
        .map((a) => [a.id, a.type, a]),
    )(
      '%s (%s): taxable account types have taxable treatment',
      (_id, _type, account) => {
        expect(account.taxTreatment).toBe('taxable')
      },
    )
  })

  describe('Referential integrity', () => {
    it.each(accounts.map((a) => [a.id, a.clientId]))(
      '%s: clientId %s references a valid client',
      (_id, clientId) => {
        expect(clientIds.has(clientId)).toBe(true)
      },
    )

    it.each(accounts.map((a) => [a.id, a.householdId]))(
      '%s: householdId %s references a valid household',
      (_id, householdId) => {
        expect(householdIds.has(householdId)).toBe(true)
      },
    )

    it('all account numbers are unique', () => {
      const numbers = accounts.map((a) => a.accountNumber)
      expect(new Set(numbers).size).toBe(numbers.length)
    })

    it('all account IDs are unique', () => {
      const ids = accounts.map((a) => a.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it.each(accounts.map((a) => [a.id, a.modelId]))(
      '%s: modelId %s is a valid model (mod-001 through mod-007)',
      (_id, modelId) => {
        expect(validModelIds.has(modelId)).toBe(true)
      },
    )
  })

  describe('UMA accounts', () => {
    const umaAccounts = accounts.filter((a) => a.isUMA)

    it('UMA accounts have sleeves defined', () => {
      for (const account of umaAccounts) {
        expect(account.sleeves).toBeDefined()
        expect(account.sleeves!.length).toBeGreaterThan(0)
      }
    })

    it.each(umaAccounts.map((a) => [a.id, a.name, a]))(
      '%s (%s): sleeve target allocations sum to approximately 1.0',
      (_id, _name, account) => {
        const sum = account.sleeves!.reduce(
          (total, s) => total + s.targetAllocation,
          0,
        )
        expect(Math.abs(sum - 1.0)).toBeLessThan(0.01)
      },
    )
  })

  describe('Non-UMA accounts', () => {
    it('non-UMA accounts do not have sleeves', () => {
      const nonUma = accounts.filter((a) => !a.isUMA)
      for (const account of nonUma) {
        expect(account.sleeves).toBeUndefined()
      }
    })
  })
})
