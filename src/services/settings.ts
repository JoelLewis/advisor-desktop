import { get, put } from './api-client'
import type { AISettings, NBASettings, NotificationSettings } from '@/types/settings'

export function getAISettings() {
  return get<AISettings>('/settings/ai')
}

export function updateAISettings(settings: AISettings) {
  return put<AISettings>('/settings/ai', settings)
}

export function getNBASettings() {
  return get<NBASettings>('/settings/nba')
}

export function updateNBASettings(settings: NBASettings) {
  return put<NBASettings>('/settings/nba', settings)
}

export function getNotificationSettings() {
  return get<NotificationSettings>('/settings/notifications')
}

export function updateNotificationSettings(settings: NotificationSettings) {
  return put<NotificationSettings>('/settings/notifications', settings)
}
