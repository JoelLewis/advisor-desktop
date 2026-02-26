import { useQuery } from '@tanstack/react-query'
import { getTeamActivity, getBookAnalytics } from '@/services/practice'

export function useTeamActivity() {
  return useQuery({ queryKey: ['team-activity'], queryFn: getTeamActivity })
}

export function useBookAnalytics() {
  return useQuery({ queryKey: ['book-analytics'], queryFn: getBookAnalytics })
}
