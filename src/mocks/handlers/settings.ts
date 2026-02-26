import { http, HttpResponse } from 'msw'
import type { AISettings, NBASettings, NotificationSettings } from '@/types/settings'

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
}

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
]
