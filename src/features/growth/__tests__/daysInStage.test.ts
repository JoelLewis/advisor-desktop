import { describe, it, expect } from 'vitest'
import { daysInStage as daysInStagePage } from '../ProspectsPage'
import { daysInStage as daysInStageList } from '../ProspectListView'
import { MOCK_NOW_ISO } from '@/lib/clock'
import type { Prospect } from '@/types/prospect'

function createTestProspect(stageChangedAt: string): Prospect {
  return {
    id: 'prsp-test-001',
    name: 'Test Prospect',
    email: 'test@example.com',
    phone: '(555) 555-0100',
    estimatedAUM: 1_000_000,
    source: 'referral',
    stage: 'discovery',
    probability: 0.4,
    assignedAdvisor: 'adv-001',
    nextAction: 'Follow up',
    nextActionDate: MOCK_NOW_ISO,
    activities: [],
    createdAt: '2026-01-01T00:00:00Z',
    stageChangedAt,
  }
}

// Regression test for fix round 2: both ProspectsPage and ProspectListView carry a duplicate
// daysInStage() that previously diffed against Date.now() (the live system clock) instead of the
// frozen clock, so pipeline metrics and the prospect list would show wildly inflated "days in
// stage" values whenever the real wall-clock date drifted from the frozen fixture data.
describe.each([
  ['ProspectsPage', daysInStagePage],
  ['ProspectListView', daysInStageList],
])('%s daysInStage (anchored to the frozen clock)', (_name, daysInStage) => {
  it('is 0 for a stage change at the frozen clock instant', () => {
    expect(daysInStage(createTestProspect(MOCK_NOW_ISO))).toBe(0)
  })

  it('counts whole days back from the frozen clock, not the live system clock', () => {
    const fiveDaysAgo = new Date(new Date(MOCK_NOW_ISO).getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(daysInStage(createTestProspect(fiveDaysAgo))).toBe(5)
  })
})
