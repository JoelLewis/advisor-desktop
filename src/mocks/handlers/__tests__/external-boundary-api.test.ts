import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { JOHNSON_REASON } from '@/test/suitability-fixture'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}

const FIRM_ROUTES: readonly (readonly [string, string, unknown?])[] = [
  ['GET', '/meetings'], ['GET', '/meetings/evt-010'], ['GET', '/households/hh-001'], ['GET', '/clients/cli-001'],
  ['GET', '/supervision'], ['GET', '/archive'], ['GET', '/archive?kind=bogus'], ['GET', '/proposals'], ['GET', '/proposals?threadId=th-johnson-review'],
  ['GET', '/threads/th-johnson-review'], ['GET', '/threads/th-pell-work'], ['GET', '/threads/th-pell/drafts'], ['GET', '/threads/th-robert/drafts'],
  ['POST', '/proposals', { threadId: 'th-johnson-review', accountId: 'acc-002' }],
  ['POST', '/acts', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: 'X' }],
  ['POST', '/acts', { kind: 'send_to_party', draftId: 'draft-0001' }],
  ['POST', '/acts', { kind: 'nonsense' }],
  ['POST', '/presenter/act-as-cco', { item: { kind: 'alert', id: 'comp-001' } }],
  ['POST', '/meetings/evt-010/prep'],
  ['POST', '/threads/th-robert/drafts/letter', { proposalId: 'prop-0001' }],
  ['POST', '/threads/th-robert/drafts/recap', { eventId: 'evt-010' }],
]


describe('the boundary over HTTP', () => {
  it.each(['prsp-011', 'cli-001'])('%s gets 404 from every firm route, before any body is read', async (viewer) => {
    for (const [method, path, body] of FIRM_ROUTES) expect((await call(method, path, viewer, body)).status, `${method} ${path}`).toBe(404)
  })

  it("each party reads their own thread and not the other's", async () => {
    expect((await call('GET', '/threads/th-pell', 'prsp-011')).status).toBe(200)
    expect((await call('GET', '/threads/th-robert', 'prsp-011')).status).toBe(404)
    expect((await call('GET', '/threads/th-pell', 'cli-001')).status).toBe(404)
    expect((await call('GET', '/threads', 'prsp-011')).body.map((t: { id: string }) => t.id)).toEqual(['th-pell'])
  })

  it('she writes in her own thread; the firm drafts there; Robert cannot reach it', async () => {
    expect((await call('POST', '/threads/th-pell/messages', 'prsp-011', { body: 'Looking forward to it.' })).status).toBe(201)
    expect((await call('POST', '/threads/th-pell/messages', 'cli-001', { body: 'Hello' })).status).toBe(404)
    expect(await call('POST', '/threads/th-pell/messages', 'user-001', { body: 'Hello' })).toMatchObject({ status: 403, body: { code: 'NOT_PERMITTED' } })
  })

  it('her directory names only the people in her thread, and no agents', async () => {
    const { body } = await call('GET', '/people', 'prsp-011')
    expect(body.people.map((p: { id: string }) => p.id).sort()).toEqual(['prsp-011', 'user-001', 'user-002'])
    expect(body.agents).toEqual([])
    expect(body.permissions).toEqual({ 'prsp-011': [] })
  })

  it('her acts list is empty and readable', async () => {
    expect(await call('GET', '/acts?threadId=th-pell', 'prsp-011')).toEqual({ status: 200, body: [] })
  })
})

/** The firm's own records behind the workspace: the custodian, the CRM, the PMS and compliance. */
const FIRM_RECORDS: readonly string[] = [
  '/custodian/accounts/acc-002', '/custodian/accounts/acc-002/tax-lots', '/custodian/accounts/acc-002/realized-sales',
  '/crm/households/hh-001', '/crm/households/hh-001/held-away',
  '/pms/accounts/acc-002/positions', '/pms/accounts/acc-002/drift',
  '/compliance/alerts', '/compliance/alerts/comp-002/records',
]

/** The OMS previews and checks read the same book. */
const FIRM_CHECKS: readonly (readonly [string, unknown])[] = [
  ['/oms/rebalance', { accountIds: ['acc-002'], taxAware: true }],
  ['/oms/orders/pre-check-proposal', { accountId: 'acc-002', trades: [{ symbol: 'VTI', side: 'buy', quantity: 1, estimatedValue: 268 }] }],
]

async function read(path: string, viewer: string | undefined) {
  const res = await fetch(`/api${path}`, { headers: viewer ? { 'X-Viewer': viewer } : {} })
  return { status: res.status, body: await res.json().catch(() => null) }
}

async function check(path: string, body: unknown, viewer: string | undefined) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(viewer ? { 'X-Viewer': viewer } : {}) }
  const res = await fetch(`/api${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}

describe("the firm's records over HTTP", () => {
  it.each(['cli-001', 'prsp-011'])("%s gets a bare 404 from every read of the firm's records (Robert's own household and account included)", async (viewer) => {
    for (const path of FIRM_RECORDS) expect(await read(path, viewer), path).toEqual({ status: 404, body: null })
    for (const [path, body] of FIRM_CHECKS) expect(await check(path, body, viewer), path).toEqual({ status: 404, body: null })
  })

  it('a request that names no known viewer gets 401', async () => {
    for (const path of FIRM_RECORDS) {
      expect((await read(path, undefined)).status, path).toBe(401)
      expect((await read(path, 'nobody')).status, path).toBe(401)
    }
    for (const [path, body] of FIRM_CHECKS) expect((await check(path, body, undefined)).status, path).toBe(401)
  })

  it.each(['user-001', 'user-002', 'user-003', 'cco-001'])('%s, inside the firm, reads every one of them', async (viewer) => {
    for (const path of FIRM_RECORDS) expect((await read(path, viewer)).status, path).toBe(200)
    for (const [path, body] of FIRM_CHECKS) expect((await check(path, body, viewer)).status, path).toBe(200)
  })
})

describe("the suitability reason never reaches an outsider", () => {
  const firm = (path: string, body: unknown) => call('POST', path, 'user-001', body).then((r) => r.body)
  const REASON_FIELDS = /"(?:suitability|clientName)"/

  /** A party-visible act carrying a reason, as a future act kind might: the stripping must hold even then. */
  function forgeReasonedAct(threadId: string, summary: string) {
    store().acts.push({
      id: `REC-${summary}`, kind: 'send_to_party', actorId: 'user-001', at: '2026-02-25T15:00:00Z', threadId, fingerprint: 'ABCDEF01', summary,
      suitability: { reason: 'client_acknowledged_risk', note: 'Signed 12 Feb.', clientName: 'Robert Johnson' },
    })
  }

  it.each([['cli-001', 'th-robert'], ['prsp-011', 'th-pell']])('%s reads %s without any suitability field', async (party, threadId) => {
    const proposal = await firm('/proposals', { threadId: 'th-johnson-review', accountId: 'acc-002' })
    expect(await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: proposal.id, version: 1, fingerprint: proposal.versions[0].fingerprint, suitability: JOHNSON_REASON }))
      .toMatchObject({ status: 201, body: { suitability: { clientName: 'Robert Johnson' } } })
    if (party === 'cli-001') {
      const letter = await firm('/threads/th-robert/drafts/letter', { proposalId: proposal.id })
      expect((await call('POST', '/acts', 'user-001', { kind: 'send_to_party', draftId: letter.id })).status).toBe(201)
    }
    forgeReasonedAct(threadId, 'Forged reasoned act')
    const acts = await call('GET', `/acts?threadId=${threadId}`, party)
    expect(acts.status).toBe(200)
    expect(acts.body.some((a: { summary: string }) => a.summary === 'Forged reasoned act')).toBe(true)
    expect(JSON.stringify(acts.body)).not.toMatch(REASON_FIELDS)
    const thread = await call('GET', `/threads/${threadId}`, party)
    expect(thread.status).toBe(200)
    expect(JSON.stringify(thread.body)).not.toMatch(REASON_FIELDS)
  })
})
