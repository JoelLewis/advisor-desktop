import { http, HttpResponse, delay } from 'msw'
import type { AISettings, NBASettings, NotificationSettings, DisplaySettings, CustomPrompt, DelegationRule } from '@/types/settings'
import type { StandingRule, AIPermissionMatrix, StandingRuleAction, TriggerType } from '@/types/standing-rule'

const aiSettings: AISettings = {
  tone: 'conversational',
  autoSuggest: true,
  permissions: {
    generateDocuments: true,
    executeTrades: false,
    sendEmails: false,
    scheduleMetings: true,
    updateCRM: true,
  },
  verbosity: 'standard',
  persona: {
    defaultGreeting: 'Good morning! Here\'s your daily briefing.',
    emailSignature: 'Best regards,\n{advisor_name}\nSenior Financial Advisor\nMitchell Wealth Advisors',
    preferredChannels: ['email', 'video'],
    followUpCadence: '1_week',
  },
  documentDefaults: {
    preferredTemplate: 'comprehensive-wealth',
    defaultSections: ['cover', 'executive_summary', 'current_situation', 'recommended_portfolio', 'fee_schedule', 'disclosures'],
    customDisclaimer: '',
    defaultFeeRate: '1.00',
  },
}

export const customPrompts = new Map<string, CustomPrompt>([
  ['cp-1', {
    id: 'cp-1',
    name: 'Quarterly Performance Summary',
    text: 'Summarize this client\'s portfolio performance vs. benchmark for the last quarter',
    category: 'portfolio',
    createdAt: '2025-11-15T09:00:00Z',
  }],
  ['cp-2', {
    id: 'cp-2',
    name: 'Post-Review Follow-up Email',
    text: 'Draft a follow-up email after our annual review meeting',
    category: 'communication',
    createdAt: '2025-12-01T14:30:00Z',
  }],
  ['cp-3', {
    id: 'cp-3',
    name: 'Concentration Limit Check',
    text: 'Check if any accounts are approaching concentration limits',
    category: 'compliance',
    createdAt: '2026-01-10T10:00:00Z',
  }],
  ['cp-4', {
    id: 'cp-4',
    name: 'Book-wide TLH Scan',
    text: 'What tax-loss harvesting opportunities exist across my book?',
    category: 'portfolio',
    createdAt: '2026-01-22T16:45:00Z',
  }],
])

const nbaSettings: NBASettings = {
  weights: { urgency: 25, impact: 30, efficiency: 15, relationship: 15, confidence: 15 },
  enabledCategories: ['rebalancing', 'tax_management', 'planning', 'risk', 'client_service', 'compliance', 'growth'],
  groupingThreshold: 3,
  customAlertRules: [
    { name: 'Large account drift', condition: 'drift > 3% AND account_value > $5M', priority: 'critical' },
    { name: 'RMD deadline approaching', condition: 'client_age >= 72 AND months_to_rmd <= 6', priority: 'high' },
  ],
}

const notificationSettings: NotificationSettings = {
  channels: { email: true, inApp: true, desktop: true },
  quietHours: { enabled: true, start: '20:00', end: '07:00' },
  categoryOverrides: {},
}

const displaySettings: DisplaySettings = {
  reportingCurrency: 'USD',
  showOriginalCurrency: true,
  compactNumbers: true,
  dateFormat: 'MM/DD/YYYY',
}

const standingRules = new Map<string, StandingRule>([
  ['sr-001', {
    id: 'sr-001',
    name: 'Pre-meeting prep brief',
    triggerType: 'time_based',
    triggerCondition: '48 hours before any scheduled client meeting',
    action: 'generate_prep_brief',
    actionDescription: 'Generate a meeting prep brief with portfolio summary, recent activity, and talking points',
    enabled: true,
    lastRunAt: '2026-02-25T08:00:00Z',
    nextRunAt: '2026-03-01T08:00:00Z',
    createdAt: '2026-01-15T10:00:00Z',
    runCount: 12,
  }],
  ['sr-002', {
    id: 'sr-002',
    name: 'Client birthday greeting',
    triggerType: 'event_based',
    triggerCondition: 'When client birthday is within 3 days',
    action: 'draft_email',
    actionDescription: 'Draft a personalized birthday email using client preferences and recent interactions',
    enabled: true,
    lastRunAt: '2026-02-20T06:00:00Z',
    createdAt: '2026-01-15T10:00:00Z',
    runCount: 5,
  }],
  ['sr-003', {
    id: 'sr-003',
    name: 'Monthly portfolio report',
    triggerType: 'time_based',
    triggerCondition: 'First business day of each month',
    action: 'generate_report',
    actionDescription: 'Generate monthly portfolio performance report for all managed accounts',
    enabled: true,
    lastRunAt: '2026-02-03T07:00:00Z',
    nextRunAt: '2026-03-03T07:00:00Z',
    createdAt: '2025-12-01T09:00:00Z',
    runCount: 3,
  }],
  ['sr-004', {
    id: 'sr-004',
    name: 'Post-trade compliance review',
    triggerType: 'event_based',
    triggerCondition: 'When any trade is executed over $100K',
    action: 'run_compliance_check',
    actionDescription: 'Run post-trade compliance check against IPS constraints and concentration limits',
    enabled: true,
    lastRunAt: '2026-02-26T14:30:00Z',
    createdAt: '2026-01-20T11:00:00Z',
    runCount: 18,
  }],
  ['sr-005', {
    id: 'sr-005',
    name: 'Drift alert NBA creation',
    triggerType: 'event_based',
    triggerCondition: 'When account drift exceeds 3% threshold',
    action: 'create_nba',
    actionDescription: 'Create a rebalancing NBA with pre-calculated trade list and tax impact estimate',
    enabled: true,
    lastRunAt: '2026-02-24T10:00:00Z',
    createdAt: '2026-01-10T14:00:00Z',
    runCount: 8,
  }],
  ['sr-006', {
    id: 'sr-006',
    name: 'Quarterly review scheduling',
    triggerType: 'time_based',
    triggerCondition: '30 days before end of quarter',
    action: 'schedule_meeting',
    actionDescription: 'Auto-schedule quarterly review meetings with all platinum and gold tier clients',
    enabled: false,
    lastRunAt: '2025-12-01T09:00:00Z',
    createdAt: '2025-11-15T08:00:00Z',
    runCount: 1,
  }],
  ['sr-007', {
    id: 'sr-007',
    name: 'New account CRM update',
    triggerType: 'event_based',
    triggerCondition: 'When a new account is opened or transferred in',
    action: 'update_crm',
    actionDescription: 'Update CRM with account details, link to household, tag with service model',
    enabled: true,
    createdAt: '2026-02-01T10:00:00Z',
    runCount: 0,
  }],
])

const delegationRules = new Map<string, DelegationRule>([
  ['dr-001', {
    id: 'dr-001',
    name: 'Routine rebalancing under $500K',
    condition: 'Account value < $500K AND drift > threshold AND no wash sale conflict',
    delegateTo: 'AI Agent',
    delegationType: 'ai_agent',
    isActive: true,
  }],
  ['dr-002', {
    id: 'dr-002',
    name: 'Client birthday emails',
    condition: 'Client birthday within 3 days AND no recent complaints',
    delegateTo: 'AI Agent',
    delegationType: 'ai_agent',
    isActive: true,
  }],
  ['dr-003', {
    id: 'dr-003',
    name: 'Document preparation for meetings',
    condition: 'Meeting scheduled within 48 hours',
    delegateTo: 'Sarah (CSA)',
    delegationType: 'team_member',
    isActive: true,
  }],
  ['dr-004', {
    id: 'dr-004',
    name: 'Tax-loss harvesting execution',
    condition: 'TLH opportunity > $1,000 savings AND no wash sale window',
    delegateTo: 'AI Agent + Advisor Review',
    delegationType: 'both',
    isActive: false,
  }],
  ['dr-005', {
    id: 'dr-005',
    name: 'Quarterly fee billing prep',
    condition: 'First week of quarter',
    delegateTo: 'Maria (Operations)',
    delegationType: 'team_member',
    isActive: true,
  }],
])

const aiPermissionMatrix: AIPermissionMatrix = {
  permissions: [
    { actionType: 'document_generation', mode: 'auto_approve' },
    { actionType: 'email_drafting', mode: 'queue_for_review' },
    { actionType: 'trade_suggestion', mode: 'notify_and_hold' },
    { actionType: 'crm_updates', mode: 'auto_approve' },
    { actionType: 'compliance_notes', mode: 'queue_for_review' },
    { actionType: 'meeting_scheduling', mode: 'queue_for_review' },
  ],
  dataScope: 'assigned_clients',
  executionSchedule: 'business_hours',
}

export const settingsHandlers = [
  http.get('/api/settings/ai', () => HttpResponse.json(aiSettings)),
  http.put('/api/settings/ai', async ({ request }) => {
    const body = await request.json() as AISettings
    Object.assign(aiSettings, body)
    return HttpResponse.json(aiSettings)
  }),

  http.get('/api/settings/nba', () => HttpResponse.json(nbaSettings)),
  http.put('/api/settings/nba', async ({ request }) => {
    const body = await request.json() as NBASettings
    Object.assign(nbaSettings, body)
    return HttpResponse.json(nbaSettings)
  }),

  http.get('/api/settings/notifications', () => HttpResponse.json(notificationSettings)),
  http.put('/api/settings/notifications', async ({ request }) => {
    const body = await request.json() as NotificationSettings
    Object.assign(notificationSettings, body)
    return HttpResponse.json(notificationSettings)
  }),

  http.get('/api/settings/display', () => HttpResponse.json(displaySettings)),
  http.put('/api/settings/display', async ({ request }) => {
    const body = await request.json() as DisplaySettings
    Object.assign(displaySettings, body)
    return HttpResponse.json(displaySettings)
  }),

  http.get('/api/settings/ai/prompts', () => {
    return HttpResponse.json(Array.from(customPrompts.values()))
  }),
  http.post('/api/settings/ai/prompts', async ({ request }) => {
    const body = await request.json() as { name: string; text: string; category: CustomPrompt['category'] }
    const id = `cp-${Date.now()}`
    const prompt: CustomPrompt = {
      id,
      name: body.name,
      text: body.text,
      category: body.category,
      createdAt: new Date().toISOString(),
    }
    customPrompts.set(id, prompt)
    return HttpResponse.json(prompt, { status: 201 })
  }),
  http.put('/api/settings/ai/prompts/:id', async ({ params, request }) => {
    const id = params.id as string
    const existing = customPrompts.get(id)
    if (!existing) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Partial<Pick<CustomPrompt, 'name' | 'text' | 'category'>>
    const updated = { ...existing, ...body }
    customPrompts.set(id, updated)
    return HttpResponse.json(updated)
  }),
  http.delete('/api/settings/ai/prompts/:id', ({ params }) => {
    const id = params.id as string
    if (!customPrompts.has(id)) return new HttpResponse(null, { status: 404 })
    customPrompts.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Standing Rules ---
  http.get('/api/settings/standing-rules', async () => {
    await delay(150)
    return HttpResponse.json(Array.from(standingRules.values()))
  }),
  http.post('/api/settings/standing-rules', async ({ request }) => {
    await delay(200)
    const body = await request.json() as { name: string; triggerType: TriggerType; triggerCondition: string; action: StandingRuleAction; actionDescription: string }
    const id = `sr-${Date.now()}`
    const rule: StandingRule = {
      id,
      name: body.name,
      triggerType: body.triggerType,
      triggerCondition: body.triggerCondition,
      action: body.action,
      actionDescription: body.actionDescription,
      enabled: true,
      createdAt: new Date().toISOString(),
      runCount: 0,
    }
    standingRules.set(id, rule)
    return HttpResponse.json(rule, { status: 201 })
  }),
  http.put('/api/settings/standing-rules/:id', async ({ params, request }) => {
    await delay(150)
    const id = params.id as string
    const existing = standingRules.get(id)
    if (!existing) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Partial<StandingRule>
    const updated = { ...existing, ...body, id }
    standingRules.set(id, updated)
    return HttpResponse.json(updated)
  }),
  http.delete('/api/settings/standing-rules/:id', async ({ params }) => {
    await delay(100)
    const id = params.id as string
    if (!standingRules.has(id)) return new HttpResponse(null, { status: 404 })
    standingRules.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Delegation Standing Rules ---
  http.get('/api/settings/delegation-rules', async () => {
    await delay(150)
    return HttpResponse.json(Array.from(delegationRules.values()))
  }),
  http.post('/api/settings/delegation-rules', async ({ request }) => {
    await delay(200)
    const body = await request.json() as Omit<DelegationRule, 'id'>
    const id = `dr-${Date.now()}`
    const rule: DelegationRule = { id, ...body }
    delegationRules.set(id, rule)
    return HttpResponse.json(rule, { status: 201 })
  }),
  http.put('/api/settings/delegation-rules/:id', async ({ params, request }) => {
    await delay(150)
    const id = params.id as string
    const existing = delegationRules.get(id)
    if (!existing) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Partial<DelegationRule>
    const updated = { ...existing, ...body, id }
    delegationRules.set(id, updated)
    return HttpResponse.json(updated)
  }),
  http.delete('/api/settings/delegation-rules/:id', async ({ params }) => {
    await delay(100)
    const id = params.id as string
    if (!delegationRules.has(id)) return new HttpResponse(null, { status: 404 })
    delegationRules.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  // --- AI Permission Matrix ---
  http.get('/api/settings/ai-permissions', async () => {
    await delay(100)
    return HttpResponse.json(aiPermissionMatrix)
  }),
  http.put('/api/settings/ai-permissions', async ({ request }) => {
    await delay(150)
    const body = await request.json() as AIPermissionMatrix
    Object.assign(aiPermissionMatrix, body)
    return HttpResponse.json(aiPermissionMatrix)
  }),
]
