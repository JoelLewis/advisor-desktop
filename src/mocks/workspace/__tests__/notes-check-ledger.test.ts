import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { clientRiskOf } from '@/mocks/reference/risk'
import { REBALANCE_LINE } from '@/mocks/agents/meeting-notes'
import { runMeetingPrepAgent } from '@/mocks/agents/meeting-prep'
import { holdMeeting } from '../meetings'
import { draftMeetingNotes, notesFactsOf, rebalanceStateOf, wholeStandingOf } from '../meeting-agents'
import { householdLedger } from '../household-ledger'
import { approvedStoryV3, ok, release } from './story-fixture'

const ADRIAN = 'user-001'
const line = (id: string) => {
  const found = store().meetings[0]?.notesDraft?.find((l) => l.id === id)
  if (!found) throw new Error(`no note line ${id}`)
  return found.text
}
const holdAndDraft = () => { ok(holdMeeting(ADRIAN, 'evt-010')); ok(draftMeetingNotes(ADRIAN, 'evt-010')) }

describe('Meeting Notes checks what filled on the meeting day', () => {
  it("says \"this morning's rebalance\" only once the rebalance has filled that day", () => {
    release(approvedStoryV3())
    holdAndDraft()
    expect(line('n-01')).toBe(REBALANCE_LINE.filled)
    expect(line('n-01')).toContain("this morning's rebalance")
  })
  it('reads as a plan when the review is held before the release', () => {
    approvedStoryV3()
    holdAndDraft()
    expect(line('n-01')).toBe(REBALANCE_LINE.awaiting_release)
    expect(line('n-01')).toContain('approved and awaiting compliance release')
  })
  it('says nothing was traded when nothing was approved', () => {
    holdAndDraft()
    expect(line('n-01')).toBe(REBALANCE_LINE.not_approved)
    expect(line('n-01')).not.toMatch(/this morning|rebalanced/)
  })
})

describe("Meeting Notes states Patricia's accounts as the Risk view shows them", () => {
  it("follows her accounts as a whole against her own tolerance, not the transcript's \"well away from the models\"", () => {
    const risk = clientRiskOf('cli-002')
    if (!risk) throw new Error('Patricia holds measured accounts')
    // The engine's reading at 55ab98b: 34 pts, within Moderate Conservative 26–40. If this differs, report it; do not edit it.
    expect([risk.posture.score, risk.posture.status, risk.posture.tolerance.band]).toEqual([34, 'within', 'Moderate Conservative'])
    holdAndDraft()
    expect(line('n-03')).toBe("Reviewed Patricia's accounts: as a whole they sit within her Moderate Conservative tolerance. Patricia said she is more cautious than the models on her accounts assume.")
    expect(line('n-03')).not.toMatch(/well away/)
  })
  it('reads each member from the ledger and the Risk view at the time it drafts', () => {
    expect(notesFactsOf('hh-001', '2026-02-25')).toEqual({
      rebalance: 'not_approved',
      wholes: new Map([['cli-001', { tolerance: 'Moderate', status: 'within' }], ['cli-002', { tolerance: 'Moderate Conservative', status: 'within' }]]),
    })
  })
})

describe('the shared readings', () => {
  it('reads the rebalance state from the ledger as it moves from approved to released', () => {
    expect(rebalanceStateOf(householdLedger('hh-001'))).toBe('not_approved')
    const approved = approvedStoryV3()
    expect(rebalanceStateOf(householdLedger('hh-001'))).toBe('awaiting_release')
    release(approved)
    expect(rebalanceStateOf(householdLedger('hh-001'))).toBe('filled')
  })
  it("reads a client's accounts as a whole against their own tolerance", () => {
    expect(wholeStandingOf('cli-002')).toEqual({ tolerance: 'Moderate Conservative', status: 'within', score: clientRiskOf('cli-002')?.posture.score, value: clientRiskOf('cli-002')?.value })
  })
})

describe("Meeting Prep's changes are the ledger's fills on the day", () => {
  const changes = () => {
    const found = runMeetingPrepAgent('hh-001', '2026-02-25T15:00:00Z').find((f) => f.agendaTitle === 'Changes since the last review' || f.agendaTitle === "This morning's rebalance and harvest")
    if (!found) throw new Error('Meeting Prep reports what changed')
    return found
  }
  it('before any release: nothing filled today', () => expect(changes().claim).toBe("No orders have been filled in the household's accounts today."))
  it("after the release: the day's fills", () => {
    release(approvedStoryV3())
    expect(changes().claim).toMatch(/^Orders released today were filled in /)
  })
})
