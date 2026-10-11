import { describe, it, expect } from 'vitest'

const run = (thread: string, agent: string, viewer = 'user-001') =>
  fetch(`/api/workspace/threads/${thread}/agents/${agent}/run`, { method: 'POST', headers: { 'X-Viewer': viewer } })

describe('agent runs (rule 7)', () => {
  it('posts findings once; a repeat returns the same messages', async () => {
    const first = await (await run('th-johnson-review', 'drift-monitor')).json()
    const second = await (await run('th-johnson-review', 'drift-monitor')).json()
    expect(first.length).toBeGreaterThan(0)
    expect(second.map((m: { id: string }) => m.id)).toEqual(first.map((m: { id: string }) => m.id))
    const thread = await (await fetch('/api/workspace/threads/th-johnson-review', { headers: { 'X-Viewer': 'user-001' } })).json()
    expect(thread.messages.filter((m: { kind: string }) => m.kind === 'agent_finding')).toHaveLength(first.length)
  })
  it('refuses a client thread, an agent not on the thread, and an invisible thread', async () => {
    expect((await run('th-robert', 'drift-monitor')).status).toBe(400)
    expect((await run('th-brief', 'pretrade-check')).status).toBe(403)
    expect((await run('th-johnson-review', 'drift-monitor', 'cli-001')).status).toBe(404)
  })
  it('an agent can never record an act', async () => {
    const r = await fetch('/api/workspace/acts', { method: 'POST', headers: { 'X-Viewer': 'drift-monitor', 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'send_to_client', draftId: 'x' }) })
    expect(r.status).toBe(401)
  })
})
