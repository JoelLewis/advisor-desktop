import { describe, it, expect } from 'vitest'
import { plans } from '@/mocks/data/planning'
import { clients } from '@/mocks/data/clients'
import { households } from '@/mocks/data/households'

const clientIds = new Set(clients.map((c) => c.id))
const householdIds = new Set(households.map((h) => h.id))

const validGoalTypes = [
  'retirement',
  'education',
  'legacy',
  'purchase',
] as const

describe('Planning Invariants', () => {
  it('has exactly 7 financial plans', () => {
    expect(plans).toHaveLength(7)
  })

  describe('Goal probability in valid range', () => {
    for (const plan of plans) {
      for (const goal of plan.goals) {
        it(`${plan.id} / ${goal.id} (${goal.name}): probability in [0, 1]`, () => {
          expect(goal.probability).toBeGreaterThanOrEqual(0)
          expect(goal.probability).toBeLessThanOrEqual(1)
        })
      }
    }
  })

  describe('Goal status consistency with probability', () => {
    for (const plan of plans) {
      for (const goal of plan.goals) {
        if (goal.status === 'not_analyzed') continue

        it(`${plan.id} / ${goal.id} (${goal.name}): status "${goal.status}" is consistent with probability ${goal.probability}`, () => {
          if (goal.probability >= 0.85) {
            expect(goal.status).toBe('on_track')
          } else if (goal.probability >= 0.7) {
            expect(['on_track', 'at_risk']).toContain(goal.status)
          } else {
            expect(['at_risk', 'off_track']).toContain(goal.status)
          }
        })
      }
    }
  })

  describe('Referential integrity', () => {
    it.each(plans.map((p) => [p.id, p.clientId]))(
      '%s: clientId %s references a valid client',
      (_id, clientId) => {
        expect(clientIds.has(clientId)).toBe(true)
      },
    )

    it.each(plans.map((p) => [p.id, p.householdId]))(
      '%s: householdId %s references a valid household',
      (_id, householdId) => {
        expect(householdIds.has(householdId)).toBe(true)
      },
    )
  })

  describe('Goal types', () => {
    for (const plan of plans) {
      it.each(plan.goals.map((g) => [g.id, g.type]))(
        `${plan.id} / %s: goal type "%s" is valid`,
        (_goalId, goalType) => {
          expect(
            (validGoalTypes as readonly string[]).includes(goalType),
          ).toBe(true)
        },
      )
    }
  })

  describe('Plan structure', () => {
    it.each(plans.map((p) => [p.id, p]))(
      '%s: has at least 1 goal',
      (_id, plan) => {
        expect(plan.goals.length).toBeGreaterThanOrEqual(1)
      },
    )

    it.each(plans.map((p) => [p.id, p.aggregateProbability]))(
      '%s: aggregate probability %d is greater than 0',
      (_id, prob) => {
        expect(prob).toBeGreaterThan(0)
      },
    )
  })
})
