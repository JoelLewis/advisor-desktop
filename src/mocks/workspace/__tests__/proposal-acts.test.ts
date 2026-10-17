import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { approvalState } from '@/mocks/data/proposals-store'
import { approveProposal, withdrawApproval } from '../proposal-acts'
import { sendToParty } from '../acts'
import { AGENT_CONSTRAINTS, seedJohnsonProposal, versionOf } from './proposal-fixture'
import { JOHNSON_REASON } from '@/test/suitability-fixture'
import { suitabilityText } from '@/lib/suitability'

describe('approve_proposal', () => {
  beforeEach(() => resetWorkspaceStore())

  it('records one act in the team thread and puts every leg pending compliance release', () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    const r = approveProposal('user-001', p.id, 1, v1.fingerprint, JOHNSON_REASON)
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
    expect(approveProposal('user-001', p.id, 1, 'DEADBEEF', JOHNSON_REASON)).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    expect(approveProposal('user-001', p.id, 2, fp, JOHNSON_REASON)).toMatchObject({ ok: false, status: 404, code: 'NO_VERSION' })
    expect(approveProposal('user-001', p.id, 1, fp, JOHNSON_REASON).ok).toBe(true)
    expect(approveProposal('user-001', p.id, 1, fp, JOHNSON_REASON)).toMatchObject({ ok: false, status: 409, code: 'ALREADY_APPROVED' })
    expect(store().acts).toHaveLength(1)
  })

  it('only the advisor approves; a client cannot even see the proposal', () => {
    const p = seedJohnsonProposal()
    const fp = p.versions[0]!.fingerprint
    expect(approveProposal('user-002', p.id, 1, fp, JOHNSON_REASON)).toMatchObject({ ok: false, status: 403 })
    expect(approveProposal('user-003', p.id, 1, fp, JOHNSON_REASON)).toMatchObject({ ok: false, status: 403 })
    expect(approveProposal('cco-001', p.id, 1, fp, JOHNSON_REASON)).toMatchObject({ ok: false, status: 403 })
    expect(approveProposal('cli-001', p.id, 1, fp, JOHNSON_REASON)).toMatchObject({ ok: false, status: 404 })
    expect(approveProposal('user-001', 'prop-9999', 1, fp, JOHNSON_REASON)).toMatchObject({ ok: false, status: 404 })
    expect(store().acts).toEqual([])
  })

  it('refuses a version the pre-trade check blocks', () => {
    const p = seedJohnsonProposal()
    const blocked = versionOf(2, AGENT_CONSTRAINTS, [{ kind: 'quantity', symbol: 'VWO', quantity: 100_000 }])
    expect(blocked.pretrade.violations.some((v) => v.severity === 'block')).toBe(true)
    p.versions.push(blocked)
    expect(approveProposal('user-001', p.id, 2, blocked.fingerprint, JOHNSON_REASON)).toMatchObject({ ok: false, status: 409, code: 'BLOCKED' })
  })

  it('refuses a version with no legs', () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    p.versions.push({ ...v1, n: 2, preview: { ...v1.preview, trades: [] } })
    expect(approveProposal('user-001', p.id, 2, v1.fingerprint, JOHNSON_REASON)).toMatchObject({ ok: false, status: 409, code: 'NO_LEGS' })
    expect(store().staged).toEqual([])
  })

  it('a newer version leaves the approval on the older one; approving it withdraws the older approval in the same act', () => {
    const p = seedJohnsonProposal()
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, JOHNSON_REASON)
    const v2 = versionOf(2, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }])
    p.versions.push(v2)
    expect(approvalState(p)).toMatchObject({ kind: 'approved', version: 1, latestVersion: 2 })
    const r = approveProposal('user-001', p.id, 2, v2.fingerprint, JOHNSON_REASON)
    if (!r.ok) throw new Error(r.message)
    expect(r.act.summary).toBe('Approved v2 of the Johnson rebalance; the approval of v1 is withdrawn')
    expect(store().acts).toHaveLength(2)
    expect(store().approvals.map((a) => [a.version, a.status])).toEqual([[1, 'superseded'], [2, 'active']])
    expect(store().staged.filter((o) => o.version === 1).every((o) => o.status === 'withdrawn')).toBe(true)
    expect(store().staged.filter((o) => o.version === 2).every((o) => o.status === 'pending_compliance')).toBe(true)
    expect(store().staged.filter((o) => o.version === 1).every((o) => o.closedByActId === r.act.id)).toBe(true)
  })
})

describe('withdraw_approval', () => {
  beforeEach(() => resetWorkspaceStore())

  it('only the approver withdraws; the staging is withdrawn; nothing is ever released', () => {
    const p = seedJohnsonProposal()
    expect(withdrawApproval('user-001', p.id)).toMatchObject({ ok: false, status: 409, code: 'NOT_APPROVED' })
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, JOHNSON_REASON)
    expect(withdrawApproval('user-002', p.id)).toMatchObject({ ok: false, status: 403 })
    expect(withdrawApproval('cli-001', p.id)).toMatchObject({ ok: false, status: 404 })
    const r = withdrawApproval('user-001', p.id)
    if (!r.ok) throw new Error(r.message)
    expect(r.act).toMatchObject({ kind: 'withdraw_approval', version: 1, summary: 'Withdrew the approval of v1 of the Johnson rebalance' })
    expect(approvalState(p).kind).toBe('unapproved')
    expect(store().staged.every((o) => o.status === 'withdrawn')).toBe(true)
    expect(new Set(store().staged.map((o) => o.status))).not.toContain('released')
  })

  it('a firm viewer who may not withdraw is told so before being told nothing is approved', () => {
    const p = seedJohnsonProposal()
    expect(withdrawApproval('user-002', p.id)).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
  })

  it('withdrawn orders name the act that withdrew them', () => {
    const p = seedJohnsonProposal()
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, JOHNSON_REASON)
    const r = withdrawApproval('user-001', p.id)
    if (!r.ok) throw new Error(r.message)
    expect(store().staged.every((o) => o.status === 'withdrawn' && o.closedByActId === r.act.id)).toBe(true)
  })
})

describe('send_to_party refuses a stale letter', () => {
  beforeEach(() => resetWorkspaceStore())

  it('a letter drafted from v1 cannot be sent once v2 is the approval', () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    approveProposal('user-001', p.id, 1, v1.fingerprint, JOHNSON_REASON)
    store().drafts.push({ id: 'draft-0001', clientThreadId: 'th-robert', authorId: 'user-001', body: 'Letter', createdAt: 'x', agentId: 'client-letter', basis: { proposalId: p.id, version: 1, fingerprint: v1.fingerprint } })
    const v2 = versionOf(2, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }])
    p.versions.push(v2)
    approveProposal('user-001', p.id, 2, v2.fingerprint, JOHNSON_REASON)
    expect(sendToParty('user-001', 'draft-0001')).toMatchObject({ ok: false, status: 409, code: 'STALE_DRAFT' })
    expect(store().messages.some((m) => m.kind === 'text' && m.body === 'Letter')).toBe(false)
  })
})

describe('the suitability reason', () => {
  beforeEach(() => resetWorkspaceStore())

  it('refuses an approval without a reason while the model sits above the tolerance', () => {
    const p = seedJohnsonProposal()
    expect(approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint))
      .toMatchObject({ ok: false, status: 409, code: 'REASON_REQUIRED' })
    expect(store().acts).toHaveLength(0)
    expect(store().approvals).toHaveLength(0)
    expect(approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, { reason: 'ips_permits_growth' }).ok).toBe(true)
  })
  it('records the reason and its note on the act and the approval record, for the client it was judged for', () => {
    const p = seedJohnsonProposal()
    const r = approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, { reason: 'client_acknowledged_risk', note: 'Signed 12 Feb.' })
    if (!r.ok) throw new Error(r.message)
    const recorded = { reason: 'client_acknowledged_risk', note: 'Signed 12 Feb.', clientName: 'Robert Johnson' }
    expect(r.act.suitability).toEqual(recorded)
    expect(store().approvals[0]!.suitability).toEqual(recorded)
  })
  it("records the figure the accounts-as-a-whole reason rests on, from the version's own check", () => {
    const p = seedJohnsonProposal()
    const r = approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, { reason: 'accounts_within_tolerance' })
    if (!r.ok) throw new Error(r.message)
    expect(r.act.suitability).toEqual({
      reason: 'accounts_within_tolerance', clientName: 'Robert Johnson',
      whole: { score: 46, today: 51, toleranceBand: 'Moderate', floor: 41, ceiling: 55 },
    })
    if (!r.act.suitability) throw new Error('no suitability recorded')
    expect(suitabilityText(r.act.suitability)).toContain('46 pts after this proposal, from 51 pts today, within Moderate, 41–55 pts')
  })
  it("records v3's own figure: harvest only without QAI leaves the whole unchanged at 51, and the record says so", () => {
    const p = seedJohnsonProposal()
    const v3 = versionOf(3, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }], [{ kind: 'exclude', symbol: 'QAI' }])
    p.versions.push(v3)
    const r = approveProposal('user-001', p.id, 3, v3.fingerprint, { reason: 'accounts_within_tolerance' })
    if (!r.ok) throw new Error(r.message)
    expect(r.act.suitability?.whole).toEqual({ score: 51, today: 51, toleranceBand: 'Moderate', floor: 41, ceiling: 55 })
    if (!r.act.suitability) throw new Error('no suitability recorded')
    expect(suitabilityText(r.act.suitability)).toContain('51 pts, unchanged by this proposal, within Moderate, 41–55 pts')
  })
  it("refuses the accounts-as-a-whole reason when the client's accounts as a whole sit outside the tolerance", () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    v1.pretrade = {
      ...v1.pretrade,
      violations: v1.pretrade.violations.map((v) => (v.tolerance ? { ...v, tolerance: { ...v.tolerance, wholeAfterScore: 62, wholeAfterStatus: 'above' } } : v)),
    }
    expect(approveProposal('user-001', p.id, 1, v1.fingerprint, { reason: 'accounts_within_tolerance' }))
      .toMatchObject({ ok: false, status: 409, code: 'REASON_DOES_NOT_HOLD' })
    expect(approveProposal('user-001', p.id, 1, v1.fingerprint, { reason: 'client_acknowledged_risk' }).ok).toBe(true)
  })
  it('refuses a v2 approval without a reason, and leaves the v1 approval standing', () => {
    const p = seedJohnsonProposal()
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, JOHNSON_REASON)
    const v2 = versionOf(2, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }])
    p.versions.push(v2)
    expect(approveProposal('user-001', p.id, 2, v2.fingerprint)).toMatchObject({ ok: false, status: 409, code: 'REASON_REQUIRED' })
    expect(store().approvals.map((a) => [a.version, a.status])).toEqual([[1, 'active']])
    expect(store().acts).toHaveLength(1)
  })
  it('refuses an over-long or blank note', () => {
    const p = seedJohnsonProposal()
    const fp = p.versions[0]!.fingerprint
    expect(approveProposal('user-001', p.id, 1, fp, { reason: 'ips_permits_growth', note: 'x'.repeat(501) })).toMatchObject({ ok: false, status: 400, code: 'BAD_NOTE' })
    expect(approveProposal('user-001', p.id, 1, fp, { reason: 'ips_permits_growth', note: '  ' })).toMatchObject({ ok: false, status: 400, code: 'BAD_NOTE' })
  })
  it('refuses a reason for a version inside the tolerance', () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    // The same stored version without the check, as a model inside the tolerance would be; its fingerprint is unchanged.
    v1.pretrade = { ...v1.pretrade, violations: v1.pretrade.violations.filter((v) => v.category !== 'model_above_tolerance') }
    expect(approveProposal('user-001', p.id, 1, v1.fingerprint, { reason: 'ips_permits_growth' })).toMatchObject({ ok: false, status: 409, code: 'NO_SUITABILITY_GAP' })
  })
})
