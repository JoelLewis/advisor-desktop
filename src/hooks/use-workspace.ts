import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/services/workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { DEFAULT_VIEWER_ID } from '@/workspace/viewer/viewer-context'
import type { AgentId } from '@/types/workspace'
import type { ArchiveFilters, ComplianceActRequest, PresenterItem } from '@/types/workspace-supervision'
import type { LegEdit, ProposalConstraint } from '@/types/workspace-proposal'

export function useDirectory() {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'directory'],
    queryFn: () => api.getDirectory(viewerId),
  })
}

/**
 * Everyone the "view as" control can switch to. The control belongs to the person running the demo,
 * not to the current viewer, so it reads the directory as the advisor: a client's own directory names
 * only the people in their thread.
 */
export function useViewAsDirectory(enabled = true) {
  return useQuery({
    queryKey: ['workspace', DEFAULT_VIEWER_ID, 'directory'],
    queryFn: () => api.getDirectory(DEFAULT_VIEWER_ID),
    enabled,
  })
}

export function useThreads() {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'threads'],
    queryFn: () => api.getThreads(viewerId),
  })
}

export function useThread(id: string) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'thread', id],
    queryFn: () => api.getThread(viewerId, id),
  })
}

export function useDrafts(threadId: string, enabled: boolean) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'drafts', threadId],
    queryFn: () => api.getDrafts(viewerId, threadId),
    enabled,
  })
}

export function useActs(threadId: string) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'acts', threadId],
    queryFn: () => api.getActs(viewerId, threadId),
  })
}

/** Every query under this prefix is workspace state; a write can change what any viewer sees. */
export const WORKSPACE_QUERY_PREFIX = ['workspace'] as const

/** A write changes what every viewer sees (a sent draft reaches the client), so it marks the whole workspace stale, not just the writer's view. */
function useInvalidateWorkspace() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_PREFIX })
}

export function usePostMessage(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: (body: string) => api.postMessage(viewerId, threadId, body),
    onSuccess: invalidate,
  })
}

export function useCreateDraft(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: (body: string) => api.createDraft(viewerId, threadId, body),
    onSuccess: invalidate,
  })
}

export function useSendToClient() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: (draftId: string) => api.sendToClient(viewerId, draftId),
    onSuccess: invalidate,
  })
}

export function useRunAgent(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: (agentId: AgentId) => api.runAgent(viewerId, threadId, agentId),
    onSuccess: invalidate,
  })
}

export function useProposals(threadId?: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'proposals', threadId ?? 'all'],
    queryFn: () => api.getProposals(viewerId, threadId),
    enabled,
  })
}

export function useProposal(id: string) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'proposal', id], queryFn: () => api.getProposal(viewerId, id) })
}

/** The engine's preview of a draft version. The previous preview stays on screen while the next one loads. */
export function useProposalPreview(id: string, edits: LegEdit[], enabled: boolean) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'proposal-preview', id, JSON.stringify(edits)],
    queryFn: () => api.previewProposalEdits(viewerId, id, edits),
    enabled,
    placeholderData: keepPreviousData,
  })
}

// Proposal mutations invalidate on settle, not success: a refused write (a newer version arrived) must refresh what is on screen too.

export function useCreateProposal(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (accountId: string) => api.createProposal(viewerId, threadId, accountId), onSettled: invalidate })
}

export function useReviseProposal(proposalId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (constraints: ProposalConstraint[]) => api.reviseProposal(viewerId, proposalId, constraints), onSettled: invalidate })
}

export function useSaveVersion(proposalId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (edits: LegEdit[]) => api.saveProposalVersion(viewerId, proposalId, edits), onSettled: invalidate })
}

export function useApproveProposal() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ proposalId, version, fingerprint }: { proposalId: string; version: number; fingerprint: string }) =>
      api.approveProposal(viewerId, proposalId, version, fingerprint),
    onSettled: invalidate,
  })
}

export function useWithdrawApproval() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (proposalId: string) => api.withdrawApproval(viewerId, proposalId), onSettled: invalidate })
}

export function useCarryFinding(fromThreadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ messageId, toThreadId }: { messageId: string; toThreadId: string }) => api.carryFinding(viewerId, fromThreadId, messageId, toThreadId),
    onSettled: invalidate,
  })
}

export function useDraftLetter(clientThreadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (proposalId: string) => api.draftLetter(viewerId, clientThreadId, proposalId), onSettled: invalidate })
}

export function useReviseDraft(clientThreadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ draftId, body }: { draftId: string; body: string }) => api.reviseDraft(viewerId, clientThreadId, draftId, body),
    onSettled: invalidate,
  })
}

export function useSupervision() {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'supervision'], queryFn: () => api.getSupervision(viewerId) })
}

export function useArchive(filters: ArchiveFilters) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'archive', JSON.stringify(filters)],
    queryFn: () => api.getArchive(viewerId, filters),
    placeholderData: keepPreviousData,
  })
}

/** A compliance act can move the book (a release fills): accounts, positions, drift and lots are stale too, not only the workspace. */
function useInvalidateEverything() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}

export function useRecordComplianceAct() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateEverything()
  return useMutation({ mutationFn: (request: ComplianceActRequest) => api.recordComplianceAct(viewerId, request), onSettled: invalidate })
}

export type ComplianceActMutation = ReturnType<typeof useRecordComplianceAct>

export function useActAsCco() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateEverything()
  return useMutation({ mutationFn: (item: PresenterItem) => api.actAsCco(viewerId, item), onSettled: invalidate })
}
