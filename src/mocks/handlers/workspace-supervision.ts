import { http, HttpResponse } from 'msw'
import type { ArchiveFilters, ComplianceActRequest, PresenterItem } from '@/types/workspace-supervision'
import { archiveFor, isArchiveKind } from '../workspace/archive'
import { isAlertOutcome } from '../workspace/alerts'
import { disposeAlert, escalate, releaseOrders, returnToAdvisor, reviewCorrespondence, type ComplianceFailure, type Recorded } from '../workspace/compliance-acts'
import { isCorrespondenceOutcome } from '../workspace/correspondence'
import { actAsCco } from '../workspace/presenter'
import { supervisionQueue } from '../workspace/supervision'
import { notFound } from './utils'
import { badRequest, firmViewer, nonEmptyString, readJson, refusal } from './workspace-http'

const ITEM_KINDS: ReadonlySet<string> = new Set(['orders', 'alert', 'correspondence'])
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** A compliance act's body, checked for shape; the engine decides everything else. */
export function parseComplianceAct(body: Record<string, unknown>): { ok: true; request: ComplianceActRequest } | { ok: false; message: string } {
  const { kind, fingerprint, rationale } = body
  if (!nonEmptyString(fingerprint) || typeof rationale !== 'string') return { ok: false, message: 'fingerprint and rationale are required.' }
  switch (kind) {
    case 'release_orders':
    case 'return_to_advisor':
    case 'escalate':
      return nonEmptyString(body.proposalId) && nonEmptyString(body.approvalActId)
        ? { ok: true, request: { kind, proposalId: body.proposalId, approvalActId: body.approvalActId, fingerprint, rationale } }
        : { ok: false, message: 'proposalId and approvalActId are required.' }
    case 'dispose_alert':
      return nonEmptyString(body.alertId) && isAlertOutcome(body.outcome)
        ? { ok: true, request: { kind, alertId: body.alertId, outcome: body.outcome, fingerprint, rationale } }
        : { ok: false, message: 'alertId and an outcome of approve, reject or request_changes are required.' }
    case 'review_correspondence':
      return nonEmptyString(body.messageId) && isCorrespondenceOutcome(body.outcome)
        ? { ok: true, request: { kind, messageId: body.messageId, outcome: body.outcome, fingerprint, rationale } }
        : { ok: false, message: 'messageId and an outcome of reviewed or flagged are required.' }
    default:
      return { ok: false, message: 'Unknown compliance act.' }
  }
}

export function recordComplianceAct(viewerId: string, r: ComplianceActRequest): Recorded | ComplianceFailure {
  switch (r.kind) {
    case 'release_orders': return releaseOrders(viewerId, r.proposalId, r.approvalActId, r.fingerprint, r.rationale)
    case 'return_to_advisor': return returnToAdvisor(viewerId, r.proposalId, r.approvalActId, r.fingerprint, r.rationale)
    case 'escalate': return escalate(viewerId, r.proposalId, r.approvalActId, r.fingerprint, r.rationale)
    case 'dispose_alert': return disposeAlert(viewerId, r.alertId, r.outcome, r.fingerprint, r.rationale)
    case 'review_correspondence': return reviewCorrespondence(viewerId, r.messageId, r.outcome, r.fingerprint, r.rationale)
  }
}

function archiveFilters(url: URL): { ok: true; filters: ArchiveFilters } | { ok: false; message: string } {
  const read = (key: string) => url.searchParams.get(key) || undefined
  const partyId = read('partyId')
  const kind = read('kind')
  const from = read('from')
  const to = read('to')
  if (kind !== undefined && !isArchiveKind(kind)) return { ok: false, message: `${kind} is not a kind of record.` }
  if ((from !== undefined && !ISO_DAY.test(from)) || (to !== undefined && !ISO_DAY.test(to))) return { ok: false, message: 'Dates are YYYY-MM-DD.' }
  if (from !== undefined && to !== undefined && from > to) return { ok: false, message: 'The from date is after the to date.' }
  return { ok: true, filters: { ...(partyId ? { partyId } : {}), ...(kind ? { kind } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) } }
}

const isPresenterItem = (value: unknown): value is PresenterItem =>
  typeof value === 'object' && value !== null && 'kind' in value && 'id' in value
  && typeof value.kind === 'string' && ITEM_KINDS.has(value.kind) && nonEmptyString(value.id)

/** Firm surfaces: a client gets 404 from each before anything about the request is checked. */
export const workspaceSupervisionHandlers = [
  http.get('/api/workspace/supervision', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const queue = supervisionQueue(viewer.viewerId)
    return queue ? HttpResponse.json(queue) : notFound()
  }),

  http.get('/api/workspace/archive', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const parsed = archiveFilters(new URL(request.url))
    if (!parsed.ok) return HttpResponse.json({ code: 'BAD_FILTER', message: parsed.message }, { status: 400 })
    const archive = archiveFor(viewer.viewerId, parsed.filters)
    return archive ? HttpResponse.json(archive) : notFound()
  }),

  http.post('/api/workspace/presenter/act-as-cco', async ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const item = (await readJson(request))?.item
    if (!isPresenterItem(item)) return badRequest('item must name a kind (orders, alert or correspondence) and an id.')
    const r = actAsCco(viewer.viewerId, item)
    return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
  }),
]
