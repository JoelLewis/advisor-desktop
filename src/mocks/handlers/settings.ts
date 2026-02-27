import { http, HttpResponse } from 'msw'
import type { AISettings, NBASettings, NotificationSettings, DisplaySettings, CustomPrompt } from '@/types/settings'

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
    emailSignature: 'Best regards,\n{advisor_name}\nSenior Financial Advisor\niDeal Wealth Management',
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
]
