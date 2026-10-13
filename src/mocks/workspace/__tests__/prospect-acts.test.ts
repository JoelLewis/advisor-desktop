import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { requireProspect } from '../prospects'
import { createProspectProposal, reviseProspectProposal } from '../prospect-proposals'
import { approveProspectProposal, sendProspectProposal } from '../prospect-acts'
import { deliverDisclosure } from '../disclosures'
import { sentMessages } from '../correspondence'
import { supervisionQueue } from '../supervision'
import { ADRIAN, withFormCrs, withHerReply } from './prospect-fixture'

const RATIONALE = 'Growth fits her answers and her long horizon; Stryker moves in kind and any sale is staged with her CPA.'
function drafted() {
  withHerReply()
  const r = createProspectProposal(ADRIAN, 'prsp-011')
  if (!r.ok) throw new Error(r.message)
  return r.detail
}
function approved(n = 1) {
  const detail = drafted()
  const v = detail.versions[n - 1]
  if (!v) throw new Error('no version')
  const r = approveProspectProposal(ADRIAN, detail.id, n, v.fingerprint, RATIONALE)
  if (!r.ok) throw new Error(r.message)
  return { detail, act: r.act }
}

describe('approving her proposal', () => {
  it('records the approval of one exact version with the firm-only best-interest record, in the internal thread', () => {
    const { detail, act } = approved()
    expect(act).toMatchObject({
      kind: 'approve_proposal', actorId: ADRIAN, threadId: 'th-pell-work', subject: { type: 'prospect_proposal', id: detail.id },
      version: 1, fingerprint: detail.versions[0]?.fingerprint, summary: 'Approved v1 of the Pell proposal, with the best-interest record',
      bestInterest: { rationale: RATIONALE, modelName: 'Growth', score: 66, rollover: 'Rollover of the former employer 403(b): asked about; comparison to follow.' },
    })
    expect(act.bestInterest?.alternatives.map((a) => a.kind)).toEqual(['lower_risk_model', 'self_directed'])
    expect(store().prospectProposals[0]?.approval).toEqual({ version: 1, fingerprint: detail.versions[0]?.fingerprint, actId: act.id, approverId: ADRIAN, at: act.at })
    expect(store().messages.filter((m) => m.threadId === 'th-pell-work').map((m) => m.kind)).toEqual(['prospect_proposal', 'act'])
  })

  it('opens the rollover follow-up once, owned by the approver, due five trading days after the approval day', () => {
    const { act } = approved()
    expect(requireProspect('prsp-011').tasks).toEqual([{ id: 'ptask-0001', text: 'Rollover of the former employer 403(b): asked about; comparison to follow. Prepare the comparison.',
      ownerId: ADRIAN, due: '2026-03-04', createdAt: act.at, fromActId: act.id }])
  })

  it('refuses content that moved, a blank or overlong rationale, a second approval of the same version; supersedes on another', () => {
    const detail = drafted()
    const v1 = detail.versions[0]
    if (!v1) throw new Error('no v1')
    expect(approveProspectProposal(ADRIAN, detail.id, 1, 'DEADBEEF', RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    for (const bad of ['', '   ', 'x'.repeat(2001)]) expect(approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, bad)).toMatchObject({ ok: false, status: 400, code: 'BAD_RATIONALE' })
    expect(approveProspectProposal(ADRIAN, detail.id, 9, v1.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 404, code: 'NO_VERSION' })
    const first = approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, RATIONALE)
    if (!first.ok) throw new Error(first.message)
    expect(approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, RATIONALE)).toEqual({ ok: false, status: 409, code: 'ALREADY_APPROVED', message: `v1 is already approved (${first.act.id}).` })
    const revised = reviseProspectProposal(ADRIAN, detail.id, [{ kind: 'stage_diversification', tranches: 2 }])
    if (!revised.ok) throw new Error(revised.message)
    const v2 = revised.detail.versions[1]
    if (!v2) throw new Error('no v2')
    expect(approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, RATIONALE)).toEqual({ ok: false, status: 409, code: 'NOT_LATEST', message: 'v2 is newer than v1; review v2 before approving.' })
    const second = approveProspectProposal(ADRIAN, detail.id, 2, v2.fingerprint, RATIONALE)
    expect(second.ok && second.act.summary).toBe('Approved v2 of the Pell proposal, with the best-interest record; the approval of v1 is withdrawn')
    expect(requireProspect('prsp-011').tasks).toHaveLength(1)
  })

  it('only the advisor approves; outsiders are told it does not exist', () => {
    const detail = drafted()
    const fp = detail.versions[0]?.fingerprint ?? ''
    for (const viewer of ['user-002', 'user-003', 'cco-001']) expect(approveProspectProposal(viewer, detail.id, 1, fp, RATIONALE), viewer).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    for (const viewer of ['prsp-011', 'cli-001']) expect(approveProspectProposal(viewer, detail.id, 1, fp, RATIONALE), viewer).toMatchObject({ ok: false, status: 404 })
  })
})

describe('sending it to her', () => {
  it('is refused before Form CRS, and records nothing', () => {
    const { detail } = approved()
    const acts = store().acts.length
    expect(sendProspectProposal(ADRIAN, detail.id)).toEqual({ ok: false, status: 409, code: 'FORM_CRS_REQUIRED',
      message: 'Firm policy: deliver Form CRS first; it comes before or with the first recommendation.' })
    expect(store().acts).toHaveLength(acts)
    expect(requireProspect('prsp-011').disclosures).toEqual([])
  })

  it('is refused without an approval, and when a newer version exists', () => {
    const detail = drafted()
    withFormCrs()
    expect(sendProspectProposal(ADRIAN, detail.id)).toMatchObject({ ok: false, status: 409, code: 'NOT_APPROVED' })
    const v1 = detail.versions[0]
    if (!v1) throw new Error('no v1')
    approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, RATIONALE)
    reviseProspectProposal(ADRIAN, detail.id, [{ kind: 'stage_diversification', tranches: 2 }])
    expect(sendProspectProposal(ADRIAN, detail.id)).toEqual({ ok: false, status: 409, code: 'NEWER_VERSION', message: 'v2 is newer than the approved v1; approve the version you mean to send.' })
  })

  it('sends the approved version with ADV 2A in the same act, the delivery line first, and closes the proposal', () => {
    const { detail } = approved()
    withFormCrs()
    const r = sendProspectProposal(ADRIAN, detail.id)
    if (!r.ok) throw new Error(r.message)
    const v1 = detail.versions[0]
    const text = store().messages.find((m) => m.kind === 'text' && m.id === r.act.messageId)
    expect(r.act).toMatchObject({
      kind: 'send_to_party', actorId: ADRIAN, threadId: 'th-pell', subject: { type: 'prospect_proposal', id: detail.id }, version: 1,
      basis: { proposalId: detail.id, version: 1, fingerprint: v1?.fingerprint }, delivers: ['adv_2a'],
      fingerprint: fingerprint(v1?.clientSummary ?? ''), summary: 'Sent v1 of the Pell proposal to Dr. Amanda Pell, with Form ADV Part 2A (firm brochure)',
    })
    expect(text).toMatchObject({ kind: 'text', threadId: 'th-pell', authorId: ADRIAN, body: v1?.clientSummary })
    const afterCrs = store().messages.filter((m) => m.threadId === 'th-pell' && m.id !== 'msg-s07').slice(2)
    expect(afterCrs.map((m) => m.kind)).toEqual(['disclosure_delivered', 'text', 'act'])
    expect(requireProspect('prsp-011')).toMatchObject({ stage: 'proposal', sent: { proposalId: detail.id, version: 1, actId: r.act.id, messageId: r.act.messageId } })
    expect(requireProspect('prsp-011').disclosures.map((d) => [d.document, d.actId])).toEqual([['form_crs', 'REC-0002'], ['adv_2a', r.act.id]])
    expect(sendProspectProposal(ADRIAN, detail.id)).toEqual({ ok: false, status: 409, code: 'ALREADY_SENT', message: `v1 was already sent to her (${r.act.id}).` })
    expect(approveProspectProposal(ADRIAN, detail.id, 1, v1?.fingerprint ?? '', RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'ALREADY_SENT' })
  })

  it('delivers nothing more when ADV 2A went first; Mark finds the message in his correspondence queue', () => {
    const { detail } = approved()
    withFormCrs()
    deliverDisclosure(ADRIAN, 'prsp-011', 'adv_2a')
    const r = sendProspectProposal(ADRIAN, detail.id)
    if (!r.ok) throw new Error(r.message)
    expect(r.act.delivers).toBeUndefined()
    expect(r.act.summary).toBe('Sent v1 of the Pell proposal to Dr. Amanda Pell')
    expect(sentMessages().map((m) => m.message.id)).toContain(r.act.messageId)
    expect(supervisionQueue('cco-001')?.correspondence.map((c) => c.title)).toEqual(['Message to Dr. Amanda Pell'])
  })

  it('only the advisor sends', () => {
    const { detail } = approved()
    withFormCrs()
    expect(sendProspectProposal('user-002', detail.id)).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(sendProspectProposal('prsp-011', detail.id)).toMatchObject({ ok: false, status: 404 })
  })
})
