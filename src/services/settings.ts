import { get, post, put, del } from './api-client'
import type { AISettings, NBASettings, NotificationSettings, DisplaySettings, CustomPrompt, DelegationRule } from '@/types/settings'
import type { StandingRule, AIPermissionMatrix } from '@/types/standing-rule'

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

// Standing Rules
export function getStandingRules() {
  return get<StandingRule[]>('/settings/standing-rules')
}

export function createStandingRule(rule: Pick<StandingRule, 'name' | 'triggerType' | 'triggerCondition' | 'action' | 'actionDescription'>) {
  return post<StandingRule>('/settings/standing-rules', rule)
}

export function updateStandingRule(id: string, rule: Partial<StandingRule>) {
  return put<StandingRule>(`/settings/standing-rules/${id}`, rule)
}

export function deleteStandingRule(id: string) {
  return del<void>(`/settings/standing-rules/${id}`)
}

// Delegation Rules
export function getDelegationRules() {
  return get<DelegationRule[]>('/settings/delegation-rules')
}

export function createDelegationRule(rule: Omit<DelegationRule, 'id'>) {
  return post<DelegationRule>('/settings/delegation-rules', rule)
}

export function updateDelegationRule(id: string, rule: Partial<DelegationRule>) {
  return put<DelegationRule>(`/settings/delegation-rules/${id}`, rule)
}

export function deleteDelegationRule(id: string) {
  return del<void>(`/settings/delegation-rules/${id}`)
}

// AI Permission Matrix
export function getAIPermissions() {
  return get<AIPermissionMatrix>('/settings/ai-permissions')
}

export function updateAIPermissions(matrix: AIPermissionMatrix) {
  return put<AIPermissionMatrix>('/settings/ai-permissions', matrix)
}
