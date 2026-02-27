import { get, post, put } from './api-client'
import type {
  ProposalTemplate,
  ProposalDraft,
  ProposalSection,
  ProposalComplianceCheck,
} from '@/types/proposal'

export function getProposalTemplates() {
  return get<ProposalTemplate[]>('/proposals/templates')
}

export function createProposal(templateId: string, clientId: string) {
  return post<ProposalDraft>('/proposals/create', { templateId, clientId })
}

export function getProposal(id: string) {
  return get<ProposalDraft>(`/proposals/${id}`)
}

export function generateSection(proposalId: string, sectionType: string) {
  return post<ProposalSection>(`/proposals/${proposalId}/generate-section`, { sectionType })
}

export function updateSection(proposalId: string, sectionId: string, content: string) {
  return put<ProposalSection>(`/proposals/${proposalId}/sections/${sectionId}`, { content })
}

export function runComplianceCheck(proposalId: string) {
  return post<ProposalComplianceCheck[]>(`/proposals/${proposalId}/compliance-check`)
}

export function finalizeProposal(proposalId: string) {
  return post<{ success: boolean; proposalId: string; documentId: string; message: string }>(
    `/proposals/${proposalId}/finalize`,
  )
}

export function getClientProposals(clientId: string) {
  return get<ProposalDraft[]>(`/proposals/client/${clientId}`)
}
