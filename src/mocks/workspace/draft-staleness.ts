import type { Draft } from '@/types/workspace'
import { isDraftStale } from '@/mocks/data/proposals-store'
import { store } from '@/mocks/data/workspace-store'

/** A recap is current only while the meeting's filing is exactly the one it was written from. */
export function isRecapStale(draft: Draft): boolean {
  const basis = draft.recordBasis
  if (!basis) return false
  const filed = store().meetings.find((m) => m.eventId === basis.eventId)?.filed
  return !filed || filed.actId !== basis.actId || filed.fingerprint !== basis.fingerprint
}

/** Whether an agent letter's basis — an approved version, or a filed record — no longer holds. */
export const isStale = (draft: Draft): boolean => isDraftStale(draft) || isRecapStale(draft)

export function staleMessage(draft: Draft): string {
  return draft.recordBasis
    ? `This recap was drafted from ${draft.recordBasis.actId}, which no longer matches the filed record. Ask for a new recap.`
    : `This letter was drafted from v${draft.basis?.version ?? 0}, which is no longer the approved version. Ask for a new letter.`
}
