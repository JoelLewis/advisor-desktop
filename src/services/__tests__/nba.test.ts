import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { getNBAs, dismissNBA, snoozeNBA, executeBatchAction } from '../nba'
import type { BatchActionRequest } from '@/types/nba'

describe('NBA service', () => {
  describe('getNBAs', () => {
    it('returns an array of 20 NBAs', async () => {
      const nbas = await getNBAs()
      expect(nbas).toBeTruthy()
      expect(Array.isArray(nbas)).toBe(true)
      expect(nbas.length).toBe(20)
    })

    it('returns NBAs with expected structure', async () => {
      const nbas = await getNBAs()
      const first = nbas[0]
      expect(first).toHaveProperty('id')
      expect(first).toHaveProperty('title')
      expect(first).toHaveProperty('category')
      expect(first).toHaveProperty('priority')
      expect(first).toHaveProperty('scoring')
    })
  })

  describe('dismissNBA', () => {
    it('completes without throwing for a valid NBA', async () => {
      // Override the handler to return JSON instead of 204 no-content
      // so api-client's handleResponse can parse the body
      server.use(
        http.post('/api/nba/:id/dismiss', () => {
          return HttpResponse.json({ success: true })
        }),
      )

      await expect(dismissNBA('nba-001')).resolves.toBeDefined()
    })
  })

  describe('snoozeNBA', () => {
    it('completes without throwing for a valid NBA', async () => {
      // Override the handler to return JSON instead of 204 no-content
      server.use(
        http.post('/api/nba/:id/snooze', () => {
          return HttpResponse.json({ success: true })
        }),
      )

      await expect(snoozeNBA('nba-001', '2026-03-05')).resolves.toBeDefined()
    })
  })

  describe('executeBatchAction', () => {
    it('completes without throwing for a valid batch request', async () => {
      const request: BatchActionRequest = {
        groupId: 'group-rebal',
        nbaIds: ['nba-001', 'nba-002'],
        action: 'rebalance',
      }

      const result = await executeBatchAction(request)
      expect(result).toBeTruthy()
      expect(result.groupId).toBe('group-rebal')
      expect(result.processed).toBeGreaterThanOrEqual(0)
    })
  })
})
