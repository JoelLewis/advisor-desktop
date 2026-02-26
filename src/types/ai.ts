import type { RichCardData } from '@/types/rich-card'

export type ChatRole = 'user' | 'assistant'

export type Citation = {
  source: string
  text: string
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  timestamp: string
  citations?: Citation[]
  actions?: ActionConfirmation[]
  documentPreview?: DocumentPreview
  richCards?: RichCardData[]
}

export type DocumentPreview = {
  id: string
  title: string
  type: string
  previewText: string
}

export type ChatContext = {
  screenType: string
  entityType?: 'client' | 'household' | 'account' | 'portfolio'
  entityId?: string
  entityName?: string
}

export type DocumentGeneration = {
  templateType: string
  clientId: string
  parameters: Record<string, unknown>
  status: 'generating' | 'ready' | 'error'
  content?: string
}

export type ActionConfirmation = {
  id: string
  action: string
  description: string
  impact: string
  status: 'pending' | 'approved' | 'rejected' | 'executed'
}

export type SuggestedPrompt = {
  text: string
  category: string
  screenType: string
}

export type BriefingMetric = {
  label: string
  value: string
  change?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export type ContextBriefingData = {
  title: string
  entityType: string
  metrics: BriefingMetric[]
  highlights: string[]
  asOf: string
}

export type AIInsight = {
  id: string
  severity: 'info' | 'warning' | 'opportunity'
  title: string
  body: string
  metric?: { label: string; value: string }
  actionLabel?: string
  actionRoute?: string
  actionAI?: string
}
