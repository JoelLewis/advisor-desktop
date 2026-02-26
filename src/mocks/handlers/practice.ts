import { http, HttpResponse } from 'msw'
import { teamActivity, bookAnalytics } from '../data/practice'

export const practiceHandlers = [
  http.get('/api/practice/team-activity', () => HttpResponse.json(teamActivity)),
  http.get('/api/practice/book-analytics', () => HttpResponse.json(bookAnalytics)),
]
