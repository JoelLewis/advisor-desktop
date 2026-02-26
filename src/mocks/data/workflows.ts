import type { Task, ProcessTracker, WorkflowTemplate } from '@/types/workflow'

export const tasks: Task[] = [
  // ── My Actions (assigned to Sarah Mitchell) ──
  { id: 'task-001', title: 'Review rebalance preview — Chen portfolio', description: 'Tax-aware rebalance generated 8 trades with $2,100 estimated tax impact. Approve or modify before execution.', status: 'pending', priority: 'high', assignee: 'Sarah Mitchell', delegationType: 'team_member', clientId: 'cli-003', clientName: 'Margaret Chen', category: 'rebalancing', dueDate: '2026-02-26', createdAt: '2026-02-21T09:00:00Z' },
  { id: 'task-002', title: 'Prepare Williams semi-annual review', description: 'Meeting scheduled Feb 26. Review portfolio performance, 529 progress, and 401(k) rollover proposal.', status: 'in_progress', priority: 'high', assignee: 'Sarah Mitchell', delegationType: 'team_member', clientId: 'cli-004', clientName: 'David Williams', category: 'client_service', dueDate: '2026-02-26', createdAt: '2026-02-20T08:00:00Z' },
  { id: 'task-003', title: 'Source-of-funds documentation — Anderson wire', description: 'Collect and file source-of-funds documentation for $250K wire deposit. Compliance hold until resolved.', status: 'pending', priority: 'critical', assignee: 'Sarah Mitchell', delegationType: 'team_member', clientId: 'cli-009', clientName: 'Richard Anderson', category: 'compliance', dueDate: '2026-02-25', createdAt: '2026-02-24T15:10:00Z' },
  { id: 'task-004', title: 'Follow up on Thompson referral', description: 'James Thompson referred Dr. Amanda Foster. Send introductory email and schedule discovery call.', status: 'pending', priority: 'medium', assignee: 'Sarah Mitchell', delegationType: 'team_member', clientId: 'cli-008', clientName: 'James Thompson', category: 'growth', dueDate: '2026-02-28', createdAt: '2026-02-20T14:30:00Z' },
  { id: 'task-005', title: 'Review Patel 529 contribution increase', description: 'Raj requested increasing monthly 529 contribution from $1,500 to $2,500 after new baby.', status: 'pending', priority: 'medium', assignee: 'Sarah Mitchell', delegationType: 'team_member', clientId: 'cli-011', clientName: 'Raj Patel', category: 'planning', dueDate: '2026-02-28', createdAt: '2026-02-23T16:00:00Z' },
  { id: 'task-006', title: 'Tax-loss harvesting review — Johnson', description: 'INTC replaced with SMH. Verify no wash sale issues and update cost basis records.', status: 'completed', priority: 'high', assignee: 'Sarah Mitchell', delegationType: 'team_member', clientId: 'cli-001', clientName: 'Robert Johnson', category: 'tax_management', dueDate: '2026-02-24', createdAt: '2026-02-21T10:30:00Z', completedAt: '2026-02-24T11:30:00Z' },
  { id: 'task-007', title: 'Annual IPS review — Martinez', description: 'Schedule and prepare annual IPS review for Michael and Jennifer Martinez.', status: 'pending', priority: 'low', assignee: 'Sarah Mitchell', delegationType: 'team_member', clientId: 'cli-006', clientName: 'Michael Martinez', category: 'compliance', dueDate: '2026-03-15', createdAt: '2026-02-15T08:00:00Z' },

  // ── Delegated to AI ──
  { id: 'task-010', title: 'Generate meeting brief — Williams review', description: 'Auto-generate performance summary, goal tracking, and talking points for Williams semi-annual review.', status: 'completed', priority: 'high', assignee: 'AI Agent', delegationType: 'ai_agent', clientId: 'cli-004', clientName: 'David Williams', category: 'client_service', dueDate: '2026-02-26', createdAt: '2026-02-23T08:00:00Z', completedAt: '2026-02-24T10:00:00Z', aiProgress: 100 },
  { id: 'task-011', title: 'Draft 401(k) rollover proposal — Williams', description: 'AI drafting Fidelity 401(k) rollover proposal with fee comparison and tax analysis.', status: 'completed', priority: 'medium', assignee: 'AI Agent', delegationType: 'ai_agent', clientId: 'cli-004', clientName: 'David Williams', category: 'planning', dueDate: '2026-02-25', createdAt: '2026-02-20T14:00:00Z', completedAt: '2026-02-21T10:30:00Z', aiProgress: 100 },
  { id: 'task-012', title: 'Monitor Kim-Lee portfolio for rebalance trigger', description: 'Watching for 3% drift threshold. Current drift at 2.1%.', status: 'in_progress', priority: 'low', assignee: 'AI Agent', delegationType: 'ai_agent', clientId: 'cli-015', clientName: 'Thomas Kim', category: 'rebalancing', dueDate: '2026-03-15', createdAt: '2026-02-10T08:00:00Z', aiProgress: 70 },
  { id: 'task-013', title: 'Draft new baby financial plan update — Patel', description: 'Generating updated financial plan with education goal projections for new child.', status: 'in_progress', priority: 'medium', assignee: 'AI Agent', delegationType: 'ai_agent', clientId: 'cli-011', clientName: 'Raj Patel', category: 'planning', dueDate: '2026-02-28', createdAt: '2026-02-23T16:30:00Z', aiProgress: 45 },

  // ── Delegated to CSA (team) ──
  { id: 'task-020', title: 'Process Foster account opening paperwork', description: 'Individual brokerage application uploaded. Complete suitability review and submit.', status: 'in_progress', priority: 'medium', assignee: 'Lisa Park (CSA)', delegationType: 'team_member', clientId: 'cli-017', clientName: 'William Foster', category: 'onboarding', dueDate: '2026-02-27', createdAt: '2026-02-22T11:30:00Z' },
  { id: 'task-021', title: 'Schedule Anderson quarterly review', description: 'Reach out to Richard & Susan Anderson to schedule Q1 review. Preferred: first week of March.', status: 'pending', priority: 'low', assignee: 'Lisa Park (CSA)', delegationType: 'team_member', clientId: 'cli-009', clientName: 'Richard Anderson', category: 'client_service', dueDate: '2026-03-01', createdAt: '2026-02-21T16:00:00Z' },
  { id: 'task-022', title: 'ACAT transfer follow-up — Garcia', description: 'ACAT transfer from Merrill Lynch initiated Feb 15. Follow up on expected completion date.', status: 'in_progress', priority: 'medium', assignee: 'Lisa Park (CSA)', delegationType: 'team_member', clientId: 'cli-016', clientName: 'Linda Garcia', category: 'onboarding', dueDate: '2026-02-26', createdAt: '2026-02-15T10:00:00Z' },
]

export const processTrackers: ProcessTracker[] = [
  {
    id: 'proc-001', type: 'account_opening', entityId: 'cli-017', entityName: 'William Foster — Individual Brokerage',
    currentStage: 2, startedAt: '2026-02-22T11:00:00Z', estimatedCompletion: '2026-02-27T17:00:00Z', isNigo: false,
    stages: [
      { step: 1, name: 'Application Received', status: 'completed', responsibleParty: 'Client', slaHours: 0, startedAt: '2026-02-22T11:00:00Z', completedAt: '2026-02-22T11:00:00Z' },
      { step: 2, name: 'Suitability Review', status: 'in_progress', responsibleParty: 'Lisa Park (CSA)', slaHours: 24, startedAt: '2026-02-22T14:00:00Z', completedAt: null },
      { step: 3, name: 'Compliance Approval', status: 'pending', responsibleParty: 'Compliance', slaHours: 48, startedAt: null, completedAt: null },
      { step: 4, name: 'Custodian Setup', status: 'pending', responsibleParty: 'Schwab', slaHours: 72, startedAt: null, completedAt: null },
      { step: 5, name: 'Account Activated', status: 'pending', responsibleParty: 'System', slaHours: 4, startedAt: null, completedAt: null },
    ],
  },
  {
    id: 'proc-002', type: 'acat_transfer', entityId: 'cli-016', entityName: 'Linda Garcia — ACAT from Merrill Lynch',
    currentStage: 3, startedAt: '2026-02-15T10:00:00Z', estimatedCompletion: '2026-03-01T17:00:00Z', isNigo: false,
    stages: [
      { step: 1, name: 'Transfer Initiated', status: 'completed', responsibleParty: 'Lisa Park (CSA)', slaHours: 0, startedAt: '2026-02-15T10:00:00Z', completedAt: '2026-02-15T10:30:00Z' },
      { step: 2, name: 'ACAT Submitted', status: 'completed', responsibleParty: 'Schwab', slaHours: 24, startedAt: '2026-02-15T10:30:00Z', completedAt: '2026-02-16T09:00:00Z' },
      { step: 3, name: 'Contra-firm Processing', status: 'in_progress', responsibleParty: 'Merrill Lynch', slaHours: 168, startedAt: '2026-02-16T09:00:00Z', completedAt: null },
      { step: 4, name: 'Assets Received', status: 'pending', responsibleParty: 'Schwab', slaHours: 24, startedAt: null, completedAt: null },
      { step: 5, name: 'Reconciliation & Model Mapping', status: 'pending', responsibleParty: 'Sarah Mitchell', slaHours: 8, startedAt: null, completedAt: null },
    ],
  },
  {
    id: 'proc-003', type: 'document_signature', entityId: 'cli-001', entityName: 'Robert Johnson — Tax-Loss Harvesting Proposal',
    currentStage: 2, startedAt: '2026-02-20T14:00:00Z', estimatedCompletion: '2026-02-28T17:00:00Z', isNigo: false,
    stages: [
      { step: 1, name: 'Document Generated', status: 'completed', responsibleParty: 'AI Agent', slaHours: 1, startedAt: '2026-02-20T14:00:00Z', completedAt: '2026-02-20T14:05:00Z' },
      { step: 2, name: 'Advisor Review', status: 'in_progress', responsibleParty: 'Sarah Mitchell', slaHours: 48, startedAt: '2026-02-20T14:05:00Z', completedAt: null },
      { step: 3, name: 'Sent for Signature', status: 'pending', responsibleParty: 'System', slaHours: 1, startedAt: null, completedAt: null },
      { step: 4, name: 'Client Signed', status: 'pending', responsibleParty: 'Robert Johnson', slaHours: 120, startedAt: null, completedAt: null },
    ],
  },
  {
    id: 'proc-004', type: 'compliance_review', entityId: 'cli-009', entityName: 'Richard Anderson — Wire Source-of-Funds',
    currentStage: 1, startedAt: '2026-02-24T15:10:00Z', estimatedCompletion: null, isNigo: true,
    stages: [
      { step: 1, name: 'Documentation Request', status: 'in_progress', responsibleParty: 'Sarah Mitchell', slaHours: 24, startedAt: '2026-02-24T15:10:00Z', completedAt: null, nigoReason: 'Missing source-of-funds documentation for $250K wire' },
      { step: 2, name: 'Client Provides Docs', status: 'pending', responsibleParty: 'Richard Anderson', slaHours: 72, startedAt: null, completedAt: null },
      { step: 3, name: 'Compliance Review', status: 'pending', responsibleParty: 'Compliance', slaHours: 24, startedAt: null, completedAt: null },
      { step: 4, name: 'Funds Released', status: 'pending', responsibleParty: 'System', slaHours: 4, startedAt: null, completedAt: null },
    ],
  },
]

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'tpl-001', name: 'New Account Opening', description: 'End-to-end account opening workflow from application through activation',
    category: 'Onboarding',
    steps: [
      { order: 1, name: 'Receive application', defaultAssignee: 'CSA', estimatedMinutes: 15 },
      { order: 2, name: 'Suitability review', defaultAssignee: 'CSA', estimatedMinutes: 30 },
      { order: 3, name: 'Compliance approval', defaultAssignee: 'Compliance', estimatedMinutes: 60 },
      { order: 4, name: 'Custodian setup', defaultAssignee: 'Custodian', estimatedMinutes: 120 },
      { order: 5, name: 'Account activation', defaultAssignee: 'System', estimatedMinutes: 5 },
    ],
  },
  {
    id: 'tpl-002', name: 'ACAT Transfer', description: 'Asset transfer from external custodian via ACAT',
    category: 'Onboarding',
    steps: [
      { order: 1, name: 'Initiate transfer', defaultAssignee: 'CSA', estimatedMinutes: 20 },
      { order: 2, name: 'Submit ACAT request', defaultAssignee: 'Custodian', estimatedMinutes: 30 },
      { order: 3, name: 'Contra-firm processing', defaultAssignee: 'External', estimatedMinutes: 2880 },
      { order: 4, name: 'Assets received', defaultAssignee: 'Custodian', estimatedMinutes: 30 },
      { order: 5, name: 'Reconciliation & model mapping', defaultAssignee: 'Advisor', estimatedMinutes: 60 },
    ],
  },
  {
    id: 'tpl-003', name: 'Quarterly Client Review', description: 'Standard quarterly review meeting preparation and follow-up',
    category: 'Client Service',
    steps: [
      { order: 1, name: 'Generate performance report', defaultAssignee: 'AI Agent', estimatedMinutes: 5 },
      { order: 2, name: 'Prepare meeting brief', defaultAssignee: 'AI Agent', estimatedMinutes: 10 },
      { order: 3, name: 'Advisor review & customize', defaultAssignee: 'Advisor', estimatedMinutes: 30 },
      { order: 4, name: 'Conduct meeting', defaultAssignee: 'Advisor', estimatedMinutes: 60 },
      { order: 5, name: 'Capture notes & action items', defaultAssignee: 'AI Agent', estimatedMinutes: 5 },
      { order: 6, name: 'Send follow-up', defaultAssignee: 'CSA', estimatedMinutes: 15 },
    ],
  },
  {
    id: 'tpl-004', name: 'Tax-Loss Harvesting', description: 'Identify and execute tax-loss harvesting opportunities',
    category: 'Tax Management',
    steps: [
      { order: 1, name: 'Scan for harvesting candidates', defaultAssignee: 'AI Agent', estimatedMinutes: 5 },
      { order: 2, name: 'Select replacement securities', defaultAssignee: 'AI Agent', estimatedMinutes: 5 },
      { order: 3, name: 'Wash sale verification', defaultAssignee: 'AI Agent', estimatedMinutes: 2 },
      { order: 4, name: 'Advisor approval', defaultAssignee: 'Advisor', estimatedMinutes: 15 },
      { order: 5, name: 'Execute trades', defaultAssignee: 'System', estimatedMinutes: 1 },
      { order: 6, name: 'Update cost basis records', defaultAssignee: 'System', estimatedMinutes: 1 },
    ],
  },
  {
    id: 'tpl-005', name: 'Beneficiary Update', description: 'Process beneficiary designation changes across accounts',
    category: 'Administrative',
    steps: [
      { order: 1, name: 'Collect new beneficiary info', defaultAssignee: 'CSA', estimatedMinutes: 15 },
      { order: 2, name: 'Generate designation forms', defaultAssignee: 'System', estimatedMinutes: 5 },
      { order: 3, name: 'Client signature', defaultAssignee: 'Client', estimatedMinutes: 1440 },
      { order: 4, name: 'Submit to custodian', defaultAssignee: 'CSA', estimatedMinutes: 10 },
      { order: 5, name: 'Confirm update', defaultAssignee: 'Custodian', estimatedMinutes: 120 },
    ],
  },
]
