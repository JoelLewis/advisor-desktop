import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { approvalState } from '@/mocks/data/proposals-store'
import { approveProposal, withdrawApproval } from '../proposal-acts'
import { sendToClient } from '../acts'
import { AGENT_CONSTRAINTS, seedJohnsonProposal, versionOf } from './proposal-fixture'

describe('approve_proposal', () => {
  beforeEach(() => resetWorkspaceStore())

  it('records one act in the team thread and stages every leg pending compliance', () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    const r = approveProposal('user-001', p.id, 1, v1.fingerprint)
    if (!r.ok) throw new Error(r.message)
    expect(r.act).toMatchObject({ id: 'REC-0001', kind: 'approve_proposal', actorId: 'user-001', threadId: 'th-johnson-review', subject: { type: 'proposal', id: p.id }, version: 1, fingerprint: v1.fingerprint, summary: 'Approved v1 of the Johnson rebalance' })
    const staged = store().staged
    expect(staged.map((o) => [o.symbol, o.side, o.quantity])).toEqual(v1.preview.trades.map((t) => [t.symbol, t.side, t.quantity]))
    expect(staged.every((o) => o.status === 'pending_compliance' && o.approvalActId === 'REC-0001')).toBe(true)
    const marker = store().messages[store().messages.length - 1]!
    expect(marker).toMatchObject({ kind: 'act', threadId: 'th-johnson-review', actId: 'REC-0001' })
    expect(approvalState(p)).toMatchObject({ kind: 'approved', version: 1, latestVersion: 1 })
  })

  it('refuses a second approval of the same version, a stale fingerprint, a missing version', () => {
    const p = seedJohnsonProposal()
    const fp = p.versions[0]!.fingerprint
    expect(approveProposal('user-001', p.id, 1, 'DEADBEEF')).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    expect(approveProposal('user-001', p.id, 2, fp)).toMatchObject({ ok: false, status: 404, code: 'NO_VERSION' })
    expect(approveProposal('user-001', p.id, 1, fp).ok).toBe(true)
    expect(approveProposal('user-001', p.id, 1, fp)).toMatchObject({ ok: false, status: 409, code: 'ALREADY_APPROVED' })
    expect(store().acts).toHaveLength(1)
  })

  it('only the advisor approves; a client cannot even see the proposal', () => {
    const p = seedJohnsonProposal()
    const fp = p.versions[0]!.fingerprint
    expect(approveProposal('user-002', p.id, 1, fp)).toMatchObject({ ok: false, status: 403 })
    expect(approveProposal('user-003', p.id, 1, fp)).toMatchObject({ ok: false, status: 403 })
    expect(approveProposal('cco-001', p.id, 1, fp)).toMatchObject({ ok: false, status: 403 })
    expect(approveProposal('cli-001', p.id, 1, fp)).toMatchObject({ ok: false, status: 404 })
    expect(approveProposal('user-001', 'prop-9999', 1, fp)).toMatchObject({ ok: false, status: 404 })
    expect(store().acts).toEqual([])
  })

  it('refuses a version the pre-trade check blocks', () => {
    const p = seedJohnsonProposal()
    const blocked = versionOf(2, AGENT_CONSTRAINTS, [{ kind: 'quantity', symbol: 'VWO', quantity: 100_000 }])
    expect(blocked.pretrade.violations.some((v) => v.severity === 'block')).toBe(true)
    p.versions.push(blocked)
    expect(approveProposal('user-001', p.id, 2, blocked.fingerprint)).toMatchObject({ ok: false, status: 409, code: 'BLOCKED' })
  })

  it('refuses a version with no legs', () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    p.versions.push({ ...v1, n: 2, preview: { ...v1.preview, trades: [] } })
    expect(approveProposal('user-001', p.id, 2, v1.fingerprint)).toMatchObject({ ok: false, status: 409, code: 'NO_LEGS' })
    expect(store().staged).toEqual([])
  })

  it('a newer version leaves the approval on the older one; approving it withdraws the older approval in the same act', () => {
    const p = seedJohnsonProposal()
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint)
    const v2 = versionOf(2, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }])
    p.versions.push(v2)
    expect(approvalState(p)).toMatchObject({ kind: 'approved', version: 1, latestVersion: 2 })
    const r = approveProposal('user-001', p.id, 2, v2.fingerprint)
    if (!r.ok) throw new Error(r.message)
    expect(r.act.summary).toBe('Approved v2 of the Johnson rebalance; the approval of v1 is withdrawn')
    expect(store().acts).toHaveLength(2)
    expect(store().approvals.map((a) => [a.version, a.status])).toEqual([[1, 'superseded'], [2, 'active']])
    expect(store().staged.filter((o) => o.version === 1).every((o) => o.status === 'withdrawn')).toBe(true)
    expect(store().staged.filter((o) => o.version === 2).every((o) => o.status === 'pending_compliance')).toBe(true)
  })
})

describe('withdraw_approval', () => {
  beforeEach(() => resetWorkspaceStore())

  it('only the approver withdraws; the staging is withdrawn; nothing is ever released', () => {
    const p = seedJohnsonProposal()
    expect(withdrawApproval('user-001', p.id)).toMatchObject({ ok: false, status: 409, code: 'NOT_APPROVED' })
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint)
    expect(withdrawApproval('user-002', p.id)).toMatchObject({ ok: false, status: 403 })
    expect(withdrawApproval('cli-001', p.id)).toMatchObject({ ok: false, status: 404 })
    const r = withdrawApproval('user-001', p.id)
    if (!r.ok) throw new Error(r.message)
    expect(r.act).toMatchObject({ kind: 'withdraw_approval', version: 1, summary: 'Withdrew the approval of v1 of the Johnson rebalance' })
    expect(approvalState(p).kind).toBe('unapproved')
    expect(store().staged.every((o) => o.status === 'withdrawn')).toBe(true)
    expect(new Set(store().staged.map((o) => o.status))).not.toContain('released')
  })
})

describe('send_to_client refuses a stale letter', () => {
  beforeEach(() => resetWorkspaceStore())

  it('a letter drafted from v1 cannot be sent once v2 is the approval', () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    approveProposal('user-001', p.id, 1, v1.fingerprint)
    store().drafts.push({ id: 'draft-0001', clientThreadId: 'th-robert', authorId: 'user-001', body: 'Letter', createdAt: 'x', agentId: 'client-letter', basis: { proposalId: p.id, version: 1, fingerprint: v1.fingerprint } })
    const v2 = versionOf(2, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }])
    p.versions.push(v2)
    approveProposal('user-001', p.id, 2, v2.fingerprint)
    expect(sendToClient('user-001', 'draft-0001')).toMatchObject({ ok: false, status: 409, code: 'STALE_DRAFT' })
    expect(store().messages.some((m) => m.kind === 'text' && m.body === 'Letter')).toBe(false)
  })
})
