import { get, post, put, del } from './api-client'
import type { AISettings, NBASettings, NotificationSettings, DisplaySettings, CustomPrompt } from '@/types/settings'

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

export function getDisplaySettings() {
  return get<DisplaySettings>('/settings/display')
}

export function updateDisplaySettings(settings: DisplaySettings) {
  return put<DisplaySettings>('/settings/display', settings)
}

export function getCustomPrompts() {
  return get<CustomPrompt[]>('/settings/ai/prompts')
}

export function createCustomPrompt(prompt: Pick<CustomPrompt, 'name' | 'text' | 'category'>) {
  return post<CustomPrompt>('/settings/ai/prompts', prompt)
}

export function updateCustomPrompt(id: string, prompt: Partial<Pick<CustomPrompt, 'name' | 'text' | 'category'>>) {
  return put<CustomPrompt>(`/settings/ai/prompts/${id}`, prompt)
}

export function deleteCustomPrompt(id: string) {
  return del<void>(`/settings/ai/prompts/${id}`)
}
