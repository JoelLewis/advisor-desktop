type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'flagged' | 'escalated'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type ComplianceAlert = {
  id: string
  type: string
  severity: AlertSeverity
  title: string
  description: string
  entityType: 'client' | 'account' | 'trade' | 'document'
  entityId: string
  reviewStatus: ReviewStatus
  createdAt: string
  resolvedAt?: string
}

export type SupervisionRecord = {
  id: string
  alertId: string
  /** The reviewing principal's id in the team directory (`people.ts`). */
  reviewerId: string
  /** Display label, derived from the directory: name and title. */
  reviewer: string
  action: string
  notes: string
  timestamp: string
}
