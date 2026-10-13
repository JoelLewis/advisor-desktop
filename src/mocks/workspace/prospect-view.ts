import type { ProspectView } from '@/types/workspace-prospect'
import { deliverableNow, deliveryOf } from './disclosures'
import { partyOf } from './party'
import { readableProspectProposals } from './prospect-proposals'
import { nextJumpOf } from './prospect-steps'
import { visibleProspect } from './prospects'
import { profileOf } from './risk-scoring'
import { transferSummary } from './transfer-in'

/** The prospect as a firm viewer reads her: her record with its readings, her proposals, the next clock jump and what may be delivered. */
export function prospectView(viewerId: string, prospectId: string): ProspectView | undefined {
  const record = visibleProspect(viewerId, prospectId)
  if (!record) return undefined
  const referrerName = record.referredBy === undefined ? undefined : partyOf(record.referredBy)?.name
  const profile = profileOf(record)
  const transfer = transferSummary(record)
  const nextJump = nextJumpOf(record)
  return {
    ...record,
    ...(referrerName ? { referrerName } : {}), ...(profile ? { profile } : {}), ...(transfer ? { transfer } : {}), ...(nextJump ? { nextJump } : {}),
    proposals: readableProspectProposals(viewerId, prospectId) ?? [],
    formCrsDelivered: deliveryOf(record, 'form_crs') !== undefined,
    deliverable: deliverableNow(record),
  }
}
