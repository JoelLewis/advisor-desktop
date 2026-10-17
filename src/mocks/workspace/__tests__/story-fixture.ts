import type { BindingAct } from '@/types/workspace'
import { createProposal, reviseProposal, saveVersion } from '../proposals'
import { approveProposal } from '../proposal-acts'
import { draftLetter } from '../letters'
import { sendToParty } from '../acts'
import { releaseOrders } from '../compliance-acts'

export const ADRIAN = 'user-001'
export const MARK = 'cco-001'
export const ROBERT = 'cli-001'
export const RATIONALE = 'Reviewed the approved version, its legs and its pre-trade check results.'

export type Approved = { proposalId: string; version: number; approvalActId: string; fingerprint: string }

/** The engine's answer when it must have succeeded; a refusal fails the test with its reason. */
export function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(`refused: ${JSON.stringify(r)}`)
  return r as Extract<T, { ok: true }>
}

export function approvedV1(): Approved {
  const { detail } = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002'))
  const v1 = detail.versions[0]!
  const { act } = ok(approveProposal(ADRIAN, detail.id, 1, v1.fingerprint))
  return { proposalId: detail.id, version: 1, approvalActId: act.id, fingerprint: v1.fingerprint }
}

/** The Phase 3 story's approval: revised to harvest only, QAI excluded on the workbench, v3 approved. */
export function approvedStoryV3(): Approved {
  const { detail } = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002'))
  ok(reviseProposal(ADRIAN, detail.id, [{ kind: 'harvest_only' }]))
  const v3 = ok(saveVersion(ADRIAN, detail.id, [{ kind: 'exclude', symbol: 'QAI' }])).detail.versions[2]!
  const { act } = ok(approveProposal(ADRIAN, detail.id, 3, v3.fingerprint))
  return { proposalId: detail.id, version: 3, approvalActId: act.id, fingerprint: v3.fingerprint }
}

export function release(a: Approved, rationale = RATIONALE): BindingAct {
  return ok(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, rationale)).act
}

/** Robert's letter from the approved version, sent by Adrian. */
export function sendLetter(a: Approved): { act: BindingAct; messageId: string } {
  const { draft } = ok(draftLetter(ADRIAN, 'th-robert', a.proposalId))
  const { act } = ok(sendToParty(ADRIAN, draft.id))
  if (!act.messageId) throw new Error('A sent letter names the message it delivered')
  return { act, messageId: act.messageId }
}
