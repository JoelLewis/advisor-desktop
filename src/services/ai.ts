import { get, post } from './api-client'
import type { ChatMessage, ChatContext, DocumentGeneration, ActionConfirmation, SuggestedPrompt, ContextBriefingData, AIInsight, ActionTemplate } from '@/types/ai'

export function sendMessage(message: string, context: ChatContext) {
  return post<ChatMessage>('/ai/message', { message, context })
}

export function generateDocument(templateType: string, clientId: string, parameters: Record<string, unknown>) {
  return post<DocumentGeneration>('/ai/generate-document', { templateType, clientId, parameters })
}

export function executeAction(actionId: string) {
  return post<ActionConfirmation>(`/ai/actions/${actionId}/execute`)
}

export function getSuggestedPrompts(screenType: string) {
  return get<SuggestedPrompt[]>('/ai/suggestions', { screenType })
}

export function getContextBriefing(screenType: string, entityId?: string) {
  const params: Record<string, string> = { screenType }
  if (entityId) params.entityId = entityId
  return get<ContextBriefingData | null>('/ai/context', params)
}

export function getAIInsights(screenType: string, entityId?: string) {
  const params: Record<string, string> = { screenType }
  if (entityId) params.entityId = entityId
  return get<AIInsight[]>('/ai/insights', params)
}

export function getActionTemplates(screenType: string) {
  return get<ActionTemplate[]>('/ai/templates', { screenType })
}

export function executeTemplate(templateId: string, params: Record<string, unknown>) {
  return post<{ success: boolean; message: string; details: string; executionRoute?: string }>(`/ai/templates/${templateId}/execute`, params)
}
