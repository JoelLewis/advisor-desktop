import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { reconciliationView, resolveBreak } from '@/mocks/reference/reconciliation'
import { BRIEF_TODAY_ID, briefToday } from '../brief-today'
import { holdMeeting, meetingView } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { escalate, returnToAdvisor } from '../compliance-acts'
import { recordCoffee } from '../prospect-steps'
import { withFormCrs } from './prospect-fixture'
import { ADRIAN, MARK, RATIONALE, approvedV1, ok, release } from './story-fixture'

const lines = () => briefToday(ADRIAN).lines
const kinds = () => lines().map((l) => l.kind)

describe("the Brief's Today", () => {
  it('in the morning: the annual review, the coffee with Form CRS due, and the open break, in that order', () => {
    expect(lines()).toEqual([
      { kind: 'meeting', start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z', title: 'Johnson annual review', state: 'scheduled', threadId: 'th-johnson-meeting' },
      { kind: 'coffee', start: '2026-02-25T20:30:00.000Z', prospectName: 'Dr. Amanda Pell', formCrs: 'due', threadId: 'th-pell' },
      { kind: 'reconciliation', openBreaks: 1 },
    ])
    expect(BRIEF_TODAY_ID).toBe('msg-btoday')
    expect(briefToday(ADRIAN)).toMatchObject({ kind: 'brief_today', id: BRIEF_TODAY_ID, threadId: 'th-brief' })
  })

  it('leads with the release line while approved orders await compliance, and drops it once released', () => {
    const a = approvedV1()
    expect(lines()[0]).toMatchObject({ kind: 'release', accountName: 'Robert Johnson Individual', version: 1, threadId: 'th-johnson-review' })
    release(a)
    expect(kinds()).not.toContain('release')
  })

  it('the release line leaves on a return and stays through an escalation', () => {
    const a = approvedV1()
    ok(escalate(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE))
    expect(kinds()).toContain('release')
    ok(returnToAdvisor(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE))
    expect(kinds()).not.toContain('release')
  })

  it("follows the meeting's state: held, then filed", () => {
    ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(lines().find((l) => l.kind === 'meeting')).toMatchObject({ state: 'held' })
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    ok(fileMeetingRecord(ADRIAN, 'evt-010', meetingView(ADRIAN, 'evt-010')!.notesFingerprint!))
    expect(lines().find((l) => l.kind === 'meeting')).toMatchObject({ state: 'filed' })
  })

  it('says Form CRS was delivered, then drops the coffee once it is recorded', () => {
    withFormCrs()
    expect(lines().find((l) => l.kind === 'coffee')).toMatchObject({ formCrs: 'delivered' })
    ok(recordCoffee(ADRIAN, 'prsp-011', 'We met; she will send her statements.'))
    expect(kinds()).not.toContain('coffee')
  })

  it('drops the reconciliation line once no break is open', () => {
    const open = reconciliationView(ADRIAN)!.breaks.find((b) => b.id === 'brk-002')!
    ok(resolveBreak(ADRIAN, { breakId: 'brk-002', fingerprint: open.fingerprint, resolution: 'timing_difference', rationale: 'Schwab confirmed the sweep posted late.' }))
    expect(kinds()).not.toContain('reconciliation')
  })

  it('is stamped at the session clock and stored nowhere', () => {
    const before = store().messages.length
    expect(briefToday(ADRIAN).at).toBe('2026-02-25T12:08:00.000Z')
    expect(store().messages).toHaveLength(before)
  })
})
