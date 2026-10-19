import { useMutation, useQuery } from '@tanstack/react-query'
import * as api from '@/services/workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { AgendaItemInput, NoteLineInput } from '@/types/workspace-meeting'
import { useInvalidateWorkspace } from './use-workspace'

export function useMeetings(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'meetings'], queryFn: () => api.getMeetings(viewerId), enabled })
}

export function useMeeting(eventId: string) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'meeting', eventId], queryFn: () => api.getMeeting(viewerId, eventId) })
}

export function useHousehold(householdId: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'household', householdId], queryFn: () => api.getHousehold(viewerId, householdId), enabled })
}

export function useClientView(clientId: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'client', clientId], queryFn: () => api.getClientView(viewerId, clientId), enabled })
}

// Meeting mutations invalidate on settle, not success: a refused write (held meanwhile, notes moved) must refresh what is on screen too.

export function useRunMeetingPrep(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: () => api.runMeetingPrep(viewerId, eventId), onSettled: invalidate })
}

export function useReviseAgenda(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (items: AgendaItemInput[]) => api.reviseAgenda(viewerId, eventId, items), onSettled: invalidate })
}

export function useHoldMeeting(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: () => api.holdMeeting(viewerId, eventId), onSettled: invalidate })
}

export function useDraftMeetingNotes(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: () => api.draftMeetingNotes(viewerId, eventId), onSettled: invalidate })
}

export function useSaveMeetingNotes(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (lines: NoteLineInput[]) => api.saveMeetingNotes(viewerId, eventId, lines), onSettled: invalidate })
}

export function useFileMeetingRecord(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (fingerprint: string) => api.fileMeetingRecord(viewerId, eventId, fingerprint), onSettled: invalidate })
}

export function useDraftRecap(clientThreadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (eventId: string) => api.draftRecap(viewerId, clientThreadId, eventId), onSettled: invalidate })
}
