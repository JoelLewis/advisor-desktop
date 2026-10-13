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
    const r = await fetch('/api/workspace/acts', { method: 'POST', headers: { 'X-Viewer': 'drift-monitor', 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'send_to_party', draftId: 'x' }) })
    expect(r.status).toBe(401)
  })
  it('a preview writes nothing and finds the same claims as a run', async () => {
    const thread = () => fetch('/api/workspace/threads/th-johnson-review', { headers: { 'X-Viewer': 'user-001' } }).then((r) => r.json())
    const before = (await thread()).messages
    const preview = await (await fetch('/api/workspace/threads/th-johnson-review/agents/drift-monitor/preview', { headers: { 'X-Viewer': 'user-001' } })).json()
    expect((await thread()).messages).toEqual(before)
    const ran = await (await run('th-johnson-review', 'drift-monitor')).json()
    const claims = (ms: { claim: string }[]) => ms.map((m) => m.claim)
    expect(claims(preview)).toEqual(claims(ran))
    expect(preview[0].id).toBe('preview-drift-monitor-0')
  })
  it('a preview follows the run rules: 401, 400, 403, 404', async () => {
    const preview = (thread: string, agent: string, viewer?: string) =>
      fetch(`/api/workspace/threads/${thread}/agents/${agent}/preview`, { headers: viewer ? { 'X-Viewer': viewer } : {} })
    expect((await preview('th-johnson-review', 'drift-monitor')).status).toBe(401)
    expect((await preview('th-robert', 'drift-monitor', 'user-001')).status).toBe(400)
    expect((await preview('th-brief', 'pretrade-check', 'user-001')).status).toBe(403)
    expect((await preview('th-johnson-review', 'drift-monitor', 'cli-001')).status).toBe(404)
  })
})
