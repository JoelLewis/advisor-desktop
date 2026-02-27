import { get, post } from './api-client'
import type { Notification, NotificationCategory } from '@/types/notification'

type NotificationListResponse = {
  items: Notification[]
  unreadCount: number
}

type NotificationCountsResponse = {
  counts: Partial<Record<NotificationCategory, number>>
  total: number
}

export function getNotifications(category?: NotificationCategory) {
  const params: Record<string, string> = {}
  if (category) params.category = category
  return get<NotificationListResponse>('/notifications', params)
}

export function getNotificationCounts() {
  return get<NotificationCountsResponse>('/notifications/counts')
}

export function markRead(id: string) {
  return post<Notification>(`/notifications/${id}/read`)
}

export function dismissNotification(id: string) {
  return post<{ success: boolean }>(`/notifications/${id}/dismiss`)
}

export function markAllRead(category?: NotificationCategory) {
  return post<{ success: boolean }>('/notifications/mark-all-read', category ? { category } : {})
}
