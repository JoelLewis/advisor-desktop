import type { ReferenceView } from '@/types/reference'
import { isAttributionPeriod, type AttributionPeriod } from '@/types/reference-attribution'
import type { BlotterFilters } from '@/types/reference-blotter'

/** A path with its query; empty values are left out. `from` is always the thread to go back to. */
function withQuery(path: string, query: Readonly<Record<string, string | undefined>>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  const text = params.toString()
  return text ? `${path}?${text}` : path
}

export const billingHref = (householdId?: string, fromThreadId?: string) => withQuery('/billing', { household: householdId, from: fromThreadId })
export const practiceHref = (fromThreadId?: string) => withQuery('/practice', { from: fromThreadId })
export const reconciliationHref = (fromThreadId?: string) => withQuery('/reconciliation', { from: fromThreadId })
export const bookRiskHref = (fromThreadId?: string) => withQuery('/risk', { from: fromThreadId })
export const accountRiskHref = (accountId: string, fromThreadId?: string) => withQuery(`/accounts/${encodeURIComponent(accountId)}/risk`, { from: fromThreadId })
export const accountAttributionHref = (accountId: string, fromThreadId?: string, period?: AttributionPeriod) =>
  withQuery(`/accounts/${encodeURIComponent(accountId)}/attribution`, { period, from: fromThreadId })
export const modelsHref = (fromThreadId?: string) => withQuery('/models', { from: fromThreadId })
export const modelHref = (modelId: string, fromThreadId?: string) => withQuery(`/models/${encodeURIComponent(modelId)}`, { from: fromThreadId })
export const blotterHref = (filters: BlotterFilters = {}, fromThreadId?: string) =>
  withQuery('/blotter', { status: filters.status, accountId: filters.accountId, since: filters.since, until: filters.until, from: fromThreadId })

export const REFERENCE_VIEW_TITLE: Readonly<Record<ReferenceView, string>> = {
  billing: 'Billing', reconciliation: 'Reconciliation', risk: 'Risk', attribution: 'Attribution', models: 'Models', practice: 'Practice', blotter: 'Blotter',
}

/** Where a quoted row lives, opened from the thread it was quoted into. */
export function referenceRowHref(view: ReferenceView, rowId: string, fromThreadId: string): string {
  switch (view) {
    case 'billing': return billingHref(rowId, fromThreadId)
    case 'practice': return practiceHref(fromThreadId)
    case 'reconciliation': return reconciliationHref(fromThreadId)
    case 'risk': return accountRiskHref(rowId, fromThreadId)
    case 'attribution': {
      const [accountId = rowId, period] = rowId.split(':')
      return accountAttributionHref(accountId, fromThreadId, isAttributionPeriod(period) ? period : undefined)
    }
    case 'models': return modelHref(rowId.split(':')[0] ?? rowId, fromThreadId)
    case 'blotter': return blotterHref({}, fromThreadId)
  }
}
