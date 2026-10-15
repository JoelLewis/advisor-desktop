import { describe, it, expect } from 'vitest'
import type { Message } from '@/types/workspace'
import { store } from '@/mocks/data/workspace-store'
import { approvalState, detailOf, proposalById } from '@/mocks/data/proposals-store'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { escalate, releaseOrders, returnToAdvisor } from '../compliance-acts'
import { LedgerInvariantError } from '../fills'
import { approveProposal, withdrawApproval } from '../proposal-acts'
import { createProposal, previewEdits, reviseProposal, saveVersion } from '../proposals'
import { ADRIAN, MARK, RATIONALE, approvedStoryV3, approvedV1, ok, release } from './story-fixture'

const kinds = () => store().acts.map((a) => a.kind)

describe('release_orders: separation of duties and the rationale', () => {
  it('only compliance releases; a client is told the proposal does not exist; nothing is recorded or filled', () => {
    const a = approvedV1()
    for (const viewer of ['user-001', 'user-002', 'user-003']) {
      expect(releaseOrders(viewer, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    }
    expect(releaseOrders('cli-001', a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 404 })
    expect(releaseOrders(MARK, 'prop-9999', a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 404 })
    expect(kinds()).toEqual(['approve_proposal'])
    expect(ledgerFills()).toEqual([])
  })

  it('a rationale is required and bounded; it is recorded trimmed', () => {
    const a = approvedV1()
    for (const blank of ['', '   ', '\n\n\t']) {
      expect(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, blank)).toMatchObject({ ok: false, status: 400, code: 'RATIONALE_REQUIRED' })
    }
    expect(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, 'x'.repeat(2001))).toMatchObject({ ok: false, status: 400, code: 'RATIONALE_TOO_LONG' })
    expect(ok(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, `  ${RATIONALE}\n`)).act.rationale).toBe(RATIONALE)
  })
})

describe('release_orders needs the matching active approval', () => {
  it('refuses another approval id and other evidence', () => {
    const a = approvedV1()
    expect(releaseOrders(MARK, a.proposalId, 'REC-0999', a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'NOT_THIS_APPROVAL' })
    expect(releaseOrders(MARK, a.proposalId, a.approvalActId, 'DEADBEEF', RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
  })

  it('refuses an approval the advisor withdrew, saying so', () => {
    const a = approvedV1()
    ok(withdrawApproval(ADRIAN, a.proposalId))
    const r = releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)
    expect(r).toMatchObject({ ok: false, status: 409, code: 'APPROVAL_WITHDRAWN' })
    expect(r.ok ? '' : r.message).toBe('The approval of v1 (REC-0001) was withdrawn by the advisor; nothing from it can be released.')
    expect(ledgerFills()).toEqual([])
  })

  it('refuses an approval a newer approval superseded', () => {
    const a = approvedV1()
    const v2 = ok(reviseProposal(ADRIAN, a.proposalId, [{ kind: 'harvest_only' }])).detail.versions[1]!
    ok(approveProposal(ADRIAN, a.proposalId, 2, v2.fingerprint))
    expect(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'APPROVAL_SUPERSEDED' })
  })

  it('refuses after the session has closed, recording nothing', () => {
    const a = approvedV1()
    store().sequence = 600
    expect(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'MARKET_CLOSED' })
    expect(kinds()).toEqual(['approve_proposal'])
  })
})

describe("releasing the story's v3", () => {
  it('a release whose fills break the ledger records nothing and leaves the event clock where it was', () => {
    const a = approvedV1()
    const s = store()
    // A staged sell larger than the holding: the ledger refuses it when the release applies the fills.
    s.staged = s.staged.map((o) => (o.side === 'sell' && o.symbol === 'SPY' ? { ...o, quantity: 1_000_000 } : o))
    const before = { sequence: s.sequence, acts: s.acts.length, messages: s.messages.length }
    expect(() => releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toThrow(LedgerInvariantError)
    expect({ sequence: s.sequence, acts: s.acts.length, messages: s.messages.length }).toEqual(before)
    expect(ledgerFills()).toEqual([])
  })

  it('records one act and its marker, then fills at the open and posts the fills', () => {
    const a = approvedStoryV3()
    const act = release(a)
    expect(act).toEqual({
      id: 'REC-0002', kind: 'release_orders', actorId: MARK, at: act.at, threadId: 'th-johnson-review',
      subject: { type: 'proposal', id: a.proposalId }, version: 3, fingerprint: a.fingerprint,
      summary: 'Released the orders staged from v3 of the Johnson rebalance', rationale: RATIONALE, approvalActId: 'REC-0001',
    })
    expect(act.at < '2026-02-25T14:30:00.000Z').toBe(true)
    const thread = store().messages.filter((m) => m.threadId === 'th-johnson-review')
    const [marker, report] = thread.slice(-2) as [Message, Message]
    expect(marker).toMatchObject({ kind: 'act', actId: 'REC-0002' })
    if (report.kind !== 'fills') throw new Error('the fills message follows the release')
    expect(report).toMatchObject({ title: 'Johnson rebalance', version: 3, releaseActId: 'REC-0002', at: '2026-02-25T14:35:00.000Z' })
    expect(report.fills.map((f) => [f.symbol, f.at])).toEqual([
      ['INTC', '2026-02-25T14:30:00.000Z'], ['EFA', '2026-02-25T14:31:00.000Z'], ['VWO', '2026-02-25T14:32:00.000Z'],
      ['AGG', '2026-02-25T14:33:00.000Z'], ['GLD', '2026-02-25T14:34:00.000Z'],
    ])
  })

  it('closes every staged order as filled, naming the act and its fill, and reads as released', () => {
    const a = approvedStoryV3()
    const act = release(a)
    const staged = store().staged.filter((o) => o.approvalActId === a.approvalActId)
    expect(staged.every((o) => o.status === 'filled' && o.closedByActId === act.id && o.fillId?.startsWith('fill-'))).toBe(true)
    const proposal = proposalById(a.proposalId)!
    expect(approvalState(proposal)).toEqual({ kind: 'released', version: 3, latestVersion: 3, approverId: ADRIAN, actId: 'REC-0001', releaseActId: 'REC-0002' })
    expect(detailOf(proposal).fills).toHaveLength(5)
  })

  it('a second release, by anyone, is refused and nothing fills twice', () => {
    const a = approvedStoryV3()
    release(a)
    const again = releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)
    expect(again).toMatchObject({ ok: false, status: 409, code: 'ALREADY_RELEASED' })
    expect(again.ok ? '' : again.message).toContain('REC-0002')
    expect(kinds()).toEqual(['approve_proposal', 'release_orders'])
    expect(ledgerFills()).toHaveLength(5)
  })

  it('records a presenter shortcut as compliance, with the firm-only marker', () => {
    const a = approvedV1()
    const act = ok(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE, { viaPresenter: { presenterId: ADRIAN } })).act
    expect(act).toMatchObject({ actorId: MARK, viaPresenter: { presenterId: ADRIAN } })
  })

  it("leaves Robert's thread and records exactly as they were", () => {
    const a = approvedV1()
    const robert = () => JSON.stringify([store().messages.filter((m) => m.threadId === 'th-robert'), store().acts.filter((x) => x.threadId === 'th-robert')])
    const before = robert()
    release(a)
    expect(robert()).toBe(before)
  })
})

describe('a filled proposal is closed; the next one starts from the moved book', () => {
  it('refuses revise, save, preview and approve', () => {
    const a = approvedStoryV3()
    release(a)
    for (const r of [
      reviseProposal(ADRIAN, a.proposalId, []), saveVersion(ADRIAN, a.proposalId, [{ kind: 'exclude', symbol: 'AGG' }]),
      previewEdits(ADRIAN, a.proposalId, []), approveProposal(ADRIAN, a.proposalId, 3, a.fingerprint),
    ]) expect(r).toMatchObject({ ok: false, status: 409, code: 'FILLED' })
  })

  it('asking the Proposal Agent again drafts a second proposal from the new book', () => {
    const a = approvedStoryV3()
    release(a)
    const next = createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    if (!next.ok) throw new Error(next.message)
    expect(next).toMatchObject({ created: true, detail: { id: 'prop-0002', title: 'Johnson rebalance 2' } })
    const v1 = next.detail.versions[0]!
    expect(v1.preview.trades.some((t) => t.symbol === 'INTC')).toBe(false)
    expect(v1.legFacts.flatMap((f) => f.lotIds)).not.toContain('lot-pos-023-0')
    const intc = v1.preview.repurchaseRestrictions.filter((r) => r.symbol === 'INTC')
    expect(intc).toContainEqual({ symbol: 'INTC', start: '2026-01-26', until: '2026-03-27', source: { kind: 'recorded', saleId: 'rs-006', accountId: 'acc-002', saleDate: '2026-02-25' } })
    expect(intc.some((r) => r.source.kind === 'projected')).toBe(false)
    expect(createProposal(ADRIAN, 'th-johnson-review', 'acc-002')).toMatchObject({ ok: true, created: false, detail: { id: 'prop-0002' } })
  })
})

describe('return_to_advisor and escalate', () => {
  it('a return withdraws the approval and returns the orders; the advisor may approve again', () => {
    const a = approvedV1()
    const act = ok(returnToAdvisor(MARK, a.proposalId, a.approvalActId, a.fingerprint, 'The SPY concentration needs a plan first.')).act
    expect(act).toMatchObject({ kind: 'return_to_advisor', summary: 'Returned v1 of the Johnson rebalance to the advisor; the approval is withdrawn', approvalActId: 'REC-0001' })
    expect(store().approvals[0]?.status).toBe('returned')
    expect(store().staged.every((o) => o.status === 'returned' && o.closedByActId === act.id)).toBe(true)
    expect(approvalState(proposalById(a.proposalId)!).kind).toBe('unapproved')
    expect(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'APPROVAL_RETURNED' })
    expect(approveProposal(ADRIAN, a.proposalId, 1, a.fingerprint).ok).toBe(true)
  })

  it('an escalation holds the orders, once; they can still be released', () => {
    const a = approvedV1()
    const act = ok(escalate(MARK, a.proposalId, a.approvalActId, a.fingerprint, 'Concentration exception needs the investment committee.')).act
    expect(act.summary).toBe('Escalated the orders staged from v1 of the Johnson rebalance; they stay held')
    expect(detailOf(proposalById(a.proposalId)!).escalation).toEqual({ actId: act.id, at: act.at })
    expect(store().staged.every((o) => o.status === 'pending_compliance')).toBe(true)
    expect(escalate(MARK, a.proposalId, a.approvalActId, a.fingerprint, 'Again.')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_ESCALATED' })
    expect(escalate(ADRIAN, a.proposalId, a.approvalActId, a.fingerprint, 'Mine.')).toMatchObject({ ok: false, status: 403 })
    expect(release(a).kind).toBe('release_orders')
  })
})
