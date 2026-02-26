import { get } from './api-client'
import type { CalendarEvent, MeetingPrep } from '@/types/calendar'

export function getEvents(params?: Record<string, string>) {
  return get<CalendarEvent[]>('/calendar/events', params)
}

export function getSchedule(date: string) {
  return get<CalendarEvent[]>('/calendar/schedule', { date })
}

export function getMeetingPrep(eventId: string) {
  return get<MeetingPrep>(`/calendar/events/${eventId}/prep`)
}
