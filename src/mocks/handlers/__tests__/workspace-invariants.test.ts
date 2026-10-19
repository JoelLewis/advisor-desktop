import { describe, it, expect } from 'vitest'
import { fingerprint } from '@/lib/fingerprint'
import { store } from '@/mocks/data/workspace-store'

async function call(method: string, path: string, viewer: string, body?: unknown) {
  const res = await fetch(`/api/workspace${path}`, {
    method, headers: { 'X-Viewer': viewer, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, body: await res.json() }
}

describe('client thread invariant (books and records)', () => {
  it('every firm-authored text in a client thread is a sent draft with a matching act', async () => {
    await call('POST', '/threads/th-robert/messages', 'cli-001', { body: 'Question' })
    const draft = (await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'Answer' })).body
    await call('POST', '/threads/th-robert/drafts', 'user-002', { body: 'Never sent' })
    await call('POST', '/acts', 'user-001', { kind: 'send_to_party', draftId: draft.id })

    const { messages, acts } = store()
    const clientIdByThread = new Map(store().threads.filter((t) => t.visibility === 'client').map((t) => [t.id, t.partyId]))
    const firmTexts = messages.filter((m) => m.kind === 'text' && clientIdByThread.has(m.threadId) && m.authorId !== clientIdByThread.get(m.threadId))
    expect(firmTexts.length).toBeGreaterThan(0)
    for (const m of firmTexts) {
      if (m.kind !== 'text') continue
      const index = messages.indexOf(m)
      const next = messages[index + 1]
      expect(next).toMatchObject({ kind: 'act', threadId: m.threadId })
      const act = acts.find((a) => next?.kind === 'act' && a.id === next.actId)
      expect(act).toMatchObject({ kind: 'send_to_party', actorId: m.authorId, at: m.at })
      expect(act?.fingerprint).toBe(fingerprint(m.body))
    }
    expect(store().drafts.map((d) => d.body)).toEqual(['Never sent'])
  })
})
