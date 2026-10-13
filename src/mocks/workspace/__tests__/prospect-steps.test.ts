import { describe, it, expect } from 'vitest'
import { advanceClockTo, sessionNow, store } from '@/mocks/data/workspace-store'
import { PELL_REPLY, PELL_ACCEPTANCE, PELL_REPLY_QUESTIONNAIRE_ONLY, PELL_REPLY_STATEMENTS_ONLY } from '@/mocks/data/prospect-script'
import { eventTime } from '@/lib/clock'
import { requireProspect } from '../prospects'
import { createProspectProposal } from '../prospect-proposals'
import { approveProspectProposal, sendProspectProposal } from '../prospect-acts'
import { deliverDisclosure, deliverableNow } from '../disclosures'
import { transferSummary } from '../transfer-in'
import { createProposal } from '../proposals'
import { approveProposal } from '../proposal-acts'
import { releaseOrders } from '../compliance-acts'
import { actAsProspect, advanceProspect, herStep, nextJumpOf, partySteps, recordCoffee } from '../prospect-steps'
import { ADRIAN } from './prospect-fixture'

const PELL = 'prsp-011'
const SCRIPTED = { presenterId: ADRIAN, path: 'scripted' }
const herThread = () => store().messages.filter((m) => m.threadId === 'th-pell' && m.id !== 'msg-s07')
function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(JSON.stringify(r))
  return r as Extract<T, { ok: true }>
}
const coffee = () => ok(recordCoffee(ADRIAN, PELL, 'Coffee after James Thompson\'s introduction. She asked about the old 403(b); a comparison will follow.')).message

/** Coffee, reply, v1 drafted and approved, Form CRS, sent: everything her acceptance waits for. */
function sentToHer() {
  coffee()
  ok(advanceProspect(ADRIAN, PELL, 'reply'))
  const detail = ok(createProspectProposal(ADRIAN, PELL)).detail
  ok(approveProspectProposal(ADRIAN, detail.id, 1, detail.versions[0]?.fingerprint ?? '', 'Growth fits her answers.'))
  ok(deliverDisclosure(ADRIAN, PELL, 'form_crs'))
  ok(sendProspectProposal(ADRIAN, detail.id))
  return detail
}

describe('the coffee', () => {
  it('moves the clock to its end and posts a labelled note in the internal thread, once', () => {
    const note = coffee()
    expect(note).toMatchObject({ kind: 'prospect_note', threadId: 'th-pell-work', at: '2026-02-25T21:30:00.000Z', authorId: ADRIAN, eventId: 'evt-004',
      title: 'Coffee with Dr. Amanda Pell', start: '2026-02-25T20:30:00.000Z', end: '2026-02-25T21:30:00.000Z' })
    expect(requireProspect(PELL).coffee).toEqual({ at: note.at, messageId: note.id, authorId: ADRIAN })
    expect(recordCoffee(ADRIAN, PELL, 'Again.')).toEqual({ ok: false, status: 409, code: 'ALREADY_RECORDED', message: `The coffee was already recorded (${note.id}).` })
  })

  it('is the advisor\'s, written in 1 to 2,000 characters; it never moves the clock back', () => {
    expect(recordCoffee('user-002', PELL, 'Note.')).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(recordCoffee(PELL, PELL, 'Note.')).toMatchObject({ ok: false, status: 404 })
    expect(recordCoffee(ADRIAN, PELL, '   ')).toMatchObject({ ok: false, status: 400, code: 'BAD_NOTE' })
    advanceClockTo(2000)
    expect(coffee().at).toBe(eventTime(2001))
  })
})

describe('her reply, on the clock jump', () => {
  it('waits for the coffee, and moves nothing while it waits', () => {
    const before = sessionNow()
    expect(advanceProspect(ADRIAN, PELL, 'reply')).toEqual({ ok: false, status: 409, code: 'COFFEE_FIRST', message: 'Record the coffee first; her reply follows it.' })
    expect(sessionNow()).toBe(before)
  })

  it('arrives Thu 26 Feb 09:10 ET: her message, her answers, her statements — recorded as her, scripted', () => {
    coffee()
    const r = ok(advanceProspect(ADRIAN, PELL, 'reply'))
    expect(herThread().map((m) => [m.kind, m.at, m.kind === 'text' || m.kind === 'party_step' ? m.authorId : ''])).toEqual([
      ['text', '2026-02-26T14:10:00.000Z', PELL], ['party_step', '2026-02-26T14:11:00.000Z', PELL], ['party_step', '2026-02-26T14:12:00.000Z', PELL],
    ])
    expect(herThread()[0]).toMatchObject({ body: PELL_REPLY })
    expect(herThread().map((m) => (m.kind === 'party_step' ? m.summary : ''))).toEqual(['', 'Answered the risk questionnaire.', 'Shared two statements: Fidelity taxable brokerage and TIAA 403(b).'])
    const record = requireProspect(PELL)
    expect(record.steps.map((s) => [s.kind, s.viaPresenter])).toEqual([['questionnaire', SCRIPTED], ['statements', SCRIPTED]])
    expect(record.stage).toBe('discovery')
    expect(r.steps).toEqual({ questionnaire: 'done', statements: 'done', acceptance: 'unavailable' })
    const after = sessionNow()
    expect(advanceProspect(ADRIAN, PELL, 'reply')).toEqual({ ok: false, status: 409, code: 'ALREADY_REPLIED', message: 'Her reply is already on file.' })
    expect(sessionNow()).toBe(after)
  })

  it('keeps the engine\'s day: her holdings are still valued at the 25 Feb close', () => {
    coffee()
    ok(advanceProspect(ADRIAN, PELL, 'reply'))
    expect(transferSummary(requireProspect(PELL))).toMatchObject({ pricesAsOf: '2026-02-25', transferValue: 2_100_000 })
  })

  it('after the coffee (16:30 ET) today\'s session has closed: releasing the Johnson orders is refused MARKET_CLOSED, to the next session', () => {
    const proposal = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002')).detail
    const fp = proposal.versions[0]?.fingerprint ?? ''
    const approval = ok(approveProposal(ADRIAN, proposal.id, 1, fp)).act
    coffee()
    expect(releaseOrders('cco-001', proposal.id, approval.id, fp, 'Reviewed.')).toEqual({
      ok: false, status: 409, code: 'MARKET_CLOSED', message: "Today's session has closed; staged orders can be released at the next session.",
    })
  })
})

describe('her steps through the shortcut and through View as', () => {
  it('the shortcut records her answers as her, marked shortcut; the jump then brings only her statements', () => {
    coffee()
    const r = ok(actAsProspect(ADRIAN, PELL, 'questionnaire'))
    expect(r.steps.questionnaire).toBe('done')
    expect(requireProspect(PELL).steps[0]?.viaPresenter).toEqual({ presenterId: ADRIAN, path: 'shortcut' })
    expect(actAsProspect(ADRIAN, PELL, 'questionnaire')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_ANSWERED' })
    ok(advanceProspect(ADRIAN, PELL, 'reply'))
    expect(requireProspect(PELL).steps.map((s) => [s.kind, s.viaPresenter.path])).toEqual([['questionnaire', 'shortcut'], ['statements', 'scripted']])
  })

  it('the jump\'s message names only what she still sends: her statements after the shortcut answered, her answers after it shared', () => {
    coffee()
    ok(actAsProspect(ADRIAN, PELL, 'questionnaire'))
    ok(advanceProspect(ADRIAN, PELL, 'reply'))
    expect(herThread().filter((m) => m.kind === 'text').map((m) => m.kind === 'text' && m.body)).toEqual([PELL_REPLY_STATEMENTS_ONLY])
  })

  it('after the shortcut shares her statements, the jump\'s message brings only her answers', () => {
    coffee()
    ok(actAsProspect(ADRIAN, PELL, 'statements'))
    ok(advanceProspect(ADRIAN, PELL, 'reply'))
    expect(herThread().filter((m) => m.kind === 'text').map((m) => m.kind === 'text' && m.body)).toEqual([PELL_REPLY_QUESTIONNAIRE_ONLY])
  })

  it('as herself she takes her own steps, marked view_as; the firm is told the step is hers; Robert is told she does not exist', () => {
    coffee()
    ok(herStep(PELL, PELL, 'statements'))
    expect(requireProspect(PELL).steps[0]?.viaPresenter).toEqual({ presenterId: ADRIAN, path: 'view_as' })
    expect(herStep(ADRIAN, PELL, 'questionnaire')).toEqual({ ok: false, status: 403, code: 'NOT_HER_STEP', message: 'This step is hers; the presenter uses "Demo · act as Dr. Pell".' })
    expect(herStep('cli-001', PELL, 'questionnaire')).toMatchObject({ ok: false, status: 404 })
  })

  it('refuses answers that do not score, and every step before the coffee', () => {
    expect(herStep(PELL, PELL, 'questionnaire')).toEqual({ ok: false, status: 409, code: 'COFFEE_FIRST', message: 'Record the coffee first; her reply follows it.' })
    coffee()
    expect(herStep(PELL, PELL, 'questionnaire', { answers: [{ questionId: 'rq-01', selectedOption: 0 }] })).toEqual({ ok: false, status: 400, code: 'BAD_ANSWERS', message: 'Answer every question once.' })
    expect(requireProspect(PELL).questionnaire).toBeUndefined()
  })

  it('only the presenter acts as her and moves the clock', () => {
    coffee()
    for (const viewer of ['user-002', 'user-003', 'cco-001']) {
      expect(actAsProspect(viewer, PELL, 'questionnaire'), viewer).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
      expect(advanceProspect(viewer, PELL, 'reply'), viewer).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    }
    for (const viewer of [PELL, 'cli-001']) {
      expect(actAsProspect(viewer, PELL, 'questionnaire'), viewer).toMatchObject({ ok: false, status: 404 })
      expect(advanceProspect(viewer, PELL, 'reply'), viewer).toMatchObject({ ok: false, status: 404 })
    }
  })
})

describe('her acceptance', () => {
  it('waits for a proposal sent to her', () => {
    coffee()
    expect(advanceProspect(ADRIAN, PELL, 'acceptance')).toEqual({ ok: false, status: 409, code: 'NOT_SENT', message: 'Nothing has been sent to her to accept.' })
    expect(herStep(PELL, PELL, 'accept')).toMatchObject({ ok: false, status: 409, code: 'NOT_SENT' })
  })

  it('arrives Mon 2 Mar 10:00 ET, recorded as her, and opens onboarding once with trading-day dues from that day', () => {
    const detail = sentToHer()
    expect(herStep(PELL, PELL, 'accept', { version: 2 })).toEqual({ ok: false, status: 409, code: 'NOT_THE_SENT_VERSION', message: 'v1 is the version sent to her.' })
    const r = ok(advanceProspect(ADRIAN, PELL, 'acceptance'))
    expect(herThread().filter((m) => m.at.startsWith('2026-03-02')).map((m) => [m.kind, m.at])).toEqual([
      ['text', '2026-03-02T15:00:00.000Z'], ['act', '2026-03-02T15:02:00.000Z'],
    ])
    expect(herThread().find((m) => m.kind === 'text' && m.at === '2026-03-02T15:00:00.000Z')).toMatchObject({ authorId: PELL, body: PELL_ACCEPTANCE })
    expect(r.act).toMatchObject({ kind: 'accept_proposal', actorId: PELL, at: '2026-03-02T15:01:00.000Z', threadId: 'th-pell', version: 1,
      subject: { type: 'prospect_proposal', id: detail.id }, viaPresenter: SCRIPTED, summary: 'Dr. Amanda Pell accepted v1 of the Pell proposal' })
    const record = requireProspect(PELL)
    expect(record.stage).toBe('onboarding')
    expect(record.stageHistory.map((h) => h.stage)).toEqual(['contact', 'discovery', 'proposal', 'accepted', 'onboarding'])
    expect(record.onboarding?.items.map((i) => [i.id, i.status, i.ownerId, i.due])).toEqual([
      ['account_application', 'open', 'user-002', '2026-03-04'], ['cip', 'open', 'user-002', '2026-03-04'], ['ofac', 'open', 'user-002', '2026-03-03'],
      ['trusted_contact', 'open', 'user-002', '2026-03-05'], ['source_of_funds', 'open', ADRIAN, '2026-03-05'],
      ['advisory_agreement', 'awaiting_signature', ADRIAN, '2026-03-09'], ['adv_2b', 'open', ADRIAN, '2026-03-03'], ['privacy_notice', 'open', ADRIAN, '2026-03-03'],
      ['acat', 'not_started', 'user-002', undefined],
    ])
    expect(record.onboarding?.items.find((i) => i.id === 'trusted_contact')?.label).toBe('Trusted contact (custodian account form, FINRA Rule 4512)')
    expect(store().messages.filter((m) => m.kind === 'onboarding_opened')).toHaveLength(1)
    expect(advanceProspect(ADRIAN, PELL, 'acceptance')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_ACCEPTED' })
    expect(herStep(PELL, PELL, 'accept')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_ACCEPTED' })
    expect(store().messages.filter((m) => m.kind === 'onboarding_opened')).toHaveLength(1)
    expect(deliverableNow(record)).toEqual(['adv_2b', 'privacy_notice'])
  })

  it('leaves the Johnson orders unreleasable on Monday too: the session open then is not the frozen day\'s', () => {
    const proposal = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002')).detail
    const fp = proposal.versions[0]?.fingerprint ?? ''
    const approval = ok(approveProposal(ADRIAN, proposal.id, 1, fp)).act
    sentToHer()
    ok(advanceProspect(ADRIAN, PELL, 'acceptance'))
    expect(releaseOrders('cco-001', proposal.id, approval.id, fp, 'Reviewed.')).toEqual({
      ok: false, status: 409, code: 'MARKET_CLOSED', message: 'Fills are priced only in the 25 Feb session; after a clock jump, staged orders stay staged.',
    })
  })
})

describe('what her steps read', () => {
  it('she and the firm read her steps; Robert does not; the next jump says what it waits for', () => {
    expect(partySteps(PELL, PELL)).toEqual({ questionnaire: 'unavailable', statements: 'unavailable', acceptance: 'unavailable' })
    expect(partySteps('cli-001', PELL)).toBeUndefined()
    expect(nextJumpOf(requireProspect(PELL))).toEqual({ to: 'reply', at: '2026-02-26T14:10:00.000Z', blockedReason: 'Record the coffee first; her reply follows it.' })
    coffee()
    expect(partySteps(ADRIAN, PELL)).toEqual({ questionnaire: 'open', statements: 'open', acceptance: 'unavailable' })
    expect(nextJumpOf(requireProspect(PELL))).toEqual({ to: 'reply', at: '2026-02-26T14:10:00.000Z' })
    ok(advanceProspect(ADRIAN, PELL, 'reply'))
    expect(nextJumpOf(requireProspect(PELL))).toEqual({ to: 'acceptance', at: '2026-03-02T15:00:00.000Z', blockedReason: 'Send her the proposal first; her acceptance follows it.' })
  })
})
