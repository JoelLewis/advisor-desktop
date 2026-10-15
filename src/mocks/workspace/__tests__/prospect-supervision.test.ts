import { describe, it, expect } from 'vitest'
import { requireProspect } from '../prospects'
import { createProspectProposal } from '../prospect-proposals'
import { approveProspectProposal, sendProspectProposal } from '../prospect-acts'
import { advanceProspect, recordCoffee } from '../prospect-steps'
import { reviewCorrespondence } from '../compliance-acts'
import { archiveFor } from '../archive'
import { supervisionQueue } from '../supervision'
import { ADRIAN, withFormCrs } from './prospect-fixture'

const MARK = 'cco-001'
function throughAcceptance() {
  const ok = <T extends { ok: boolean }>(r: T) => { if (!r.ok) throw new Error(JSON.stringify(r)); return r as Extract<T, { ok: true }> }
  ok(recordCoffee(ADRIAN, 'prsp-011', 'Coffee.'))
  ok(advanceProspect(ADRIAN, 'prsp-011', 'reply'))
  const detail = ok(createProspectProposal(ADRIAN, 'prsp-011')).detail
  ok(approveProspectProposal(ADRIAN, detail.id, 1, detail.versions[0]?.fingerprint ?? '', 'Growth fits her answers.'))
  withFormCrs()
  const send = ok(sendProspectProposal(ADRIAN, detail.id)).act
  ok(advanceProspect(ADRIAN, 'prsp-011', 'acceptance'))
  return { detail, send }
}

describe('prospect work in the books', () => {
  it('files every prospect act under her name, and the sent proposal as a sent message', () => {
    throughAcceptance()
    const archive = archiveFor(MARK, { partyId: 'prsp-011' })
    expect(archive?.entries.map((e) => (e.kind === 'act' ? e.act.kind : e.kind))).toEqual([
      'approve_proposal', 'deliver_disclosure', 'send_to_party', 'sent_message', 'accept_proposal',
    ])
    expect(archive?.entries.every((e) => e.partyName === 'Dr. Amanda Pell')).toBe(true)
    expect(archive?.parties).toContainEqual({ id: 'prsp-011', name: 'Dr. Amanda Pell' })
    const accept = archive?.entries.find((e) => e.kind === 'act' && e.act.kind === 'accept_proposal')
    expect(accept?.kind === 'act' && accept.act.viaPresenter).toEqual({ presenterId: ADRIAN, path: 'scripted' })
  })

  it('Mark reviews the sent proposal after the jump to Monday, and it is listed as disposed today', () => {
    const { send } = throughAcceptance()
    const queue = supervisionQueue(MARK)
    const item = queue?.correspondence.find((c) => c.id === send.messageId)
    expect(item).toMatchObject({ partyId: 'prsp-011', partyName: 'Dr. Amanda Pell', partyKind: 'prospect', title: 'Message to Dr. Amanda Pell' })
    const review = reviewCorrespondence(MARK, send.messageId ?? '', 'reviewed', send.fingerprint, 'Reviewed the proposal as she received it, with ADV 2A delivered in the same record.')
    if (!review.ok) throw new Error(review.message)
    expect(review.act.at.startsWith('2026-03-02')).toBe(true)
    expect(review.act.summary).toBe('Reviewed the message sent to Dr. Amanda Pell')
    expect(supervisionQueue(MARK)?.disposedToday.map((d) => d.act.id)).toEqual([review.act.id])
    expect(requireProspect('prsp-011').stage).toBe('onboarding')
  })
})
