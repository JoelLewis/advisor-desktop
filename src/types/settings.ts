import type { NBACategory } from './nba'

export type AITone = 'formal' | 'conversational' | 'concise'
export type AIVerbosity = 'brief' | 'standard' | 'detailed'

export type FollowUpCadence = '1_day' | '3_days' | '1_week' | '2_weeks' | 'monthly'

export type CommunicationChannel = 'email' | 'phone' | 'video' | 'in_person'

export type AIPersona = {
  defaultGreeting: string
  emailSignature: string
  preferredChannels: CommunicationChannel[]
  followUpCadence: FollowUpCadence
}

export type DocumentDefaults = {
  preferredTemplate: string
  defaultSections: string[]
  customDisclaimer: string
  defaultFeeRate: string
}

export type CustomPromptCategory = 'portfolio' | 'communication' | 'compliance' | 'planning' | 'trading'

export type CustomPrompt = {
  id: string
  name: string
  text: string
  category: CustomPromptCategory
  createdAt: string
}

export type AISettings = {
  tone: AITone
  autoSuggest: boolean
  permissions: Record<string, boolean>
  verbosity: AIVerbosity
  persona: AIPersona
  documentDefaults: DocumentDefaults
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

export type DisplaySettings = {
  reportingCurrency: import('@/types/currency').CurrencyCode
  showOriginalCurrency: boolean
  compactNumbers: boolean
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
}
