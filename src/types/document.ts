export type DocumentType =
  | 'ips'
  | 'proposal'
  | 'agreement'
  | 'statement'
  | 'tax_report'
  | 'correspondence'
  | 'compliance'
  | 'meeting_notes'
  | 'other'

export type SignatureStatus = 'not_required' | 'pending' | 'signed' | 'expired'

export type Document = {
  id: string
  name: string
  type: DocumentType
  clientId: string
  accountId?: string
  fileUrl: string
  signatureStatus: SignatureStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  aiGenerated: boolean
}
