import type { GoalStatus } from '@/types/planning'
import type { DocumentType, SignatureStatus } from '@/types/document'
import type { CommChannel } from '@/types/client-comms'
import type { IpsOnFile } from '@/types/workspace-household'
import { fmtDate } from '@/kit/measure'

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

export const DOCUMENT_TYPE_WORDS: Readonly<Record<DocumentType, string>> = {
  ips: 'IPS', proposal: 'Proposal', agreement: 'Agreement', statement: 'Statement', tax_report: 'Tax report',
  correspondence: 'Correspondence', compliance: 'Compliance', meeting_notes: 'Meeting notes', other: 'Other',
}

export const CHANNEL_WORDS: Readonly<Record<CommChannel, string>> = { email: 'Email', phone: 'Phone', video: 'Video', in_person: 'In person', letter: 'Letter' }
