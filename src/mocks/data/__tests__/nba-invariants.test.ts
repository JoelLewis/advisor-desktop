import { describe, it, expect } from 'vitest'
import { nbas } from '@/mocks/data/nbas'
import { clients } from '@/mocks/data/clients'

const clientIds = new Set(clients.map((c) => c.id))

const validCategories = [
  'rebalancing',
  'tax_management',
  'planning',
  'risk',
  'client_service',
  'compliance',
  'growth',
] as const

describe('NBA Invariants', () => {
  it('has exactly 20 NBAs', () => {
    expect(nbas).toHaveLength(20)
  })

  describe('Scoring dimensions in valid range (0-100)', () => {
    const dimensions = [
      'urgency',
      'impact',
      'efficiency',
      'relationship',
      'confidence',
      'composite',
    ] as const

    for (const dim of dimensions) {
      it.each(nbas.map((n) => [n.id, dim, n.scoring[dim]]))(
        `%s: ${dim} score %s is between 0 and 100`,
        (_id, _dim, score) => {
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(100)
        },
      )
    }
  })

  describe('Composite score approximates weighted formula', () => {
    it.each(nbas.map((n) => [n.id, n.title, n]))(
      '%s (%s): composite is within 6 of 0.3*urgency + 0.25*impact + 0.2*efficiency + 0.15*relationship + 0.1*confidence (hand-tuned composites allowed)',
      (_id, _title, nba) => {
        const { urgency, impact, efficiency, relationship, confidence } =
          nba.scoring
        const expected =
          0.3 * urgency +
          0.25 * impact +
          0.2 * efficiency +
          0.15 * relationship +
          0.1 * confidence
        expect(Math.abs(nba.scoring.composite - expected)).toBeLessThanOrEqual(
          6,
        )
      },
    )
  })

  describe('Priority-urgency mapping', () => {
    it('critical priority NBAs have urgency > 85', () => {
      const critical = nbas.filter((n) => n.priority === 'critical')
      for (const nba of critical) {
        expect(nba.scoring.urgency).toBeGreaterThan(85)
      }
    })

    it('high priority NBAs have urgency > 60', () => {
      const high = nbas.filter((n) => n.priority === 'high')
      for (const nba of high) {
        expect(nba.scoring.urgency).toBeGreaterThan(60)
      }
    })

    it('medium priority NBAs have urgency >= 35', () => {
      const medium = nbas.filter((n) => n.priority === 'medium')
      for (const nba of medium) {
        expect(nba.scoring.urgency).toBeGreaterThanOrEqual(35)
      }
    })

    it('low priority NBAs have urgency <= 40', () => {
      const low = nbas.filter((n) => n.priority === 'low')
      for (const nba of low) {
        expect(nba.scoring.urgency).toBeLessThanOrEqual(40)
      }
    })
  })

  describe('Client references', () => {
    it.each(nbas.map((n) => [n.id, n.title, n]))(
      '%s (%s): all client references point to valid clients',
      (_id, _title, nba) => {
        for (const client of nba.clients) {
          expect(clientIds.has(client.id)).toBe(true)
        }
      },
    )
  })

  describe('Estimated impact', () => {
    it.each(nbas.map((n) => [n.id, n.estimatedImpact]))(
      '%s: estimatedImpact %d is non-negative',
      (_id, impact) => {
        expect(impact).toBeGreaterThanOrEqual(0)
      },
    )
  })

  describe('Category validation', () => {
    it.each(nbas.map((n) => [n.id, n.category]))(
      '%s: category "%s" is a valid NBA category',
      (_id, category) => {
        expect(
          (validCategories as readonly string[]).includes(category),
        ).toBe(true)
      },
    )
  })

  describe('Group batching rules', () => {
    const groupedNbas = nbas.filter((n) => n.groupId)

    it('at least one NBA has a groupId', () => {
      expect(groupedNbas.length).toBeGreaterThan(0)
    })

    it.each(groupedNbas.map((n) => [n.id, n.groupId, n]))(
      '%s (group %s): grouped NBA has at least 3 clients (batch opportunity threshold)',
      (_id, _groupId, nba) => {
        expect(
          nba.clients.length,
          `NBA ${nba.id} in group ${nba.groupId} should have >= 3 clients for batch opportunity`,
        ).toBeGreaterThanOrEqual(3)
      },
    )
  })
})
