import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}
const ADRIAN = 'user-001'
const ROBERT = 'cli-001'
async function filed() {
  await call('POST', '/meetings/evt-010/hold', ADRIAN)
  const { body: view } = await call('POST', '/meetings/evt-010/notes/draft', ADRIAN)
  const { body: act } = await call('POST', '/acts', ADRIAN, { kind: 'file_meeting_record', eventId: 'evt-010', fingerprint: view.notesFingerprint })
  return { view, act }
}

describe('meeting endpoints', () => {
  it('firm viewers list and read the meeting; the transcript arrives only once it is held', async () => {
    expect((await call('GET', '/meetings', 'cco-001')).body).toEqual([expect.objectContaining({ eventId: 'evt-010', title: 'Johnson annual review', state: 'scheduled' })])
    const scheduled = await call('GET', '/meetings/evt-010', 'user-002')
    expect(scheduled.status).toBe(200)
    expect(scheduled.body.transcript).toBeUndefined()
    expect((await call('POST', '/meetings/evt-010/hold', ADRIAN)).status).toBe(200)
    expect((await call('GET', '/meetings/evt-010', 'user-003')).body.transcript).toHaveLength(28)
    expect((await call('GET', '/meetings/evt-999', ADRIAN)).status).toBe(404)
  })

  it('prep posts findings and agenda v1 once; a repeat is 200; the agenda takes a new version', async () => {
    const first = await call('POST', '/meetings/evt-010/prep', ADRIAN)
    expect(first.status).toBe(201)
    expect(first.body.agenda).toHaveLength(1)
    expect((await call('POST', '/meetings/evt-010/prep', ADRIAN)).status).toBe(200)
    const items = [...first.body.agenda[0].items, { title: 'ESG alternatives for the trust', source: { kind: 'advisor' } }]
    const revised = await call('POST', '/meetings/evt-010/agenda', ADRIAN, { items })
    expect(revised.status).toBe(201)
    expect(revised.body.agenda).toHaveLength(2)
    expect((await call('POST', '/meetings/evt-010/agenda', ADRIAN, { items: [{ title: 'x' }] }))).toMatchObject({ status: 400, body: { code: 'BAD_REQUEST' } })
    expect((await call('POST', '/meetings/evt-010/agenda', ADRIAN, { items: 'everything' })).status).toBe(400)
  })

  it('notes: drafted after the hold, edited with PUT, refused line by line', async () => {
    expect((await call('POST', '/meetings/evt-010/notes/draft', ADRIAN))).toMatchObject({ status: 409, body: { code: 'NOT_HELD' } })
    await call('POST', '/meetings/evt-010/hold', ADRIAN)
    const drafted = await call('POST', '/meetings/evt-010/notes/draft', ADRIAN)
    expect(drafted.status).toBe(201)
    const lines = drafted.body.notesDraft.map((l: { id: string; text: string }) => (l.id === 'n-01' ? { ...l, text: 'Reviewed the rebalance.' } : l))
    const saved = await call('PUT', '/meetings/evt-010/notes', ADRIAN, { lines })
    expect(saved.status).toBe(200)
    expect(saved.body.notesDraft[0].text).toBe('Reviewed the rebalance.')
    expect(saved.body.notesFingerprint).not.toBe(drafted.body.notesFingerprint)
    const uncited = lines.map((l: { id: string }) => (l.id === 'n-01' ? { ...l, cites: ['t-99'] } : l))
    expect((await call('PUT', '/meetings/evt-010/notes', ADRIAN, { lines: uncited }))).toMatchObject({ status: 400, body: { code: 'UNKNOWN_CITATION' } })
    expect((await call('PUT', '/meetings/evt-010/notes', ADRIAN, { lines: [{ section: 'minutes', text: 'x', cites: ['t-01'] }] }))).toMatchObject({ status: 400, body: { code: 'BAD_REQUEST' } })
    expect(saved.body.notesDraft.find((l: { id: string }) => l.id === 'n-09').toClient).toMatchObject({ clientId: 'cli-001' })
    const badWording = lines.map((l: { id: string }) => (l.id === 'n-10' ? { ...l, toClient: { clientId: 'cli-001' } } : l))
    expect((await call('PUT', '/meetings/evt-010/notes', ADRIAN, { lines: badWording }))).toMatchObject({ status: 400, body: { code: 'BAD_REQUEST' } })
    expect((await call('PUT', '/meetings/evt-010/notes', 'user-002', { lines }))).toMatchObject({ status: 403, body: { code: 'NOT_PERMITTED' } })
  })

  it('file_meeting_record over /acts: 201 once, then 409 naming the first; another firm viewer 403; a malformed body 400', async () => {
    const { act } = await filed()
    expect(act).toMatchObject({ id: 'REC-0001', kind: 'file_meeting_record', subject: { type: 'meeting', id: 'evt-010' } })
    const again = await call('POST', '/acts', ADRIAN, { kind: 'file_meeting_record', eventId: 'evt-010', fingerprint: act.fingerprint })
    expect(again).toMatchObject({ status: 409, body: { code: 'ALREADY_FILED', message: 'The record was already filed (REC-0001).' } })
    expect((await call('POST', '/acts', 'user-002', { kind: 'file_meeting_record', eventId: 'evt-010', fingerprint: act.fingerprint })).status).toBe(403)
    expect((await call('POST', '/acts', ADRIAN, { kind: 'file_meeting_record', eventId: 'evt-010' })).status).toBe(400)
    expect((await call('GET', '/meetings/evt-010', ADRIAN)).body.tasks).toHaveLength(7)
  })

  it('a filed record cannot be edited or deleted', async () => {
    const { view } = await filed()
    expect((await call('PUT', '/meetings/evt-010/notes', ADRIAN, { lines: view.notesDraft })).status).toBe(409)
    expect((await call('DELETE', '/meetings/evt-010', ADRIAN)).status).toBe(405)
    expect((await call('PATCH', '/acts', ADRIAN, {})).status).toBe(405)
  })

  it('the recap: 409 before filing, 201 then 200 after, sent through send_to_party', async () => {
    expect((await call('POST', '/threads/th-robert/drafts/recap', ADRIAN, { eventId: 'evt-010' }))).toMatchObject({ status: 409, body: { code: 'NOT_FILED' } })
    await filed()
    const draft = await call('POST', '/threads/th-robert/drafts/recap', ADRIAN, { eventId: 'evt-010' })
    expect(draft.status).toBe(201)
    expect(draft.body.recordBasis).toMatchObject({ eventId: 'evt-010', actId: 'REC-0001' })
    expect((await call('POST', '/threads/th-robert/drafts/recap', ADRIAN, { eventId: 'evt-010' })).status).toBe(200)
    expect((await call('POST', '/threads/th-robert/drafts/recap', ADRIAN, {})).status).toBe(400)
    const sent = await call('POST', '/acts', ADRIAN, { kind: 'send_to_party', draftId: draft.body.id })
    expect(sent.status).toBe(201)
    expect(sent.body.recordBasis).toMatchObject({ actId: 'REC-0001' })
  })

  it('household and client views for the firm', async () => {
    expect((await call('GET', '/households/hh-001', 'cco-001')).body).toMatchObject({ id: 'hh-001', shortName: 'Johnson' })
    expect((await call('GET', '/clients/cli-002', 'user-003')).body).toMatchObject({ id: 'cli-002', name: 'Patricia Johnson' })
    expect((await call('GET', '/households/hh-999', ADRIAN)).status).toBe(404)
  })
})

describe('a client probing the meeting', () => {
  it('is told every meeting, household, client and recap surface does not exist, before the body is read', async () => {
    for (const [method, path, body] of [
      ['GET', '/meetings', undefined], ['GET', '/meetings/evt-010', undefined], ['POST', '/meetings/evt-010/prep', undefined],
      ['POST', '/meetings/evt-010/agenda', { items: 'nonsense' }], ['POST', '/meetings/evt-010/hold', undefined],
      ['POST', '/meetings/evt-010/notes/draft', undefined], ['PUT', '/meetings/evt-010/notes', { lines: 'nonsense' }],
      ['GET', '/households/hh-001', undefined], ['GET', '/clients/cli-001', undefined], ['GET', '/clients/cli-002', undefined],
      ['POST', '/threads/th-robert/drafts/recap', { eventId: 'evt-010' }],
      ['POST', '/acts', { kind: 'file_meeting_record', eventId: 'evt-010', fingerprint: 'X' }],
    ] as const) {
      expect((await call(method, path, ROBERT, body)).status, `${method} ${path}`).toBe(404)
    }
    expect((await call('GET', '/meetings', undefined)).status).toBe(401)
    expect(store().meetings[0]?.state).toBe('scheduled')
  })

  it("sees the sent recap's record without the firm's provenance", async () => {
    await filed()
    const draft = await call('POST', '/threads/th-robert/drafts/recap', ADRIAN, { eventId: 'evt-010' })
    await call('POST', '/acts', ADRIAN, { kind: 'send_to_party', draftId: draft.body.id })
    const acts = (await call('GET', '/acts?threadId=th-robert', ROBERT)).body as Record<string, unknown>[]
    expect(acts).toHaveLength(1)
    expect(acts[0]).not.toHaveProperty('recordBasis')
    expect(acts[0]).not.toHaveProperty('editedBy')
    expect(JSON.stringify((await call('GET', '/threads/th-robert', ROBERT)).body)).not.toMatch(/transcript|REC-0001|task-|Mike|Sarah Mitchell/)
  })
})
