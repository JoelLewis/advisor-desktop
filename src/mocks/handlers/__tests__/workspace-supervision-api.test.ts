import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}

async function approvedV1() {
  const { body: detail } = await call('POST', '/proposals', 'user-001', { threadId: 'th-johnson-review', accountId: 'acc-002' })
  const fingerprint: string = detail.versions[0].fingerprint
  const { body: act } = await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint })
  return { approvalActId: act.id as string, fingerprint }
}
const release = (viewer: string, a: { approvalActId: string; fingerprint: string }, rationale = 'Reviewed.') =>
  call('POST', '/acts', viewer, { kind: 'release_orders', proposalId: 'prop-0001', approvalActId: a.approvalActId, fingerprint: a.fingerprint, rationale })

describe('supervision and archive endpoints', () => {
  it('firm viewers read the queue and the archive; a client is told neither exists; no viewer is 401', async () => {
    expect((await call('GET', '/supervision', 'user-001')).body.alerts).toHaveLength(5)
    expect((await call('GET', '/supervision', 'cco-001')).status).toBe(200)
    expect((await call('GET', '/archive', 'user-002')).body).toEqual({ entries: [], parties: [], dates: [] })
    expect((await call('GET', '/supervision', 'cli-001')).status).toBe(404)
    expect((await call('GET', '/archive', 'cli-001')).status).toBe(404)
    expect((await call('GET', '/archive?kind=bogus', 'cli-001')).status).toBe(404)
    expect((await call('GET', '/supervision', undefined)).status).toBe(401)
  })

  it('refuses archive filters it cannot read', async () => {
    for (const query of ['kind=bogus', 'from=2026-2-1', 'to=yesterday', 'from=2026-02-26&to=2026-02-25']) {
      expect(await call('GET', `/archive?${query}`, 'user-001')).toMatchObject({ status: 400, body: { code: 'BAD_FILTER' } })
    }
    expect((await call('GET', '/archive?partyId=cli-999&kind=release_orders&from=2026-02-25&to=2026-02-25', 'user-001')).status).toBe(200)
  })
})

describe('compliance acts over HTTP', () => {
  it('compliance releases once; the advisor is refused 403; a malformed body is 400', async () => {
    const a = await approvedV1()
    expect(await release('user-001', a)).toMatchObject({ status: 403, body: { code: 'NOT_PERMITTED' } })
    expect(await call('POST', '/acts', 'cco-001', { kind: 'release_orders', proposalId: 'prop-0001', rationale: 'x' })).toMatchObject({ status: 400 })
    expect(await call('POST', '/acts', 'cco-001', { kind: 'dispose_alert', alertId: 'comp-002', outcome: 'maybe', fingerprint: 'X', rationale: 'x' })).toMatchObject({ status: 400 })
    expect(await release('cco-001', a, '   ')).toMatchObject({ status: 400, body: { code: 'RATIONALE_REQUIRED' } })
    const first = await release('cco-001', a)
    expect(first).toMatchObject({ status: 201, body: { kind: 'release_orders', actorId: 'cco-001', rationale: 'Reviewed.' } })
    expect(await release('cco-001', a)).toMatchObject({ status: 409, body: { code: 'ALREADY_RELEASED' } })
  })

  it('a client gets 404 for every compliance kind, any body, and for the shortcut', async () => {
    const a = await approvedV1()
    for (const body of [
      { kind: 'release_orders', proposalId: 'prop-0001', approvalActId: a.approvalActId, fingerprint: a.fingerprint, rationale: 'x' },
      { kind: 'return_to_advisor' }, { kind: 'escalate', proposalId: 'prop-0001' },
      { kind: 'dispose_alert', alertId: 'comp-002', outcome: 'approve', fingerprint: 'X', rationale: 'x' }, { kind: 'dispose_alert' },
      { kind: 'review_correspondence', messageId: 'msg-0001', outcome: 'reviewed', fingerprint: 'X', rationale: 'x' },
      { kind: 'bogus' }, {},
    ]) expect((await call('POST', '/acts', 'cli-001', body)).status, JSON.stringify(body)).toBe(404)
    expect((await call('POST', '/presenter/act-as-cco', 'cli-001', { item: { kind: 'orders', id: 'prop-0001' } })).status).toBe(404)
    expect((await call('POST', '/presenter/act-as-cco', 'cli-001', {})).status).toBe(404)
    expect(store().acts.map((x) => x.kind)).toEqual(['approve_proposal'])
  })
})

describe('the presenter shortcut', () => {
  it("records Mark's default release as cco-001, marked as the shortcut, pressed by the presenter", async () => {
    await approvedV1()
    const r = await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'orders', id: 'prop-0001' } })
    expect(r).toMatchObject({ status: 201, body: {
      kind: 'release_orders', actorId: 'cco-001', viaPresenter: { presenterId: 'user-001' },
      rationale: 'Reviewed the approved version, its legs, tax effect, pre-trade reading and repurchase restrictions. Released for execution.',
    } })
    const again = await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'orders', id: 'prop-0001' } })
    expect(again).toMatchObject({ status: 409, body: { code: 'ALREADY_RELEASED' } })
    expect(again.body.message).toContain(r.body.id)
  })

  it('answers NOT_AWAITING_RELEASE when nothing was ever approved', async () => {
    const { body: detail } = await call('POST', '/proposals', 'user-001', { threadId: 'th-johnson-review', accountId: 'acc-002' })
    expect(await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'orders', id: detail.id } })).toMatchObject({ status: 409, body: { code: 'NOT_AWAITING_RELEASE' } })
  })

  it('is the presenter\'s alone: the other firm viewers and Mark are 403, a bad item is 400', async () => {
    for (const viewer of ['user-002', 'user-003', 'cco-001']) {
      expect(await call('POST', '/presenter/act-as-cco', viewer, { item: { kind: 'alert', id: 'comp-003' } })).toMatchObject({ status: 403, body: { code: 'NOT_PERMITTED' } })
    }
    expect(store().acts).toEqual([])
  })

  it('disposes of an alert with the default approval and refuses a bad item', async () => {
    const r = await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'alert', id: 'comp-002' } })
    expect(r).toMatchObject({ status: 201, body: { kind: 'dispose_alert', outcome: 'approve', actorId: 'cco-001', viaPresenter: { presenterId: 'user-001' } } })
    expect((await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'nope', id: 'x' } })).status).toBe(400)
  })

  it("Robert's records stay his: only the send record, without provenance", async () => {
    await approvedV1()
    const { body: draft } = await call('POST', '/threads/th-robert/drafts/letter', 'user-001', { proposalId: 'prop-0001' })
    await call('POST', '/acts', 'user-001', { kind: 'send_to_party', draftId: draft.id })
    await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'orders', id: 'prop-0001' } })
    const messageId = store().acts.find((x) => x.kind === 'send_to_party')!.messageId!
    await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'correspondence', id: messageId } })
    const { body: acts } = await call('GET', '/acts?threadId=th-robert', 'cli-001')
    expect(acts.map((x: { kind: string }) => x.kind)).toEqual(['send_to_party'])
    expect(JSON.stringify(acts)).not.toMatch(/viaPresenter|rationale|basis|editedBy|messageId/)
  })

  it('no record is edited or deleted', async () => {
    for (const method of ['PUT', 'PATCH', 'DELETE']) expect((await call(method, '/acts', 'cco-001', {})).status).toBe(405)
  })
})
