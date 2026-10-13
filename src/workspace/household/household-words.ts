import type { GoalStatus } from '@/types/planning'
import type { SignatureStatus } from '@/types/document'
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
