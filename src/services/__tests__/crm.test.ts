import { describe, it, expect } from 'vitest'
import { getHeldAway, getHousehold } from '../crm'

describe('CRM service', () => {
  describe('getHousehold', () => {
    it('returns a household with the correct id', async () => {
      const household = await getHousehold('user-001', 'hh-001')
      expect(household).toBeTruthy()
      expect(household.id).toBe('hh-001')
    })

    it('returns a household with expected properties', async () => {
      const household = await getHousehold('user-001', 'hh-001')
      expect(household).toHaveProperty('name')
      expect(household).toHaveProperty('members')
    })
  })

  describe('getHeldAway', () => {
    it("returns the household's held-away assets", async () => {
      const assets = await getHeldAway('user-001', 'hh-001')
      expect(assets.length).toBeGreaterThan(0)
      expect(assets.every((a) => a.householdId === 'hh-001')).toBe(true)
    })
  })
})
