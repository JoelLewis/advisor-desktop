import { useQuery } from '@tanstack/react-query'
import { getSchedule, getMeetingPrep } from '@/services/calendar'

export function useSchedule(date: string) {
  return useQuery({
    queryKey: ['schedule', date],
    queryFn: () => getSchedule(date),
  })
}

export function useMeetingPrep(eventId: string | null) {
  return useQuery({
    queryKey: ['meeting-prep', eventId],
    queryFn: () => getMeetingPrep(eventId!),
    enabled: !!eventId,
  })
}
