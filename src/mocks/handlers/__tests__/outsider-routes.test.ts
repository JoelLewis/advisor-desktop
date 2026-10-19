import { describe, it, expect } from 'vitest'
import type { RequestHandler } from 'msw'
import { handlers } from '../index'
import { store } from '@/mocks/data/workspace-store'
import { PATRICIA_THREAD_ID } from '@/mocks/data/workspace-seed'
import { holdMeeting, meetingView } from '@/mocks/workspace/meetings'
import { draftMeetingNotes } from '@/mocks/workspace/meeting-agents'
import { fileMeetingRecord } from '@/mocks/workspace/meeting-acts'
import { draftRecap } from '@/mocks/workspace/recap'
import { sendToParty } from '@/mocks/workspace/acts'
import { ok } from '@/mocks/workspace/__tests__/story-fixture'

/**
 * The per-route guard. Outsider stripping happens route by route (outsider-view.ts and withoutProvenance at each
 * handler), so this walks every handler the app registers, as each outsider, with their own ids filled in. A route
 * that answers them must be one of the routes known to serve outsiders, and what it serves must carry nothing
 * firm-only. A new route an outsider can reach fails here until it is added to the list below, and its payload is
 * checked the moment it is.
 */
const ROBERT = 'cli-001'
const PATRICIA = 'cli-002'
const PELL = 'prsp-011'
const ADRIAN = 'user-001'

/** Every route an outsider may get an answer from: their thread and its records, their directory, and her own steps. */
const OUTSIDER_ROUTES: ReadonlySet<string> = new Set([
  'GET /api/workspace/people',
  'GET /api/workspace/threads',
  'GET /api/workspace/threads/:id',
  'POST /api/workspace/threads/:id/messages',
  'GET /api/workspace/acts',
  'GET /api/workspace/prospects/:id/steps',
  'POST /api/workspace/prospects/:id/questionnaire',
  'POST /api/workspace/prospects/:id/statements',
  'POST /api/workspace/prospects/:id/accept',
])

/** What an outsider must never be served, by key, anywhere in a payload. */
const FIRM_ONLY_KEYS: ReadonlySet<string> = new Set([
  'fingerprint', 'basis', 'recordBasis', 'bestInterest', 'viaPresenter', 'rationale', 'editedBy', 'suitability', 'clientName', 'deliveries', 'copies',
])
const FIRM_RECORD_ID = /REC-\d{4}/
const UTC_STAMP = /\d{4}-\d{2}-\d{2}T[\d:.]+Z/

type Route = { method: string; path: string }

function routesOf(all: readonly RequestHandler[]): Route[] {
  return all.flatMap((h) => {
    const { method, path } = h.info as { method?: unknown; path?: unknown }
    // The workspace's 405 catch-all answers every method: it refuses edits, it serves nothing.
    return typeof method === 'string' && typeof path === 'string' ? [{ method, path }] : []
  })
}

const OWN = new Map([[ROBERT, { thread: 'th-robert', client: ROBERT }], [PELL, { thread: 'th-pell', client: ROBERT }], [PATRICIA, { thread: PATRICIA_THREAD_ID, client: PATRICIA }]])

/** The route with the outsider's own ids where it names theirs, and the firm's where it names the firm's. */
function urlFor(route: Route, viewer: string): string {
  const own = OWN.get(viewer)
  if (!own) throw new Error(`${viewer} is not an outsider of this test`)
  const params: Record<string, string> = {
    id: route.path.includes('/prospects/:id') ? PELL : route.path.includes('/proposals/:id') ? 'prop-0001' : own.thread,
    eventId: 'evt-010', householdId: 'hh-001', clientId: own.client, accountId: 'acc-002', modelId: 'mod-005', alertId: 'comp-001',
    draftId: 'draft-0001', agentId: 'drift-monitor', messageId: 'msg-0001', proposalId: 'prop-0001',
  }
  const path = route.path.replace(/:(\w+)/g, (_, name: string) => {
    const value = params[name]
    if (value === undefined) throw new Error(`No stand-in for :${name} in ${route.path}`)
    return value
  })
  return path === '/api/workspace/acts' ? `${path}?threadId=${own.thread}` : path
}

const BODIES: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ['POST /api/workspace/threads/:id/messages', { body: 'Thank you.' }],
  ['POST /api/workspace/prospects/:id/accept', { version: 1 }],
])

async function call(method: string, url: string, viewer: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Viewer': viewer }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) })
  return { status: res.status, text: await res.text() }
}

function firmOnlyKeysIn(value: unknown, at = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => firmOnlyKeysIn(v, `${at}[${i}]`))
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([k, v]) => [...(FIRM_ONLY_KEYS.has(k) ? [`${at}.${k}`] : []), ...firmOnlyKeysIn(v, `${at}.${k}`)])
}

/** The meeting recap, sent to both spouses as one act with two deliveries. */
function sendRecapToBothSpouses() {
  ok(holdMeeting(ADRIAN, 'evt-010'))
  ok(draftMeetingNotes(ADRIAN, 'evt-010'))
  const notesFingerprint = meetingView(ADRIAN, 'evt-010')?.notesFingerprint
  if (!notesFingerprint) throw new Error('the notes have a fingerprint')
  ok(fileMeetingRecord(ADRIAN, 'evt-010', notesFingerprint))
  ok(sendToParty(ADRIAN, ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.id))
}

/** The firm gives each outsider something to read: the recap to both spouses, a message to Robert, and Dr. Pell's proposal sent with its disclosures. */
async function seedOutsiderRecords() {
  sendRecapToBothSpouses()
  const draft = JSON.parse((await call('POST', '/api/workspace/threads/th-robert/drafts', ADRIAN, { body: 'Your review is booked for Friday.' })).text)
  expect((await call('POST', '/api/workspace/acts', ADRIAN, { kind: 'send_to_party', draftId: draft.id })).status).toBe(201)
  expect((await call('POST', '/api/workspace/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee after the introduction.' })).status).toBe(201)
  expect((await call('POST', '/api/workspace/prospects/prsp-011/advance', ADRIAN, { to: 'reply' })).status).toBe(201)
  const proposal = JSON.parse((await call('POST', '/api/workspace/prospects/prsp-011/proposals', ADRIAN)).text)
  const v1 = proposal.versions[0]
  expect((await call('POST', '/api/workspace/acts', ADRIAN, { kind: 'approve_proposal', proposalId: proposal.id, version: 1, fingerprint: v1.fingerprint, rationale: 'Growth fits her answers.' })).status).toBe(201)
  expect((await call('POST', '/api/workspace/acts', ADRIAN, { kind: 'deliver_disclosure', prospectId: PELL, document: 'form_crs' })).status).toBe(201)
  expect((await call('POST', '/api/workspace/acts', ADRIAN, { kind: 'send_to_party', proposalId: proposal.id })).status).toBe(201)
}

describe('every route an outsider can reach', () => {
  const routes = routesOf(handlers)

  it('the walk covers the whole app: every service family registers routes here', () => {
    for (const family of ['/api/workspace/', '/api/custodian/', '/api/crm/', '/api/pms/', '/api/oms/', '/api/compliance/']) {
      expect(routes.some((r) => r.path.startsWith(family)), family).toBe(true)
    }
  })

  it.each([ROBERT, PELL, PATRICIA])('%s is answered only by the outsider routes, and is served nothing firm-only', async (viewer) => {
    await seedOutsiderRecords()
    const answered: string[] = []
    for (const route of routes) {
      const key = `${route.method} ${route.path}`
      const res = await call(route.method, urlFor(route, viewer), viewer, BODIES.get(key))
      if (res.status >= 400) continue
      answered.push(key)
      expect(res.text, `${key}: a firm record id`).not.toMatch(FIRM_RECORD_ID)
      expect(res.text, `${key}: a UTC stamp`).not.toMatch(UTC_STAMP)
      if (viewer === PATRICIA) {
        expect(res.text, `${key}: Robert's thread`).not.toContain('th-robert')
        for (const m of store().messages.filter((x) => x.threadId === 'th-robert')) expect(res.text, `${key}: Robert's message ${m.id}`).not.toContain(`"${m.id}"`)
      }
      expect(firmOnlyKeysIn(JSON.parse(res.text)), key).toEqual([])
    }
    expect(answered.filter((r) => !OUTSIDER_ROUTES.has(r)), 'routes that answer an outsider but are not known to serve one').toEqual([])
    for (const read of ['GET /api/workspace/people', 'GET /api/workspace/threads', 'GET /api/workspace/threads/:id', 'GET /api/workspace/acts']) {
      expect(answered, `${viewer} reads ${read}`).toContain(read)
    }
  })
})
