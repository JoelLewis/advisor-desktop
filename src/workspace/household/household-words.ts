import type { GoalStatus } from '@/types/planning'
import type { DocumentType, SignatureStatus } from '@/types/document'
import type { CommChannel } from '@/types/client-comms'
import type { IpsOnFile } from '@/types/workspace-household'
import { fmtDate } from '@/kit/measure'
import { joinWords } from '@/lib/words'

export const GOAL_STATUS_TAG: Readonly<Record<GoalStatus, string>> = { on_track: 'ON TRACK', at_risk: 'AT RISK', off_track: 'OFF TRACK', not_analyzed: 'NOT ANALYZED' }

export const SIGNATURE_WORDS: Readonly<Record<SignatureStatus, string>> = {
  not_required: 'no signature required', pending: 'awaiting signature', signed: 'signed', expired: 'signature expired',
}

/** The IPS on file as one line, for every place a household or client view states it. */
export function ipsLine(ips: IpsOnFile | undefined): string {
  if (!ips) return 'No investment policy statement on file.'
  const status = ips.signatureStatus === 'signed' && ips.signedOn ? `signed ${fmtDate(ips.signedOn)}` : SIGNATURE_WORDS[ips.signatureStatus]
  return `${ips.name} · ${status}`
}

/** The held-away pane's wash-sale policy, naming the household's held-away employer plans as Meeting Prep does. */
export function heldAwayPolicy(heldAway: readonly { accountType: string }[]): string {
  const planNames = [...new Set(heldAway.flatMap((h) => h.accountType.match(/^(?:401\(k\)|403\(b\))/) ?? []))]
  const plans = planNames.length > 0 ? `the held-away ${joinWords(planNames)}` : 'held-away employer plans'
  return `The firm does not manage these and cannot see their holdings. A purchase in an IRA or Roth still counts for the taxpayer's wash-sale windows; the firm treats purchases in ${plans} as if they count, though the rule for employer plans is unsettled.`
}

export const DOCUMENT_TYPE_WORDS: Readonly<Record<DocumentType, string>> = {
  ips: 'IPS', proposal: 'Proposal', agreement: 'Agreement', statement: 'Statement', tax_report: 'Tax report',
  correspondence: 'Correspondence', compliance: 'Compliance', meeting_notes: 'Meeting notes', other: 'Other',
}

export const CHANNEL_WORDS: Readonly<Record<CommChannel, string>> = { email: 'Email', phone: 'Phone', video: 'Video', in_person: 'In person', letter: 'Letter' }
