import { http, HttpResponse } from 'msw'
import type { IntegrationHealth, ReconBreak, DataQualitySummary } from '@/types/reconciliation'

const integrations: IntegrationHealth[] = [
  { name: 'Schwab Custodian', status: 'synced', lastSync: '2026-02-27T07:00:00Z', breakCount: 1, uptime: 99.8 },
  { name: 'Fidelity Custodian', status: 'synced', lastSync: '2026-02-27T07:00:00Z', breakCount: 0, uptime: 99.6 },
  { name: 'Vanguard Custodian', status: 'synced', lastSync: '2026-02-27T07:00:00Z', breakCount: 0, uptime: 99.9 },
  { name: 'Orion Portfolio', status: 'synced', lastSync: '2026-02-27T06:45:00Z', breakCount: 0, uptime: 99.7 },
  { name: 'Market Data Feed', status: 'synced', lastSync: '2026-02-27T09:31:00Z', breakCount: 0, uptime: 99.95 },
  { name: 'CRM (Salesforce)', status: 'synced', lastSync: '2026-02-27T08:00:00Z', breakCount: 0, uptime: 99.7 },
  { name: 'Compliance (RegEd)', status: 'synced', lastSync: '2026-02-27T07:30:00Z', breakCount: 0, uptime: 99.4 },
  { name: 'Financial Planning (MoneyGuidePro)', status: 'pending', lastSync: '2026-02-26T22:00:00Z', breakCount: 1, uptime: 98.2 },
  { name: 'DocuSign', status: 'synced', lastSync: '2026-02-27T08:15:00Z', breakCount: 0, uptime: 99.9 },
]

const breaks: ReconBreak[] = [
  { id: 'brk-001', integrationName: 'Financial Planning (MoneyGuidePro)', field: 'goal_probability', expectedValue: '0.87', actualValue: '0.85', severity: 'low', detectedAt: '2026-02-27T07:00:00Z' },
  { id: 'brk-002', integrationName: 'Schwab Custodian', accountId: 'acc-003', accountName: 'Williams Joint', field: 'cash_balance', expectedValue: '$164,000.00', actualValue: '$163,850.00', severity: 'medium', detectedAt: '2026-02-27T07:00:00Z' },
  { id: 'brk-003', integrationName: 'Fidelity Custodian', accountId: 'acc-005', accountName: 'Green Family Trust', field: 'position_quantity', expectedValue: '6,500 (EFA)', actualValue: '6,480 (EFA)', severity: 'medium', detectedAt: '2026-02-26T07:00:00Z', resolvedAt: '2026-02-26T09:00:00Z' },
  { id: 'brk-004', integrationName: 'Schwab Custodian', accountId: 'acc-001', accountName: 'Anderson IRA', field: 'transaction_count', expectedValue: '14', actualValue: '13', severity: 'low', detectedAt: '2026-02-26T07:00:00Z', resolvedAt: '2026-02-26T07:45:00Z' },
  { id: 'brk-005', integrationName: 'Vanguard Custodian', accountId: 'acc-010', accountName: 'Martinez 401(k)', field: 'market_value', expectedValue: '$892,450.00', actualValue: '$891,200.00', severity: 'low', detectedAt: '2026-02-25T07:00:00Z', resolvedAt: '2026-02-25T08:20:00Z' },
]

const summary: DataQualitySummary = {
  positionMatchRate: 99.7,
  cashMatchRate: 99.4,
  transactionMatchRate: 99.8,
  openBreaks: breaks.filter((b) => !b.resolvedAt).length,
  resolvedToday: 1,
  avgResolutionMinutes: 85,
}

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

  http.get('/api/reconciliation/summary', () => {
    return HttpResponse.json(summary)
  }),

  http.get('/api/reconciliation/trending', () => {
    // 30-day trending data for match rates
    const trending = Array.from({ length: 30 }, (_, i) => {
      const d = new Date('2026-01-29')
      d.setDate(d.getDate() + i)
      const date = d.toISOString().slice(0, 10)
      const noise = () => (Math.sin(i * 0.7) * 0.2 + Math.cos(i * 1.3) * 0.15)
      return {
        date,
        positionMatchRate: Math.min(100, Math.max(98, 99.7 + noise())),
        cashMatchRate: Math.min(100, Math.max(97.5, 99.4 + noise() * 1.5)),
        transactionMatchRate: Math.min(100, Math.max(99, 99.8 + noise() * 0.5)),
        openBreaks: Math.max(0, Math.round(2 + Math.sin(i * 0.5) * 2)),
      }
    })
    return HttpResponse.json(trending)
  }),

  http.post('/api/reconciliation/breaks/:breakId/resolve', ({ params }) => {
    const brk = breaks.find((b) => b.id === params.breakId)
    if (!brk) return new HttpResponse(null, { status: 404 })
    brk.resolvedAt = new Date().toISOString()
    return HttpResponse.json(brk)
  }),
]
