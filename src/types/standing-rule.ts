export const TRIGGER_TYPES = ['time_based', 'event_based'] as const
export type TriggerType = (typeof TRIGGER_TYPES)[number]

export const STANDING_RULE_ACTIONS = [
  'generate_prep_brief',
  'draft_email',
  'generate_report',
  'update_crm',
  'run_compliance_check',
  'create_nba',
  'schedule_meeting',
] as const
export type StandingRuleAction = (typeof STANDING_RULE_ACTIONS)[number]

export const STANDING_RULE_ACTION_LABELS: Record<StandingRuleAction, string> = {
  generate_prep_brief: 'Generate Prep Brief',
  draft_email: 'Draft Email',
  generate_report: 'Generate Report',
  update_crm: 'Update CRM',
  run_compliance_check: 'Run Compliance Check',
  create_nba: 'Create NBA',
  schedule_meeting: 'Schedule Meeting',
}

export type StandingRule = {
  id: string
  name: string
  triggerType: TriggerType
  triggerCondition: string
  action: StandingRuleAction
  actionDescription: string
  enabled: boolean
  lastRunAt?: string
  nextRunAt?: string
  createdAt: string
  runCount: number
}

export const PERMISSION_MODES = ['auto_approve', 'queue_for_review', 'notify_and_hold'] as const
export type PermissionMode = (typeof PERMISSION_MODES)[number]

export const PERMISSION_MODE_LABELS: Record<PermissionMode, string> = {
  auto_approve: 'Auto-Approve',
  queue_for_review: 'Queue for Review',
  notify_and_hold: 'Notify & Hold',
}

export const AI_ACTION_TYPES = [
  'document_generation',
  'email_drafting',
  'trade_suggestion',
  'crm_updates',
  'compliance_notes',
  'meeting_scheduling',
] as const
export type AIActionType = (typeof AI_ACTION_TYPES)[number]

export const AI_ACTION_TYPE_LABELS: Record<AIActionType, string> = {
  document_generation: 'Document Generation',
  email_drafting: 'Email Drafting',
  trade_suggestion: 'Trade Suggestions',
  crm_updates: 'CRM Updates',
  compliance_notes: 'Compliance Notes',
  meeting_scheduling: 'Meeting Scheduling',
}

export const DATA_SCOPES = ['full_book', 'assigned_clients', 'active_clients_only'] as const
export type DataScope = (typeof DATA_SCOPES)[number]

export const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  full_book: 'Full Book of Business',
  assigned_clients: 'Assigned Clients Only',
  active_clients_only: 'Active Clients Only',
}

export const EXECUTION_SCHEDULES = ['business_hours', 'extended_hours', 'always'] as const
export type ExecutionSchedule = (typeof EXECUTION_SCHEDULES)[number]

export const EXECUTION_SCHEDULE_LABELS: Record<ExecutionSchedule, string> = {
  business_hours: 'Business Hours (9AM-5PM)',
  extended_hours: 'Extended Hours (6AM-10PM)',
  always: 'Always (24/7)',
}

export type AIPermissionEntry = {
  actionType: AIActionType
  mode: PermissionMode
}

export type AIPermissionMatrix = {
  permissions: AIPermissionEntry[]
  dataScope: DataScope
  executionSchedule: ExecutionSchedule
}
