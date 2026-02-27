import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import {
  getPositions,
  getDrift,
  getAttribution,
  getPerformance,
  getDriftSummary,
  getModels,
  getConcentration,
  getModelGovernance,
  getMetricsSummary,
  getSensitivity,
} from '../pms'

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

  describe('getAttribution', () => {
    it('returns attribution data with period param', async () => {
      const attribution = await getAttribution('acc-001', 'ytd')
      expect(attribution).toBeTruthy()
      expect(Array.isArray(attribution)).toBe(true)
    })

    it('returns attribution data without period param', async () => {
      const attribution = await getAttribution('acc-001')
      expect(attribution).toBeTruthy()
      expect(Array.isArray(attribution)).toBe(true)
    })
  })

  describe('getPerformance', () => {
    it('returns performance series for a valid account', async () => {
      const performance = await getPerformance('acc-001')
      expect(performance).toBeTruthy()
      expect(Array.isArray(performance)).toBe(true)
      expect(performance.length).toBeGreaterThan(0)
    })
  })

  describe('getDriftSummary', () => {
    it('returns an array of drift statuses', async () => {
      const summary = await getDriftSummary()
      expect(summary).toBeTruthy()
      expect(Array.isArray(summary)).toBe(true)
    })
  })

  describe('getModels', () => {
    it('returns an array of model assignments', async () => {
      const models = await getModels()
      expect(models).toBeTruthy()
      expect(Array.isArray(models)).toBe(true)
      expect(models.length).toBeGreaterThan(0)
    })
  })

  describe('getConcentration', () => {
    it('returns concentration analysis for a valid account', async () => {
      const concentration = await getConcentration('acc-001')
      expect(concentration).toBeTruthy()
      expect(concentration).toHaveProperty('positions')
      expect(concentration).toHaveProperty('summary')
    })
  })

  describe('getModelGovernance', () => {
    it('returns model governance details', async () => {
      // The /api/pms/models/governance route is defined after /api/pms/models/:modelId
      // in the handler array, so MSW matches the parametric route first.
      // We override with a specific handler to test the service call.
      server.use(
        http.get('/api/pms/models/governance', () => {
          return HttpResponse.json([
            { id: 'mod-001', name: 'Balanced Growth' },
          ])
        }),
      )
      const governance = await getModelGovernance()
      expect(governance).toBeTruthy()
      expect(Array.isArray(governance)).toBe(true)
      expect(governance.length).toBeGreaterThan(0)
    })
  })

  describe('getMetricsSummary', () => {
    it('returns metrics summary with AUM', async () => {
      const metrics = await getMetricsSummary()
      expect(metrics).toBeTruthy()
      expect(metrics.totalAUM).toBeGreaterThan(0)
      expect(metrics.totalClients).toBe(20)
    })
  })

  describe('getSensitivity', () => {
    it('returns sensitivity analysis for a valid account', async () => {
      const sensitivity = await getSensitivity('acc-001')
      expect(sensitivity).toBeTruthy()
      expect(sensitivity).toHaveProperty('interestRate')
      expect(sensitivity).toHaveProperty('equity')
      expect(sensitivity).toHaveProperty('credit')
      expect(sensitivity).toHaveProperty('monteCarlo')
    })
  })
})
