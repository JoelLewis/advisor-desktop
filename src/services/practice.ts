import { get } from './api-client'
import type { TeamMemberActivity, BookAnalytics } from '@/types/practice'

export function getTeamActivity() {
  return get<TeamMemberActivity[]>('/practice/team-activity')
}

export function getBookAnalytics() {
  return get<BookAnalytics>('/practice/book-analytics')
}
