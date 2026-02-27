import { describe, it, expect } from 'vitest'
import { clients } from '@/mocks/data/clients'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { nbas } from '@/mocks/data/nbas'
import { plans } from '@/mocks/data/planning'

const clientIdSet = new Set(clients.map((c) => c.id))
const accountIdSet = new Set(accounts.map((a) => a.id))
const householdIdSet = new Set(households.map((h) => h.id))

describe('Referential Integrity — Cross-Entity Validation', () => {
  describe('Data counts', () => {
    it('has 20 clients', () => {
      expect(clients).toHaveLength(20)
    })

    it('has 40 accounts', () => {
      expect(accounts).toHaveLength(40)
    })

    it('has 12 households', () => {
      expect(households).toHaveLength(12)
    })

    it('has 20 NBAs', () => {
      expect(nbas).toHaveLength(20)
    })

    it('has 7 financial plans', () => {
      expect(plans).toHaveLength(7)
    })
  })

  describe('ID format conventions', () => {
    it.each(clients.map((c) => c.id))(
      'client ID "%s" matches cli-NNN format',
      (id) => {
        expect(id).toMatch(/^cli-\d{3}$/)
      },
    )

    it.each(accounts.map((a) => a.id))(
      'account ID "%s" matches acc-NNN format',
      (id) => {
        expect(id).toMatch(/^acc-\d{3}$/)
      },
    )

    it.each(households.map((h) => h.id))(
      'household ID "%s" matches hh-NNN format',
      (id) => {
        expect(id).toMatch(/^hh-\d{3}$/)
      },
    )
  })

  describe('No duplicate IDs', () => {
    it('client IDs are unique', () => {
      expect(clientIdSet.size).toBe(clients.length)
    })

    it('account IDs are unique', () => {
      expect(accountIdSet.size).toBe(accounts.length)
    })

    it('household IDs are unique', () => {
      expect(householdIdSet.size).toBe(households.length)
    })
  })

  describe('Client → Household references', () => {
    it.each(clients.map((c) => [c.id, c.householdId]))(
      'client %s: householdId %s is a valid household',
      (_clientId, householdId) => {
        expect(householdIdSet.has(householdId)).toBe(true)
      },
    )
  })

  describe('Account → Client references', () => {
    it.each(accounts.map((a) => [a.id, a.clientId]))(
      'account %s: clientId %s is a valid client',
      (_accountId, clientId) => {
        expect(clientIdSet.has(clientId)).toBe(true)
      },
    )
  })

  describe('Account → Household references', () => {
    it.each(accounts.map((a) => [a.id, a.householdId]))(
      'account %s: householdId %s is a valid household',
      (_accountId, householdId) => {
        expect(householdIdSet.has(householdId)).toBe(true)
      },
    )
  })

  describe('Household → Account references', () => {
    it.each(
      households.flatMap((h) =>
        h.accountIds.map((aid) => [h.id, aid]),
      ),
    )(
      'household %s: accountId %s is a valid account',
      (_householdId, accountId) => {
        expect(accountIdSet.has(accountId)).toBe(true)
      },
    )
  })

  describe('Household primaryContactId references', () => {
    it.each(households.map((h) => [h.id, h.primaryContactId, h]))(
      'household %s: primaryContactId %s is a valid client in that household',
      (_householdId, primaryContactId, household) => {
        expect(clientIdSet.has(primaryContactId)).toBe(true)
        const memberClientIds = household.members.map(
          (m: { clientId: string }) => m.clientId,
        )
        expect(memberClientIds).toContain(primaryContactId)
      },
    )
  })

  describe('NBA → Client references', () => {
    it.each(nbas.map((n) => [n.id, n]))(
      'NBA %s: all client.id references are valid clients',
      (_nbaId, nba) => {
        for (const client of nba.clients) {
          expect(
            clientIdSet.has(client.id),
            `NBA ${nba.id} references unknown client ${client.id}`,
          ).toBe(true)
        }
      },
    )
  })

  describe('Plan → Client references', () => {
    it.each(plans.map((p) => [p.id, p.clientId]))(
      'plan %s: clientId %s is a valid client',
      (_planId, clientId) => {
        expect(clientIdSet.has(clientId)).toBe(true)
      },
    )
  })

  describe('Plan → Household references', () => {
    it.each(plans.map((p) => [p.id, p.householdId]))(
      'plan %s: householdId %s is a valid household',
      (_planId, householdId) => {
        expect(householdIdSet.has(householdId)).toBe(true)
      },
    )
  })
})
