import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProposalTemplates,
  createProposal,
  getProposal,
  generateSection,
  updateSection,
  runComplianceCheck,
  finalizeProposal,
  getClientProposals,
} from '@/services/proposals'

export function useProposalTemplates() {
  return useQuery({
    queryKey: ['proposal-templates'],
    queryFn: getProposalTemplates,
  })
}

export function useCreateProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, clientId }: { templateId: string; clientId: string }) =>
      createProposal(templateId, clientId),
    onSuccess: (data) => {
      queryClient.setQueryData(['proposal', data.id], data)
    },
  })
}

export function useProposal(id: string) {
  return useQuery({
    queryKey: ['proposal', id],
    queryFn: () => getProposal(id),
    enabled: !!id,
  })
}

export function useGenerateSection(proposalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sectionType: string) => generateSection(proposalId, sectionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] })
    },
  })
}

export function useUpdateSection(proposalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sectionId, content }: { sectionId: string; content: string }) =>
      updateSection(proposalId, sectionId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] })
    },
  })
}

export function useProposalComplianceCheck(proposalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => runComplianceCheck(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] })
    },
  })
}

export function useFinalizeProposal(proposalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => finalizeProposal(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] })
    },
  })
}

export function useClientProposals(clientId: string) {
  return useQuery({
    queryKey: ['client-proposals', clientId],
    queryFn: () => getClientProposals(clientId),
    enabled: !!clientId,
  })
}
