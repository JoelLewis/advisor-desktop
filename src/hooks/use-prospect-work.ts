import { useMutation, useQuery } from '@tanstack/react-query'
import * as api from '@/services/workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { DisclosureDocument, ProspectConstraint, ProspectStepName } from '@/types/workspace-prospect'
import { useInvalidateWorkspace } from './use-workspace'

export function useProspects(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'prospects'], queryFn: () => api.getProspects(viewerId), enabled })
}

export function useProspect(id: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'prospect', id], queryFn: () => api.getProspect(viewerId, id), enabled })
}

export function usePartySteps(id: string) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'prospect-steps', id], queryFn: () => api.getPartySteps(viewerId, id) })
}

export function useProspectProposals(id: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'prospect-proposals', id], queryFn: () => api.getProspectProposals(viewerId, id), enabled })
}

// Every prospect write invalidates on settle, not success: a refused write (sent meanwhile, already answered) must refresh what is on screen too.

export function useRecordCoffee(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (body: string) => api.recordCoffee(viewerId, id, body), onSettled: invalidate })
}

export function useAdvanceProspect(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (to: 'reply' | 'acceptance') => api.advanceProspect(viewerId, id, to), onSettled: invalidate })
}

export function useHerStep(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (step: ProspectStepName) => api.takeHerStep(viewerId, id, step), onSettled: invalidate })
}

export function useActAsProspect(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (step: ProspectStepName) => api.actAsProspect(viewerId, id, step), onSettled: invalidate })
}

export function useCreateProspectProposal(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: () => api.createProspectProposal(viewerId, id), onSettled: invalidate })
}

export function useReviseProspectProposal(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ proposalId, constraints }: { proposalId: string; constraints: ProspectConstraint[] }) => api.reviseProspectProposal(viewerId, id, proposalId, constraints),
    onSettled: invalidate,
  })
}

export function useDeliverDisclosure(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (document: DisclosureDocument) => api.deliverDisclosure(viewerId, id, document), onSettled: invalidate })
}

export function useApproveProspectProposal() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ proposalId, version, fingerprint, rationale }: { proposalId: string; version: number; fingerprint: string; rationale: string }) =>
      api.approveProspectProposal(viewerId, proposalId, version, fingerprint, rationale),
    onSettled: invalidate,
  })
}

export function useSendProspectProposal() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (proposalId: string) => api.sendProspectProposal(viewerId, proposalId), onSettled: invalidate })
}
