import { describe, it, expect } from 'vitest'
import { getPositions, getDrift } from '../pms'

describe('PMS service', () => {
  describe('getPositions', () => {
    it('returns positions for a valid account', async () => {
      const positions = await getPositions('acc-001')
      expect(positions).toBeTruthy()
      expect(Array.isArray(positions)).toBe(true)
      expect(positions.length).toBeGreaterThan(0)
    })
  })

  describe('getDrift', () => {
    it('returns drift data for a valid account', async () => {
      const drift = await getDrift('acc-001')
      expect(drift).toBeTruthy()
      expect(drift).toHaveProperty('accountId')
    })
  })
})
