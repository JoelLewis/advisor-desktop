import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getNotificationCounts,
  markRead,
  dismissNotification,
  markAllRead,
} from '@/services/notifications'
import type { NotificationCategory } from '@/types/notification'

export function useNotifications(category?: NotificationCategory) {
  return useQuery({
    queryKey: ['notifications', category ?? 'all'],
    queryFn: () => getNotifications(category),
    staleTime: 30_000, // Refresh every 30s
  })
}

export function useNotificationCounts() {
  return useQuery({
    queryKey: ['notification-counts'],
    queryFn: getNotificationCounts,
    staleTime: 30_000,
    refetchInterval: 60_000, // Poll every 60s for badge updates
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-counts'] })
    },
  })
}

export function useDismissNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dismissNotification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-counts'] })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (category?: NotificationCategory) => markAllRead(category),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-counts'] })
    },
  })
}
