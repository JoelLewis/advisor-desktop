export type MeetingType =
  | 'annual_review'
  | 'quarterly_review'
  | 'planning'
  | 'prospect'
  | 'internal'
  | 'ad_hoc'

export type CalendarEvent = {
  id: string
  title: string
  clientId?: string
  clientName?: string
  meetingType: MeetingType
  /** Eastern local time with its offset, e.g. 2026-02-25T14:00:00-05:00. */
  startTime: string
  endTime: string
  location?: string
  notes?: string
  prepCompleted: boolean
  /** The client's household, on every event with a client. */
  householdId?: string
  /** Person and client ids: the client and household members invited, and the firm's people. */
  attendees: string[]
}
