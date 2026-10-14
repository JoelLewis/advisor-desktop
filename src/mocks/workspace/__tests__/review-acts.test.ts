import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { alertById, alertFingerprint, isOpenAlert, recordTrailFor } from '../alerts'
import { latestReview } from '../correspondence'
import { disposeAlert, reviewCorrespondence } from '../compliance-acts'
import { ADRIAN, MARK, ROBERT, approvedV1, ok, sendLetter } from './story-fixture'

const MSFT = 'comp-002'
const fp = (id: string) => alertFingerprint(alertById(id)!)

describe('dispose_alert', () => {
  it('records the disposition outside any thread and appends it to the record trail', () => {
    const messages = store().messages.length
    const act = ok(disposeAlert(MARK, MSFT, 'approve', fp(MSFT), 'Long-held position; the IPS exception is documented.')).act
    expect(act).toEqual({
      id: 'REC-0001', kind: 'dispose_alert', actorId: MARK, at: act.at, subject: { type: 'alert', id: MSFT }, fingerprint: act.fingerprint,
      summary: 'Approved the alert: Single-name concentration — MSFT in Johnson Trust', rationale: 'Long-held position; the IPS exception is documented.', outcome: 'approve',
    })
    expect(store().messages).toHaveLength(messages)
    expect(recordTrailFor(MSFT).map((r) => r.id)).toEqual(['sr-003', 'sr-004'])
    expect(recordTrailFor(MSFT)[1]).toEqual({ id: 'sr-004', alertId: MSFT, reviewerId: MARK, reviewer: 'Mark Davis (CCO)', action: 'Approved', notes: 'Long-held position; the IPS exception is documented.', timestamp: act.at })
    expect(isOpenAlert(alertById(MSFT)!)).toBe(false)
  })

  it('a request for changes returns the alert and reads so on the trail', () => {
    ok(disposeAlert(MARK, 'comp-005', 'request_changes', fp('comp-005'), 'Schedule the IPS review before the anniversary.'))
    expect(recordTrailFor('comp-005').pop()?.action).toBe('Changes requested')
    expect(isOpenAlert(alertById('comp-005')!)).toBe(false)
  })

  it('refuses what is not compliance\'s, not open, stale or without a rationale', () => {
    expect(disposeAlert(ADRIAN, MSFT, 'approve', fp(MSFT), 'Mine.')).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(disposeAlert(ROBERT, MSFT, 'approve', fp(MSFT), 'Mine.')).toMatchObject({ ok: false, status: 404 })
    expect(disposeAlert(MARK, 'comp-999', 'approve', 'X', 'Why.')).toMatchObject({ ok: false, status: 404, code: 'NO_ALERT' })
    expect(disposeAlert(MARK, MSFT, 'approve', fp(MSFT), '  ')).toMatchObject({ ok: false, status: 400, code: 'RATIONALE_REQUIRED' })
    expect(disposeAlert(MARK, MSFT, 'approve', 'DEADBEEF', 'Why.')).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    const closed = disposeAlert(MARK, 'comp-004', 'approve', fp('comp-004'), 'Why.')
    expect(closed).toMatchObject({ ok: false, status: 409, code: 'ALREADY_DISPOSED' })
    expect(closed.ok ? '' : closed.message).toBe('comp-004 is already closed.')
    const first = ok(disposeAlert(MARK, MSFT, 'reject', fp(MSFT), 'Reduce the position.')).act
    const again = disposeAlert(MARK, MSFT, 'approve', fp(MSFT), 'Changed my mind.')
    expect(again).toMatchObject({ ok: false, status: 409, code: 'ALREADY_DISPOSED' })
    expect(again.ok ? '' : again.message).toBe(`comp-002 was already disposed of (${first.id}).`)
    expect(store().acts).toHaveLength(1)
  })
})

describe('review_correspondence', () => {
  it('names the sent message; a flag keeps it open until it is reviewed', () => {
    const { act: sent, messageId } = sendLetter(approvedV1())
    expect(store().messages.find((m) => m.id === messageId)).toMatchObject({ kind: 'text', threadId: 'th-robert', authorId: ADRIAN })
    const flag = ok(reviewCorrespondence(MARK, messageId, 'flagged', sent.fingerprint, 'Check the look-back sentence with the advisor.')).act
    expect(flag).toEqual({
      id: flag.id, kind: 'review_correspondence', actorId: MARK, at: flag.at, subject: { type: 'message', id: messageId }, fingerprint: sent.fingerprint,
      summary: 'Flagged the message sent to Robert Johnson for follow-up', rationale: 'Check the look-back sentence with the advisor.', outcome: 'flagged',
    })
    expect(reviewCorrespondence(MARK, messageId, 'flagged', sent.fingerprint, 'Again.')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_FLAGGED' })
    const done = ok(reviewCorrespondence(MARK, messageId, 'reviewed', sent.fingerprint, 'Discussed with Adrian; the wording stands.')).act
    expect(done.summary).toBe('Reviewed the message sent to Robert Johnson')
    expect(latestReview(messageId)?.id).toBe(done.id)
    expect(reviewCorrespondence(MARK, messageId, 'flagged', sent.fingerprint, 'Late.')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_REVIEWED' })
  })

  it('only compliance reviews; a client is told the message does not exist; the client thread is untouched', () => {
    const { act: sent, messageId } = sendLetter(approvedV1())
    const robert = () => JSON.stringify([store().messages.filter((m) => m.threadId === 'th-robert'), store().acts.filter((a) => a.threadId === 'th-robert')])
    const before = robert()
    expect(reviewCorrespondence(ADRIAN, messageId, 'reviewed', sent.fingerprint, 'Mine.')).toMatchObject({ ok: false, status: 403 })
    expect(reviewCorrespondence(ROBERT, messageId, 'reviewed', sent.fingerprint, 'Mine.')).toMatchObject({ ok: false, status: 404 })
    expect(reviewCorrespondence(MARK, 'msg-9999', 'reviewed', sent.fingerprint, 'Why.')).toMatchObject({ ok: false, status: 404, code: 'NO_MESSAGE' })
    expect(reviewCorrespondence(MARK, messageId, 'reviewed', 'DEADBEEF', 'Why.')).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    ok(reviewCorrespondence(MARK, messageId, 'reviewed', sent.fingerprint, 'Accurate and balanced.'))
    expect(robert()).toBe(before)
  })
})
