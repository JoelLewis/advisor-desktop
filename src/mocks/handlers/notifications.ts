import { http, HttpResponse } from 'msw'
import { MOCK_NOTIFICATIONS } from '../data/notifications'
import type { Notification, NotificationCategory } from '@/types/notification'

// Session-persistent store
const store = new Map<string, Notification>(
  MOCK_NOTIFICATIONS.map((n) => [n.id, { ...n }]),
)

function getAll(): Notification[] {
  return Array.from(store.values())
    .filter((n) => !n.dismissed)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export const notificationHandlers = [
  // List notifications (with optional category filter)
  http.get('/api/notifications', ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category') as NotificationCategory | null
    let items = getAll()
    if (category) {
      items = items.filter((n) => n.category === category)
    }
    const unreadCount = items.filter((n) => !n.read).length
    return HttpResponse.json({ items, unreadCount })
  }),

  // Get unread counts by category
  http.get('/api/notifications/counts', () => {
    const items = getAll()
    const counts: Partial<Record<NotificationCategory, number>> = {}
    for (const n of items) {
      if (!n.read) {
        counts[n.category] = (counts[n.category] ?? 0) + 1
      }
    }
    const total = items.filter((n) => !n.read).length
    return HttpResponse.json({ counts, total })
  }),

  // Mark single notification as read
  http.post('/api/notifications/:id/read', ({ params }) => {
    const id = params.id as string
    const notif = store.get(id)
    if (!notif) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    notif.read = true
    store.set(id, notif)
    return HttpResponse.json(notif)
  }),

  // Dismiss single notification
  http.post('/api/notifications/:id/dismiss', ({ params }) => {
    const id = params.id as string
    const notif = store.get(id)
    if (!notif) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    notif.dismissed = true
    store.set(id, notif)
    return HttpResponse.json({ success: true })
  }),

  // Mark all as read (optionally by category)
  http.post('/api/notifications/mark-all-read', async ({ request }) => {
    const body = (await request.json()) as { category?: NotificationCategory } | null
    const category = body?.category
    for (const [id, notif] of store) {
      if (!notif.dismissed && !notif.read) {
        if (!category || notif.category === category) {
          notif.read = true
          store.set(id, notif)
        }
      }
    }
    return HttpResponse.json({ success: true })
  }),
]
