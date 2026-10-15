import type { ComplianceAlert, SupervisionRecord } from '@/types/compliance'
import type { AlertOutcome, BindingAct } from '@/types/workspace'
import type { AlertContext } from '@/types/workspace-supervision'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { store } from '@/mocks/data/workspace-store'
import { SUPERVISION_RECORDS, complianceAlerts } from '@/mocks/handlers/compliance'
import { fingerprint } from '@/lib/fingerprint'

/** How each disposition reads on the alert's record trail. */
export const ALERT_ACTION: Readonly<Record<AlertOutcome, string>> = { approve: 'Approved', reject: 'Rejected', request_changes: 'Changes requested' }

export const isAlertOutcome = (value: unknown): value is AlertOutcome => value === 'approve' || value === 'reject' || value === 'request_changes'

const AWAITING_REVIEW: ReadonlySet<ComplianceAlert['reviewStatus']> = new Set(['pending', 'in_review'])

export const alertById = (id: string): ComplianceAlert | undefined => complianceAlerts.find((a) => a.id === id)

export function alertDisposal(alertId: string): BindingAct | undefined {
  return store().acts.find((a) => a.kind === 'dispose_alert' && a.subject?.type === 'alert' && a.subject.id === alertId)
}

/** Awaiting compliance in the fixtures, and not yet disposed of this session. */
export function isOpenAlert(alert: ComplianceAlert): boolean {
  return AWAITING_REVIEW.has(alert.reviewStatus) && alertDisposal(alert.id) === undefined
}

/** The alert's supervision records: the fixtures' (sr-001 … sr-003), then the session's. */
export function recordTrailFor(alertId: string): SupervisionRecord[] {
  return [...SUPERVISION_RECORDS.filter((r) => r.alertId === alertId), ...store().supervisionRecords.filter((r) => r.alertId === alertId)]
}

/** The evidence a disposition acts on: the alert as stated and the trail it has. */
export function alertFingerprint(alert: ComplianceAlert): string {
  return fingerprint(JSON.stringify([alert.id, alert.title, alert.description, alert.reviewStatus, recordTrailFor(alert.id).map((r) => r.id)]))
}

/** The account and client an alert is about, as far as the fixtures name them. A trade alert names its account. */
export function alertContext(alert: ComplianceAlert): AlertContext {
  const accountId = alert.entityType === 'account' || alert.entityType === 'trade' ? alert.entityId : undefined
  const account = accounts.find((a) => a.id === accountId)
  const clientId = account?.clientId ?? (alert.entityType === 'client' ? alert.entityId : undefined)
  const client = clients.find((c) => c.id === clientId)
  return {
    ...(account ? { accountId: account.id, accountName: account.name } : {}),
    ...(client ? { clientId: client.id, clientName: client.fullName } : {}),
  }
}
