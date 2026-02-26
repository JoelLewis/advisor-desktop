import { http, HttpResponse } from 'msw'
import type { IntegrationHealth, ReconBreak } from '@/types/reconciliation'

const integrations: IntegrationHealth[] = [
  { name: 'Schwab Custodian', status: 'synced', lastSync: '2026-02-25T07:00:00Z', breakCount: 0, uptime: 99.8 },
  { name: 'Fidelity Custodian', status: 'synced', lastSync: '2026-02-25T07:00:00Z', breakCount: 0, uptime: 99.6 },
  { name: 'Vanguard Custodian', status: 'synced', lastSync: '2026-02-25T07:00:00Z', breakCount: 0, uptime: 99.9 },
  { name: 'Market Data Feed', status: 'synced', lastSync: '2026-02-25T09:31:00Z', breakCount: 0, uptime: 99.95 },
  { name: 'CRM (Salesforce)', status: 'synced', lastSync: '2026-02-25T08:00:00Z', breakCount: 0, uptime: 99.7 },
  { name: 'Compliance (RegEd)', status: 'synced', lastSync: '2026-02-25T07:30:00Z', breakCount: 0, uptime: 99.4 },
  { name: 'Financial Planning (MoneyGuidePro)', status: 'pending', lastSync: '2026-02-24T22:00:00Z', breakCount: 1, uptime: 98.2 },
  { name: 'DocuSign', status: 'synced', lastSync: '2026-02-25T08:15:00Z', breakCount: 0, uptime: 99.9 },
]

const breaks: ReconBreak[] = [
  { id: 'brk-001', integrationName: 'Financial Planning (MoneyGuidePro)', field: 'goal_probability', expectedValue: '0.87', actualValue: '0.85', severity: 'low', detectedAt: '2026-02-25T07:00:00Z' },
  { id: 'brk-002', integrationName: 'Schwab Custodian', field: 'cash_balance', expectedValue: '$164,000.00', actualValue: '$163,850.00', severity: 'low', detectedAt: '2026-02-24T07:00:00Z', resolvedAt: '2026-02-24T08:30:00Z' },
  { id: 'brk-003', integrationName: 'Fidelity Custodian', field: 'position_quantity', expectedValue: '6500 (EFA)', actualValue: '6480 (EFA)', severity: 'medium', detectedAt: '2026-02-23T07:00:00Z', resolvedAt: '2026-02-23T09:00:00Z' },
]

export const reconciliationHandlers = [
  http.get('/api/reconciliation/status', () => {
    return HttpResponse.json(integrations)
  }),

  http.get('/api/reconciliation/breaks', ({ request }) => {
    const url = new URL(request.url)
    const severity = url.searchParams.get('severity')
    const resolved = url.searchParams.get('resolved')
    let filtered = [...breaks]
    if (severity) filtered = filtered.filter((b) => b.severity === severity)
    if (resolved === 'false') filtered = filtered.filter((b) => !b.resolvedAt)
    if (resolved === 'true') filtered = filtered.filter((b) => !!b.resolvedAt)
    return HttpResponse.json(filtered)
  }),

  http.get('/api/reconciliation/health', () => {
    return HttpResponse.json(integrations)
  }),
]
