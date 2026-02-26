export type MeetingType =
  | 'annual_review'
  | 'quarterly_review'
  | 'planning'
  | 'prospect'
  | 'internal'
  | 'ad_hoc'

export type ScheduleView = 'day' | 'week' | 'agenda'

export type CalendarEvent = {
  id: string
  title: string
  clientId?: string
  clientName?: string
  meetingType: MeetingType
  startTime: string
  endTime: string
  location?: string
  notes?: string
  prepCompleted: boolean
}

export type MeetingPrepItem = {
  label: string
  value: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export type MeetingPrep = {
  eventId: string
  clientName: string
  meetingType: MeetingType
  portfolioSummary: MeetingPrepItem[]
  talkingPoints: string[]
  actionItems: string[]
  recentActivity: string[]
  generatedAt: string
}
