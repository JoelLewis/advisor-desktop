import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { createProposal, reviseProposal } from '../proposals'
import { approveProposal } from '../proposal-acts'
import { sendToParty } from '../acts'
import { draftLetter, draftsFor, reviseDraft } from '../letters'

function approvedJohnson() {
  const created = createProposal('user-001', 'th-johnson-review', 'acc-002')
  if (!created.ok) throw new Error(created.message)
  const v1 = created.detail.versions[0]!
  const approved = approveProposal('user-001', created.detail.id, 1, v1.fingerprint)
  if (!approved.ok) throw new Error(approved.message)
  return { id: created.detail.id, v1 }
}

describe('letter drafts', () => {
  beforeEach(() => resetWorkspaceStore())

  it('needs an approved version', () => {
    const created = createProposal('user-001', 'th-johnson-review', 'acc-002')
    if (!created.ok) throw new Error(created.message)
    expect(draftLetter('user-001', 'th-robert', created.detail.id)).toMatchObject({ ok: false, status: 409, code: 'NO_APPROVED_VERSION' })
  })

  it('drafts into the firm-only drafts panel, tied to the approved version; asking again returns it', () => {
    const { id, v1 } = approvedJohnson()
    const r = draftLetter('user-001', 'th-robert', id)
    if (!r.ok) throw new Error(r.message)
    expect(r.created).toBe(true)
    expect(r.draft).toMatchObject({ clientThreadId: 'th-robert', authorId: 'user-001', agentId: 'client-letter', basis: { proposalId: id, version: 1, fingerprint: v1.fingerprint } })
    expect(draftLetter('user-001', 'th-robert', id)).toMatchObject({ ok: true, created: false, draft: { id: r.draft.id } })
    expect(store().drafts).toHaveLength(1)
    expect(store().messages.some((m) => m.threadId === 'th-robert' && m.kind !== 'text')).toBe(false)
  })

  it('a client, an analyst, a team thread and another client are refused', () => {
    const { id } = approvedJohnson()
    expect(draftLetter('cli-001', 'th-robert', id)).toMatchObject({ ok: false, status: 404 })
    expect(draftLetter('user-003', 'th-robert', id)).toMatchObject({ ok: false, status: 404 })
    expect(draftLetter('user-001', 'th-johnson-review', id)).toMatchObject({ ok: false, status: 400 })
    expect(draftLetter('user-002', 'th-robert', id).ok).toBe(true)
  })

  it('goes stale when the approval moves on, and send refuses it', () => {
    const { id } = approvedJohnson()
    const r = draftLetter('user-001', 'th-robert', id)
    if (!r.ok) throw new Error(r.message)
    expect(draftsFor('th-robert')[0]!.stale).toBe(false)
    const revised = reviseProposal('user-001', id, [{ kind: 'harvest_only' }])
    if (!revised.ok) throw new Error(revised.message)
    expect(draftsFor('th-robert')[0]!.stale).toBe(false)
    approveProposal('user-001', id, 2, revised.detail.versions[1]!.fingerprint)
    expect(draftsFor('th-robert')[0]!.stale).toBe(true)
    expect(sendToParty('user-001', r.draft.id)).toMatchObject({ ok: false, status: 409, code: 'STALE_DRAFT' })
    const fresh = draftLetter('user-001', 'th-robert', id)
    expect(fresh).toMatchObject({ ok: true, created: true, draft: { basis: { version: 2 } } })
  })

  it('an edit replaces the draft, keeps its basis, and is what gets sent', () => {
    const { id } = approvedJohnson()
    const r = draftLetter('user-001', 'th-robert', id)
    if (!r.ok) throw new Error(r.message)
    const edited = reviseDraft('user-001', 'th-robert', r.draft.id, `${r.draft.body}\n\nP.S. Call me any time.`)
    if (!edited.ok) throw new Error(edited.message)
    expect(edited.draft).toMatchObject({ supersedes: r.draft.id, basis: r.draft.basis, agentId: 'client-letter', authorId: 'user-001' })
    expect(edited.draft.figures).toBeUndefined()
    expect(draftsFor('th-robert').map((d) => d.id)).toEqual([edited.draft.id])
    expect(reviseDraft('user-001', 'th-robert', edited.draft.id, '  ')).toMatchObject({ ok: false, status: 400 })
    expect(reviseDraft('cli-001', 'th-robert', edited.draft.id, 'x')).toMatchObject({ ok: false, status: 404 })
    const sent = sendToParty('user-001', edited.draft.id)
    expect(sent.ok).toBe(true)
    const robertSees = store().messages.filter((m) => m.threadId === 'th-robert' && m.kind === 'text').map((m) => (m.kind === 'text' ? m.body : ''))
    expect(robertSees[robertSees.length - 1]).toContain('P.S. Call me any time.')
  })

  it('the send records the letter\'s basis and every person who edited it', () => {
    const { id, v1 } = approvedJohnson()
    const r = draftLetter('user-001', 'th-robert', id)
    if (!r.ok) throw new Error(r.message)
    const bySarah = reviseDraft('user-002', 'th-robert', r.draft.id, `${r.draft.body}\n\nSarah`)
    if (!bySarah.ok) throw new Error(bySarah.message)
    const byAdrian = reviseDraft('user-001', 'th-robert', bySarah.draft.id, `${bySarah.draft.body}\n\nAdrian`)
    if (!byAdrian.ok) throw new Error(byAdrian.message)
    const sent = sendToParty('user-001', byAdrian.draft.id)
    if (!sent.ok) throw new Error(sent.message)
    expect(sent.act).toMatchObject({ basis: { proposalId: id, version: 1, fingerprint: v1.fingerprint }, editedBy: ['user-002', 'user-001'] })
  })

  it('an unedited agent letter records no editors; a person\'s own draft records no letter provenance', () => {
    const { id } = approvedJohnson()
    const r = draftLetter('user-001', 'th-robert', id)
    if (!r.ok) throw new Error(r.message)
    const sent = sendToParty('user-001', r.draft.id)
    if (!sent.ok) throw new Error(sent.message)
    expect(sent.act.editedBy).toEqual([])
    expect(sent.act.basis).toEqual(r.draft.basis)
    const own = { id: 'draft-own', clientThreadId: 'th-robert', authorId: 'user-001', body: 'Your statement is ready.', createdAt: 'x' }
    store().drafts.push(own)
    const plain = sendToParty('user-001', own.id)
    if (!plain.ok) throw new Error(plain.message)
    expect(plain.act).not.toHaveProperty('basis')
    expect(plain.act).not.toHaveProperty('editedBy')
  })
})
