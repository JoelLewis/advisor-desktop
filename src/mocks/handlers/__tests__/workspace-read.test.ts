import { describe, it, expect } from 'vitest'
import { JOHNSON_REASON } from '@/test/suitability-fixture'

async function call(path: string, viewer?: string) {
  const res = await fetch(`/api/workspace${path}`, { headers: viewer ? { 'X-Viewer': viewer } : {} })
  return { status: res.status, body: res.status === 200 ? await res.json() : null }
}

describe('workspace read API', () => {
  it('requires a known viewer', async () => {
    expect((await call('/threads')).status).toBe(401)
    expect((await call('/threads', 'nobody')).status).toBe(401)
  })
  it('lists only visible threads', async () => {
    const { body } = await call('/threads', 'cli-001')
    expect(body.map((t: { id: string }) => t.id)).toEqual(['th-robert'])
  })
  it('a hidden thread is 404, not 403', async () => {
    expect((await call('/threads/th-johnson-review', 'cli-001')).status).toBe(404)
    expect((await call('/threads/th-brief', 'cco-001')).status).toBe(404)
    expect((await call('/threads/does-not-exist', 'user-001')).status).toBe(404)
  })
  it('serves a visible thread with its messages in time order', async () => {
    const { status, body } = await call('/threads/th-johnson-review', 'user-003')
    expect(status).toBe(200)
    expect(body.thread.id).toBe('th-johnson-review')
    const times = body.messages.map((m: { at: string }) => m.at)
    expect([...times].sort()).toEqual(times)
  })
  it('the directory lists people and agents', async () => {
    const { body } = await call('/people', 'user-001')
    expect(body.people.find((p: { id: string }) => p.id === 'user-001').name).toBe('Adrian Hale')
    expect(body.agents.map((a: { id: string }) => a.id)).toEqual(['drift-monitor', 'pretrade-check', 'harvest-scanner', 'proposal', 'client-letter', 'meeting-prep', 'meeting-notes', 'prospect-profile', 'transfer-in'])
    expect(body.permissions['user-001']).toContain('send_to_party')
    expect(body.permissions['user-002']).not.toContain('send_to_party')
  })
})

describe('directory scoping', () => {
  it('a client sees only the people on their own threads, no agents, only their own permissions', async () => {
    const { body } = await call('/people', 'cli-001')
    expect(body.people.map((p: { id: string }) => p.id).sort()).toEqual(['cli-001', 'user-001', 'user-002'])
    expect(body.agents).toEqual([])
    expect(Object.keys(body.permissions)).toEqual(['cli-001'])
  })
  it('a firm viewer keeps the full directory', async () => {
    const { body } = await call('/people', 'user-001')
    expect(body.people.length).toBeGreaterThan(3)
    expect(body.agents).toHaveLength(9)
    expect(Object.keys(body.permissions).length).toBe(body.people.length)
  })
  it('a client is served the acts in their thread without the subject they were made from', async () => {
    const draft = await (await fetch('/api/workspace/threads/th-robert/drafts', {
      method: 'POST', headers: { 'X-Viewer': 'user-001', 'Content-Type': 'application/json' }, body: JSON.stringify({ body: 'Your statement is ready.' }),
    })).json()
    await fetch('/api/workspace/acts', {
      method: 'POST', headers: { 'X-Viewer': 'user-001', 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'send_to_party', draftId: draft.id }),
    })
    const firm = await call('/acts?threadId=th-robert', 'user-001')
    expect(firm.body[0].subject).toEqual({ type: 'draft', id: draft.id })
    const client = await call('/acts?threadId=th-robert', 'cli-001')
    expect(client.body).toHaveLength(1)
    expect(client.body[0]).not.toHaveProperty('subject')
    expect(client.body[0]).toMatchObject({ id: '1', kind: 'send_to_party', actorId: 'user-001' })
    expect(client.body[0]).not.toHaveProperty('fingerprint')
  })
  it("a client is served a sent letter's act without its proposal basis or its editors", async () => {
    const post = (path: string, body: unknown) => fetch(`/api/workspace${path}`, {
      method: 'POST', headers: { 'X-Viewer': 'user-001', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).then((r) => r.json())
    const proposal = await post('/proposals', { threadId: 'th-johnson-review', accountId: 'acc-002' })
    await post('/acts', { kind: 'approve_proposal', proposalId: proposal.id, version: 1, fingerprint: proposal.versions[0].fingerprint, suitability: JOHNSON_REASON })
    const letter = await post('/threads/th-robert/drafts/letter', { proposalId: proposal.id })
    const edited = await post(`/threads/th-robert/drafts/${letter.id}/revisions`, { body: `${letter.body}\n\nAdrian` })
    await post('/acts', { kind: 'send_to_party', draftId: edited.id })
    const firm = await call('/acts?threadId=th-robert', 'user-001')
    expect(firm.body[0]).toMatchObject({ basis: { proposalId: proposal.id, version: 1 }, editedBy: ['user-001'] })
    const client = await call('/acts?threadId=th-robert', 'cli-001')
    expect(client.body[0]).not.toHaveProperty('basis')
    expect(client.body[0]).not.toHaveProperty('editedBy')
    expect(client.body[0]).not.toHaveProperty('messageId')
    const thread = await call('/threads/th-robert', 'cli-001')
    expect(JSON.stringify(thread.body)).not.toMatch(/basis|editedBy|editorIds|client-letter|prop-/)
  })
})
