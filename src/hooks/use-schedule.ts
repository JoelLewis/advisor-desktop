import { useQuery } from '@tanstack/react-query'
import { getSchedule } from '@/services/calendar'

export function useSchedule(date: string) {
  return useQuery({
    queryKey: ['schedule', date],
    queryFn: () => getSchedule(date),
  })
}
