import { describe, it, expect } from 'vitest'

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
    expect(body.agents.map((a: { id: string }) => a.id)).toEqual(['drift-monitor', 'pretrade-check'])
    expect(body.permissions['user-001']).toContain('send_to_client')
    expect(body.permissions['user-002']).not.toContain('send_to_client')
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
    expect(body.agents).toHaveLength(2)
    expect(Object.keys(body.permissions).length).toBe(body.people.length)
  })
})
