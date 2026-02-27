import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMeetingNotes, saveMeetingNotes, createFollowUp, getFollowUps } from '@/services/calendar'
import type { MeetingNote, MeetingFollowUp } from '@/types/calendar'

export function useMeetingNotes(eventId: string | null) {
  return useQuery({
    queryKey: ['meeting-notes', eventId],
    queryFn: () => getMeetingNotes(eventId!),
    enabled: !!eventId,
  })
}

export function useSaveMeetingNotes(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sections: MeetingNote['sections']) => saveMeetingNotes(eventId, sections),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-notes', eventId] })
    },
  })
}

export function useFollowUps(eventId: string | null) {
  return useQuery({
    queryKey: ['follow-ups', eventId],
    queryFn: () => getFollowUps(eventId!),
    enabled: !!eventId,
  })
}

export function useCreateFollowUp(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Pick<MeetingFollowUp, 'title' | 'assignee' | 'dueDate'>) =>
      createFollowUp(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups', eventId] })
    },
  })
}
