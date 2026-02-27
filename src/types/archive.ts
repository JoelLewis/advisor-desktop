export const ARCHIVE_DOC_TYPES = [
  'email_draft', 'meeting_prep', 'portfolio_review', 'proposal',
  'compliance_note', 'trade_rationale', 'client_summary', 'report',
] as const

export type ArchiveDocType = (typeof ARCHIVE_DOC_TYPES)[number]

export const ARCHIVE_DOC_TYPE_LABELS: Record<ArchiveDocType, string> = {
  email_draft: 'Email Draft',
  meeting_prep: 'Meeting Prep',
  portfolio_review: 'Portfolio Review',
  proposal: 'Proposal',
  compliance_note: 'Compliance Note',
  trade_rationale: 'Trade Rationale',
  client_summary: 'Client Summary',
  report: 'Report',
}

export const ADVISOR_DISPOSITIONS = ['approved', 'edited', 'rejected'] as const
export type AdvisorDisposition = (typeof ADVISOR_DISPOSITIONS)[number]

export type ArchiveRecord = {
  id: string
  documentType: ArchiveDocType
  title: string
  clientId: string
  clientName: string
  advisorId: string
  advisorName: string
  aiModel: string
  dataSources: string[]
  disposition: AdvisorDisposition
  worm: boolean
  retentionPolicy: string
  retentionExpiresAt: string
  createdAt: string
  finalizedAt?: string
  originalContent: string
  finalContent: string
  editSummary?: string
}

export type ArchiveSearchParams = {
  query?: string
  clientId?: string
  docType?: ArchiveDocType
  disposition?: AdvisorDisposition
  dateFrom?: string
  dateTo?: string
}
