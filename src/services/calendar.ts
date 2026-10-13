import { get } from './api-client'
import type { CalendarEvent } from '@/types/calendar'

export function getEvents(params?: Record<string, string>) {
  return get<CalendarEvent[]>('/calendar/events', params)
}

export function getSchedule(date: string) {
  return get<CalendarEvent[]>('/calendar/schedule', { date })
}
