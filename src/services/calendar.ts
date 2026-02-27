import { get, post } from './api-client'
import type { CalendarEvent, MeetingPrep, MeetingNote, MeetingFollowUp } from '@/types/calendar'

export function getEvents(params?: Record<string, string>) {
  return get<CalendarEvent[]>('/calendar/events', params)
}

export function getSchedule(date: string) {
  return get<CalendarEvent[]>('/calendar/schedule', { date })
}

export function getMeetingPrep(eventId: string) {
  return get<MeetingPrep>(`/calendar/events/${eventId}/prep`)
}

export function getMeetingNotes(eventId: string) {
  return get<MeetingNote | null>(`/calendar/events/${eventId}/notes`)
}

export function saveMeetingNotes(eventId: string, sections: MeetingNote['sections']) {
  return post<MeetingNote>(`/calendar/events/${eventId}/notes`, { sections })
}

export function createFollowUp(eventId: string, data: Pick<MeetingFollowUp, 'title' | 'assignee' | 'dueDate'>) {
  return post<MeetingFollowUp>(`/calendar/events/${eventId}/follow-ups`, data)
}

export function getFollowUps(eventId: string) {
  return get<MeetingFollowUp[]>(`/calendar/events/${eventId}/follow-ups`)
}
