import type { NBACategory } from './nba'

export type AITone = 'formal' | 'conversational' | 'concise'
export type AIVerbosity = 'brief' | 'standard' | 'detailed'

export type AISettings = {
  tone: AITone
  autoSuggest: boolean
  permissions: Record<string, boolean>
  verbosity: AIVerbosity
}

export type NBAWeights = {
  urgency: number
  impact: number
  efficiency: number
  relationship: number
  confidence: number
}

export type CustomAlertRule = {
  name: string
  condition: string
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export type NBASettings = {
  weights: NBAWeights
  enabledCategories: NBACategory[]
  groupingThreshold: number
  customAlertRules: CustomAlertRule[]
}

export type QuietHours = {
  enabled: boolean
  start: string
  end: string
}

export type ChannelConfig = {
  enabled: boolean
  channel: 'email' | 'in_app' | 'desktop'
}

export type NotificationSettings = {
  channels: {
    email: boolean
    inApp: boolean
    desktop: boolean
  }
  quietHours: QuietHours
  categoryOverrides: Record<string, ChannelConfig>
}

export type DelegationRule = {
  id: string
  name: string
  condition: string
  delegateTo: string
  delegationType: 'team_member' | 'ai_agent' | 'both'
  isActive: boolean
}
