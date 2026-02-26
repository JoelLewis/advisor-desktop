import type { NBACategory } from './nba'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'

export type DelegationType = 'team_member' | 'ai_agent' | 'both'

export type AccountOpeningStage = {
  step: number
  name: string
  status: TaskStatus
  responsibleParty: string
  slaHours: number
  startedAt: string | null
  completedAt: string | null
  nigoReason?: string
}

export type ProcessTracker = {
  id: string
  type: 'account_opening' | 'acat_transfer' | 'document_signature' | 'compliance_review' | 'trade_order'
  entityId: string
  entityName: string
  stages: AccountOpeningStage[]
  currentStage: number
  startedAt: string
  estimatedCompletion: string | null
  isNigo: boolean
}

export type WorkflowStep = {
  order: number
  name: string
  defaultAssignee: string
  estimatedMinutes: number
}

export type WorkflowTemplate = {
  id: string
  name: string
  description: string
  category: string
  steps: WorkflowStep[]
}

export type Task = {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: 'critical' | 'high' | 'medium' | 'low'
  assignee: string
  delegationType: DelegationType
  clientId?: string
  clientName?: string
  category: NBACategory | 'administrative' | 'onboarding'
  dueDate: string
  createdAt: string
  completedAt?: string
  processTrackerId?: string
  templateId?: string
  aiProgress?: number
}
