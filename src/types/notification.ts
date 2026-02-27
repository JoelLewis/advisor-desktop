export const NOTIFICATION_CATEGORIES = [
  'compliance',
  'trades',
  'workflows',
  'nba',
  'ai',
  'team',
  'client',
] as const

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

export const NOTIFICATION_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number]

export type Notification = {
  id: string
  category: NotificationCategory
  priority: NotificationPriority
  title: string
  body: string
  timestamp: string
  read: boolean
  dismissed: boolean
  actionLabel?: string
  actionRoute?: string
  entityType?: 'client' | 'account' | 'household'
  entityId?: string
  entityName?: string
  source?: string
}

export type NotificationCounts = Record<NotificationCategory, number>
