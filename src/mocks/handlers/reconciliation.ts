import { http, HttpResponse } from 'msw'
import type { IntegrationHealth, ReconBreak, DataQualitySummary } from '@/types/reconciliation'
import { startOfToday, MOCK_TODAY_ISO } from '@/lib/clock'
import { accounts } from '../data/accounts'
import { generateTransactions } from './custodian'

/**
 * A break states what the book says and what the custodian says. The book's side has to be read
 * off the book, not typed next to it — brk-004 claimed acc-003's transaction count was 14 against a
 * stream that actually returns 20, which is the same hand-typed-versus-derived defect this task
 * exists to remove, one layer down. The custodian's side is the book's minus the one transaction it
 * has not yet delivered.
 */
function transactionCount(accountId: string): number {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`Cannot count transactions for unknown account ${accountId}`)
  return generateTransactions(account.id, account.totalValue).length
}

const ACC_003_TRANSACTIONS = transactionCount('acc-003')

/**
 * D17 — every break row named the wrong account, and two named accounts that do not exist anywhere
 * in the dataset ("Williams Joint", "Green Family Trust", "Anderson IRA", "Martinez 401(k)" — the
 * book holds no 401(k)-type account at all). Each row now names the account whose id it carries,
 * and its expected value is that account's real figure.
 *
 * D18 — brk-001 was a MoneyGuidePro goal-probability difference. A planning tool disagreeing with
 * itself about a Monte Carlo result is not a custodial reconciliation break: nothing settles, no
 * position or cash figure is in dispute, and it cannot be "resolved" against a custodian. Removed
 * rather than relabelled; Phase 7 owns the integration-health log.
 */
const breaks: ReconBreak[] = [
  { id: 'brk-002', integrationName: 'Schwab Custodian', accountId: 'acc-001', accountName: 'Johnson Family Trust', field: 'cash_balance', expectedValue: '$660,170.00', actualValue: '$660,020.00', severity: 'medium', detectedAt: '2026-02-25T07:00:00Z' },
  { id: 'brk-003', integrationName: 'Fidelity Custodian', accountId: 'acc-006', accountName: 'Chen Family Irrevocable Trust', field: 'position_quantity', expectedValue: '14,500 (EFA)', actualValue: '14,480 (EFA)', severity: 'medium', detectedAt: '2026-02-24T07:00:00Z', resolvedAt: '2026-02-24T09:00:00Z' },
  { id: 'brk-004', integrationName: 'Schwab Custodian', accountId: 'acc-003', accountName: 'Robert Johnson Traditional IRA', field: 'transaction_count', expectedValue: String(ACC_003_TRANSACTIONS), actualValue: String(ACC_003_TRANSACTIONS - 1), severity: 'low', detectedAt: '2026-02-24T07:00:00Z', resolvedAt: '2026-02-24T07:45:00Z' },
  { id: 'brk-005', integrationName: 'Vanguard Custodian', accountId: 'acc-014', accountName: 'Williams 529 Education', field: 'market_value', expectedValue: '$385,000.00', actualValue: '$383,750.00', severity: 'low', detectedAt: '2026-02-23T07:00:00Z', resolvedAt: '2026-02-23T08:20:00Z' },
]

/**
 * `breakCount` is counted off the break queue rather than typed alongside it — the MoneyGuidePro
 * row previously carried a literal `breakCount: 1` for brk-001, which would have outlived the row
 * it counted and replaced one identity inconsistency with another.
 */
const INTEGRATION_HEALTH: Omit<IntegrationHealth, 'breakCount'>[] = [
  { name: 'Schwab Custodian', status: 'synced', lastSync: '2026-02-25T07:00:00Z', uptime: 99.8 },
  { name: 'Fidelity Custodian', status: 'synced', lastSync: '2026-02-25T07:00:00Z', uptime: 99.6 },
  { name: 'Vanguard Custodian', status: 'synced', lastSync: '2026-02-25T07:00:00Z', uptime: 99.9 },
  { name: 'Orion Portfolio', status: 'synced', lastSync: '2026-02-25T07:00:00Z', uptime: 99.7 },
  { name: 'Market Data Feed', status: 'synced', lastSync: '2026-02-25T09:31:00Z', uptime: 99.95 },
  { name: 'CRM (Salesforce)', status: 'synced', lastSync: '2026-02-25T07:00:00Z', uptime: 99.7 },
  { name: 'Compliance (RegEd)', status: 'synced', lastSync: '2026-02-25T07:00:00Z', uptime: 99.4 },
  { name: 'Financial Planning (MoneyGuidePro)', status: 'pending', lastSync: '2026-02-24T22:00:00Z', uptime: 98.2 },
  { name: 'DocuSign', status: 'synced', lastSync: '2026-02-25T07:00:00Z', uptime: 99.9 },
]

const integrations: IntegrationHealth[] = INTEGRATION_HEALTH.map((integration) => ({
  ...integration,
  breakCount: breaks.filter((b) => b.integrationName === integration.name && !b.resolvedAt).length,
}))

const resolved = breaks.filter((b) => b.resolvedAt)
const resolutionMinutes = resolved.map(
  (b) => (Date.parse(b.resolvedAt!) - Date.parse(b.detectedAt)) / 60_000,
)

const summary: DataQualitySummary = {
  positionMatchRate: 99.7,
  cashMatchRate: 99.4,
  transactionMatchRate: 99.8,
  openBreaks: breaks.filter((b) => !b.resolvedAt).length,
  // Counted, not typed: `resolvedToday: 1` outlived the break it described once the corrected rows
  // moved brk-005 back to 2026-02-23, and `avgResolutionMinutes: 85` never matched the timestamps.
  resolvedToday: resolved.filter((b) => b.resolvedAt!.startsWith(MOCK_TODAY_ISO)).length,
  avgResolutionMinutes: resolutionMinutes.length === 0
    ? 0
    : Math.round(resolutionMinutes.reduce((s, m) => s + m, 0) / resolutionMinutes.length),
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
    // 30-day trailing trending data for match rates, ending at today.
    // NOTE: deviates from the Task 1 brief's literal instruction ("replace new Date('2026-01-29')
    // with startOfToday()"). Applied verbatim, that produces d.getDate() + i for i in 0..29, which
    // walks FORWARD from today for 29 days — the exact "dated ahead of the data it reconciles" bug
    // (D19) this task exists to close, just pointed the other direction. Using `- 29 + i` instead
    // keeps the window trailing (day 0 = 29 days ago, day 29 = today), so it never dates itself
    // into the future relative to the frozen clock.
    const trending = Array.from({ length: 30 }, (_, i) => {
      const d = startOfToday()
      d.setDate(d.getDate() - 29 + i)
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
