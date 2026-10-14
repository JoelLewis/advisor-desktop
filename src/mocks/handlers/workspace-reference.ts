import { http, HttpResponse } from 'msw'
import { isReferenceView, type TakeResult } from '@/types/reference'
import { isAttributionPeriod } from '@/types/reference-attribution'
import { isBlotterStatus, type BlotterFilters } from '@/types/reference-blotter'
import { attributionView } from '../reference/attribution'
import { billingView } from '../reference/billing'
import { blotterView } from '../reference/blotter'
import { modelDetail, modelsView } from '../reference/models'
import { practiceView } from '../reference/practice'
import { reconciliationView } from '../reference/reconciliation'
import { accountRiskView, bookRiskView } from '../reference/risk'
import { notFound } from './utils'
import { takeToTeamThread } from '../reference/take'
import { badRequest, firmViewer, nonEmptyString, readJson, refusal } from './workspace-http'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const served = <T extends Record<string, unknown>>(view: T | undefined) => (view === undefined ? notFound() : HttpResponse.json(view))
const badFilter = (message: string) => HttpResponse.json({ code: 'BAD_FILTER', message }, { status: 400 })

function blotterFilters(url: URL): { ok: true; filters: BlotterFilters } | { ok: false; message: string } {
  const read = (key: string) => url.searchParams.get(key) || undefined
  const [status, accountId, since, until] = [read('status'), read('accountId'), read('since'), read('until')]
  if (status !== undefined && !isBlotterStatus(status)) return { ok: false, message: `${status} is not an order status.` }
  if ((since !== undefined && !ISO_DAY.test(since)) || (until !== undefined && !ISO_DAY.test(until))) return { ok: false, message: 'Dates are YYYY-MM-DD.' }
  if (since !== undefined && until !== undefined && since > until) return { ok: false, message: 'The since date is after the until date.' }
  return { ok: true, filters: { ...(status ? { status } : {}), ...(accountId ? { accountId } : {}), ...(since ? { since } : {}), ...(until ? { until } : {}) } }
}

/** The firm's reference views. An outsider is told each does not exist before its query is read. */
export const workspaceReferenceHandlers = [
  http.get('/api/workspace/reference/billing', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(billingView(viewer.viewerId)) : viewer.response
  }),
  http.get('/api/workspace/reference/practice', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(practiceView(viewer.viewerId)) : viewer.response
  }),
  http.get('/api/workspace/reference/reconciliation', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(reconciliationView(viewer.viewerId)) : viewer.response
  }),
  http.get('/api/workspace/reference/risk', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(bookRiskView(viewer.viewerId)) : viewer.response
  }),
  http.get('/api/workspace/reference/risk/:accountId', ({ request, params }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(accountRiskView(viewer.viewerId, String(params.accountId))) : viewer.response
  }),
  http.get('/api/workspace/reference/attribution/:accountId', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const period = new URL(request.url).searchParams.get('period') ?? 'ytd'
    if (!isAttributionPeriod(period)) return HttpResponse.json({ code: 'BAD_PERIOD', message: 'The period is mtd, qtd, ytd, 1y, 3y or 5y.' }, { status: 400 })
    return served(attributionView(viewer.viewerId, String(params.accountId), period))
  }),
  http.get('/api/workspace/reference/models', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(modelsView(viewer.viewerId)) : viewer.response
  }),
  http.get('/api/workspace/reference/models/:modelId', ({ request, params }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? served(modelDetail(viewer.viewerId, String(params.modelId))) : viewer.response
  }),
  http.get('/api/workspace/reference/blotter', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const parsed = blotterFilters(new URL(request.url))
    return parsed.ok ? served(blotterView(viewer.viewerId, parsed.filters)) : badFilter(parsed.message)
  }),
  http.post('/api/workspace/reference/take', async ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    if (!body || !isReferenceView(body.view) || !nonEmptyString(body.rowId)) return badRequest('view (a reference view) and rowId are required.')
    const r = takeToTeamThread(viewer.viewerId, body.view, body.rowId)
    if (!r.ok) return refusal(r)
    const result: TakeResult = { threadId: r.thread.id, threadTitle: r.thread.title, messageId: r.message.id, created: r.created }
    return HttpResponse.json(result, { status: r.created ? 201 : 200 })
  }),
]
