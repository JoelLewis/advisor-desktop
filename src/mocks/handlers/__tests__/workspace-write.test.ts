import { describe, it, expect } from 'vitest'

async function call(method: string, path: string, viewer: string, body?: unknown) {
  const res = await fetch(`/api/workspace${path}`, {
    method, headers: { 'X-Viewer': viewer, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, body: res.status < 300 ? await res.json() : await res.json().catch(() => null) }
}

describe('posting (rule 3)', () => {
  it('members post text in firm threads', async () => {
    const r = await call('POST', '/threads/th-johnson-review/messages', 'user-003', { body: 'Looking at lots now.' })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ kind: 'text', authorId: 'user-003' })
  })
  it('firm members cannot type into a client thread', async () => {
    expect((await call('POST', '/threads/th-robert/messages', 'user-001', { body: 'Hi' })).status).toBe(403)
  })
  it('the client posts in their own thread', async () => {
    expect((await call('POST', '/threads/th-robert/messages', 'cli-001', { body: 'Thanks' })).status).toBe(201)
  })
  it('posting to an invisible thread is 404', async () => {
    expect((await call('POST', '/threads/th-johnson-review/messages', 'cli-001', { body: 'x' })).status).toBe(404)
  })
})

describe('drafts (rule 4)', () => {
  it('advisor and csa draft for clients; analyst cannot', async () => {
    expect((await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'A' })).status).toBe(201)
    expect((await call('POST', '/threads/th-robert/drafts', 'user-002', { body: 'B' })).status).toBe(201)
    expect((await call('POST', '/threads/th-robert/drafts', 'user-003', { body: 'C' })).status).toBe(404)
  })
  it('drafts never reach the client', async () => {
    await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'A' })
    expect((await call('GET', '/threads/th-robert/drafts', 'cli-001')).status).toBe(404)
    const detail = await call('GET', '/threads/th-robert', 'cli-001')
    expect(JSON.stringify(detail.body)).not.toContain('"A"')
  })
  it('drafts only on client threads', async () => {
    expect((await call('POST', '/threads/th-johnson-review/drafts', 'user-001', { body: 'A' })).status).toBe(400)
  })
})

describe('send to client (rules 5–6)', () => {
  it('records one act, posts the message to the client thread, consumes the draft', async () => {
    const draft = (await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'Sarah will be in touch this week.' })).body
    const sent = await call('POST', '/acts', 'user-001', { kind: 'send_to_party', draftId: draft.id })
    expect(sent.status).toBe(201)
    expect(sent.body).toMatchObject({ id: 'REC-0001', kind: 'send_to_party', actorId: 'user-001', threadId: 'th-robert' })
    expect(sent.body.fingerprint).toMatch(/^[0-9A-F]{8}$/)
    const seen = (await call('GET', '/threads/th-robert', 'cli-001')).body
    const last = seen.messages.slice(-2)
    expect(last[0]).toMatchObject({ kind: 'text', authorId: 'user-001', body: 'Sarah will be in touch this week.' })
    expect(last[1]).toMatchObject({ kind: 'act', actId: '1' })
    expect((await call('POST', '/acts', 'user-001', { kind: 'send_to_party', draftId: draft.id })).status).toBe(409)
  })
  it('a csa may draft but not send', async () => {
    const draft = (await call('POST', '/threads/th-robert/drafts', 'user-002', { body: 'x' })).body
    expect((await call('POST', '/acts', 'user-002', { kind: 'send_to_party', draftId: draft.id })).status).toBe(403)
  })
  it('acts are listed per thread and visible to the client only for their thread', async () => {
    const draft = (await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'y' })).body
    await call('POST', '/acts', 'user-001', { kind: 'send_to_party', draftId: draft.id })
    expect((await call('GET', '/acts?threadId=th-robert', 'cli-001')).body).toHaveLength(1)
    expect((await call('GET', '/acts?threadId=th-johnson-review', 'cli-001')).status).toBe(404)
  })
  it('other act kinds are not in phase 2', async () => {
    expect((await call('POST', '/acts', 'user-001', { kind: 'approve_proposal' })).status).toBe(400)
  })
  it('there is no way to edit or delete', async () => {
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const r = await fetch('/api/workspace/acts/REC-0001', { method, headers: { 'X-Viewer': 'user-001' } })
      expect([404, 405]).toContain(r.status)
    }
  })
})

describe('information leaks and malformed input', () => {
  it('a client gets 404 for a real pending draft', async () => {
    const draft = (await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'x' })).body
    expect((await call('POST', '/acts', 'cli-001', { kind: 'send_to_party', draftId: draft.id })).status).toBe(404)
  })
  it('a consumed draft is 409 only for those who can see its thread', async () => {
    const draft = (await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'x' })).body
    await call('POST', '/acts', 'user-001', { kind: 'send_to_party', draftId: draft.id })
    expect((await call('POST', '/acts', 'user-003', { kind: 'send_to_party', draftId: draft.id })).status).toBe(404)
    expect((await call('POST', '/acts', 'cli-001', { kind: 'send_to_party', draftId: draft.id })).status).toBe(404)
    expect((await call('POST', '/acts', 'user-001', { kind: 'send_to_party', draftId: draft.id })).status).toBe(409)
  })
  it('malformed bodies are 400 with a code', async () => {
    const bad = async (path: string, viewer: string, body: unknown) => (await call('POST', path, viewer, body))
    expect((await bad('/threads/th-johnson-review/messages', 'user-003', { body: '   ' })).status).toBe(400)
    expect((await bad('/threads/th-robert/drafts', 'user-001', { body: 5 })).body.code).toBe('BAD_REQUEST')
    expect((await bad('/acts', 'user-001', { kind: 7 })).status).toBe(400)
    const raw = await fetch('/api/workspace/threads/th-robert/drafts', { method: 'POST', headers: { 'X-Viewer': 'user-001' }, body: '{nope' })
    expect(raw.status).toBe(400)
  })
})
