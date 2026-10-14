import { describe, it, expect } from 'vitest'
import { requireProspect } from '../prospects'
import { storyProgress } from '../story-progress'
import { holdMeeting, meetingView } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { draftRecap } from '../recap'
import { sendToParty } from '../acts'
import { reconciliationView, resolveBreak } from '@/mocks/reference/reconciliation'
import { ADRIAN, approvedV1, ok, release } from './story-fixture'

const done = () => Object.fromEntries(storyProgress().steps.map((s) => [s.id, s.done]))

describe('the five-minute path, from session state', () => {
  it('starts with nothing done and the Brief next', () => {
    expect(storyProgress()).toEqual({ steps: expect.any(Array), next: 'brief' })
    expect(Object.values(done()).every((d) => !d)).toBe(true)
  })

  it('an approval completes the rebalance, and the Brief before it', () => {
    approvedV1()
    expect(done()).toMatchObject({ brief: true, rebalance: true, release: false, blotter: false })
    expect(storyProgress().next).toBe('release')
  })

  it('a release completes the release, and the blotter waits for a later step', () => {
    release(approvedV1())
    expect(done()).toMatchObject({ release: true, blotter: false })
    expect(storyProgress().next).toBe('blotter')
  })

  it('the meeting is done once filed and its recap sent; then the blotter, read on the way, is done too', () => {
    release(approvedV1())
    ok(holdMeeting(ADRIAN, 'evt-010'))
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    ok(fileMeetingRecord(ADRIAN, 'evt-010', meetingView(ADRIAN, 'evt-010')!.notesFingerprint!))
    expect(done()).toMatchObject({ meeting: false })
    const { draft } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    ok(sendToParty(ADRIAN, draft.id))
    expect(done()).toMatchObject({ meeting: true, blotter: true })
    expect(storyProgress().next).toBe('pell')
  })

  it('Dr. Pell is done once her proposal is sent and she has accepted', () => {
    const pell = requireProspect('prsp-011')
    pell.sent = { proposalId: 'pp-1', version: 2, actId: 'REC-0101', messageId: 'msg-x1', at: '2026-02-26T15:00:00.000Z' }
    expect(done()).toMatchObject({ pell: false })
    pell.accepted = { proposalId: 'pp-1', version: 2, actId: 'REC-0102', at: '2026-03-02T15:00:00.000Z' }
    expect(done()).toMatchObject({ pell: true })
  })

  it('a resolved break completes the reference views; View as Robert is never marked done, only next', () => {
    const open = reconciliationView(ADRIAN)!.breaks.find((b) => b.id === 'brk-002')!
    ok(resolveBreak(ADRIAN, { breakId: 'brk-002', fingerprint: open.fingerprint, resolution: 'timing_difference', rationale: 'Schwab confirmed the sweep posted late.' }))
    expect(done()).toMatchObject({ reference: true, view_as: false, brief: true, blotter: true })
  })
})
