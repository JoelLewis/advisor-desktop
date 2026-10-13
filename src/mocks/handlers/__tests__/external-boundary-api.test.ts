import { describe, it, expect } from 'vitest'

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
