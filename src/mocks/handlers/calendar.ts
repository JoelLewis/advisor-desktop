import { http, HttpResponse } from 'msw'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { calendarEvents } from '../data/calendar'

/**
 * The calendar's events and one day's schedule. Phase 5 · the generated prep, notes and follow-up
 * endpoints are gone: meeting prep and review are the workspace's meeting model, read from the engine.
 */
export const calendarHandlers = [
  http.get('/api/calendar/events', ({ request }) => {
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    let events = [...calendarEvents]
    if (from) events = events.filter((e) => e.startTime >= from)
    if (to) events = events.filter((e) => e.startTime <= to)
    return HttpResponse.json(events)
  }),

  http.get('/api/calendar/schedule', ({ request }) => {
    const date = new URL(request.url).searchParams.get('date') ?? MOCK_TODAY_ISO
    return HttpResponse.json(calendarEvents.filter((e) => e.startTime.startsWith(date)))
  }),
]
