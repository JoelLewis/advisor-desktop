import { describe, it, expect } from 'vitest'
import { getClients, getClient, getHouseholds, getHousehold } from '../crm'

describe('CRM service', () => {
  describe('getClients', () => {
    it('returns a paginated response with 20 clients', async () => {
      const result = await getClients()
      expect(result).toBeTruthy()
      expect(result.items).toBeTruthy()
      expect(Array.isArray(result.items)).toBe(true)
      expect(result.items.length).toBe(20)
      expect(result.total).toBe(20)
    })
  })

  describe('getClient', () => {
    it('returns a client with the correct id', async () => {
      const client = await getClient('cli-001')
      expect(client).toBeTruthy()
      expect(client.id).toBe('cli-001')
    })

    it('returns a client with expected properties', async () => {
      const client = await getClient('cli-001')
      expect(client).toHaveProperty('fullName')
      expect(client).toHaveProperty('firstName')
      expect(client).toHaveProperty('lastName')
      expect(client).toHaveProperty('email')
    })
  })

  describe('getHouseholds', () => {
    it('returns a paginated response with 12 households', async () => {
      const result = await getHouseholds()
      expect(result).toBeTruthy()
      expect(result.items).toBeTruthy()
      expect(Array.isArray(result.items)).toBe(true)
      expect(result.items.length).toBe(12)
      expect(result.total).toBe(12)
    })
  })

  describe('getHousehold', () => {
    it('returns a household with the correct id', async () => {
      const household = await getHousehold('hh-001')
      expect(household).toBeTruthy()
      expect(household.id).toBe('hh-001')
    })

    it('returns a household with expected properties', async () => {
      const household = await getHousehold('hh-001')
      expect(household).toHaveProperty('name')
      expect(household).toHaveProperty('members')
    })
  })
})
