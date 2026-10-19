import { describe, it, expect } from 'vitest'
import { clientRiskOf } from '@/mocks/reference/risk'
import { householdView } from '../household-views'
import { approvedStoryV3, release } from './story-fixture'

const ADRIAN = 'user-001'
const johnson = () => {
  const v = householdView(ADRIAN, 'hh-001')
  if (!v) throw new Error('Adrian reads the Johnsons')
  return v
}

describe('the Johnson page model', () => {
  it("gives each member their own tolerance and their own accounts as a whole; nothing pooled", () => {
    expect(johnson().standing).toEqual([
      { clientId: 'cli-001', name: 'Robert Johnson', tolerance: { band: 'Moderate', floor: 41, ceiling: 55, score: 55, assessedOn: '2025-09-15' }, whole: expect.objectContaining({ score: 51, status: 'within' }) },
      { clientId: 'cli-002', name: 'Patricia Johnson', tolerance: { band: 'Moderate Conservative', floor: 26, ceiling: 40, score: 35, assessedOn: '2025-09-15' }, whole: expect.objectContaining({ score: 34, status: 'within' }) },
    ])
  })

  it("lists the Brief's decisions about the household's account, then none for the proposal once approved with a reason", () => {
    const before = johnson().decisions
    expect(before.every((d) => d.kind === 'brief')).toBe(true)
    expect(before.some((d) => d.kind === 'brief' && d.item.awaitsApprovalOf === 'acc-002')).toBe(true)
    release(approvedStoryV3())
    expect(johnson().decisions.some((d) => d.kind === 'brief' && d.item.awaitsApprovalOf === 'acc-002')).toBe(false)
    expect(johnson().decisions.some((d) => d.kind === 'proposal')).toBe(false)
  })

  it("carries the engine's own figure for each member's accounts as a whole, inside their own band", () => {
    for (const m of johnson().standing) {
      const risk = clientRiskOf(m.clientId)
      expect(m.whole).toEqual({ score: risk?.posture.score, status: 'within', value: risk?.value })
      expect(m.whole?.score).toBeGreaterThanOrEqual(m.tolerance.floor)
      expect(m.whole?.score).toBeLessThanOrEqual(m.tolerance.ceiling)
    }
  })

  it('pins which decide items remain on the page after the release: the suitability and harvest decisions settle, the drift reading stays', () => {
    const lines = (items: ReturnType<typeof johnson>['decisions']) => items.flatMap((d) => (d.kind === 'brief' ? [[d.item.agentId, d.item.awaitsApprovalOf, ...d.item.readings.map((r) => r.line)]] : []))
    expect(lines(johnson().decisions).map((l) => l[0])).toEqual(['drift-monitor', 'drift-monitor', 'harvest-scanner', 'harvest-scanner'])
    release(approvedStoryV3())
    expect(lines(johnson().decisions)).toEqual([['drift-monitor', undefined, 'US Equity is outside its tolerance band']])
  })

  it('names an owner for every task and open item, and a due date where there is one', () => {
    expect(johnson().tasks.map((t) => [t.id, t.owner, t.source, t.due])).toEqual([
      ['comp-002', 'Mark Davis · Compliance', 'compliance', undefined],
      ['oi-001', 'Adrian Hale · Advisor', 'open_item', undefined],
    ])
  })

  it('states the last client contact and who is waiting', () => {
    expect(johnson().lastContact).toEqual({
      clientName: 'Robert Johnson', at: '2026-02-25T12:01:00.000Z', direction: 'from_client', where: { kind: 'conversation', threadId: 'th-robert', title: 'Robert Johnson' },
    })
    expect(johnson().waiting).toEqual([{ clientName: 'Robert Johnson', since: '2026-02-25T12:01:00.000Z', threadId: 'th-robert' }])
  })

  it('lists its conversations with their visibility words, not the Brief', () => {
    expect(johnson().conversations.map((c) => [c.threadId, c.audience.kind])).toEqual([
      ['th-johnson-meeting', 'team'], ['th-johnson-review', 'team'], ['th-patricia', 'party'], ['th-robert', 'party'],
    ])
  })

  it('states its methods: the value-weighted target, held away outside the totals, suitability per client', () => {
    expect(johnson().methods.map((m) => m.label)).toEqual(['Household target', 'Held away', 'Orders and fills', 'Risk against tolerance'])
  })

  it('is firm only', () => {
    expect(householdView('cli-001', 'hh-001')).toBeUndefined()
    expect(householdView('cli-002', 'hh-001')).toBeUndefined()
  })
})
