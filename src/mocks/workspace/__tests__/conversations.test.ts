import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { startConversation } from '../conversations'
import { visibleThreads } from '../visibility'
import { ok } from './story-fixture'

const ADRIAN = 'user-001'
const start = (viewer: string, audience: Parameters<typeof startConversation>[1]['audience'], title = "Patricia's models", householdId = 'hh-001') =>
  startConversation(viewer, { householdId, title, audience })

describe('starting a conversation from a household', () => {
  it('Just me: a thread about the household, read by its owner alone', () => {
    const { thread, created } = ok(start(ADRIAN, { kind: 'private' }))
    expect(created).toBe(true)
    expect(thread).toMatchObject({ title: "Patricia's models", visibility: 'private', ownerId: ADRIAN, memberIds: [ADRIAN], subject: { type: 'household', id: 'hh-001' } })
    expect(store().threads).toContainEqual(thread)
  })

  it('Larkfield team: a thread about the household for the team, which no client sees', () => {
    const { thread } = ok(start(ADRIAN, { kind: 'internal' }))
    expect(thread).toMatchObject({ visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'], subject: { type: 'household', id: 'hh-001' } })
    expect(visibleThreads('cli-001').map((t) => t.id)).toEqual(['th-robert'])
  })

  it('a client conversation with a member who has one opens it; none is created', () => {
    const before = store().threads.length
    const { thread, created } = ok(start(ADRIAN, { kind: 'client', clientId: 'cli-001' }))
    expect([thread.id, created, store().threads.length]).toEqual(['th-robert', false, before])
  })

  it("Patricia's client conversation opens her own thread too, from either household page", () => {
    const { thread, created } = ok(start(ADRIAN, { kind: 'client', clientId: 'cli-002' }))
    expect([thread.id, created]).toEqual(['th-patricia', false])
  })

  it('asking twice for the same member makes one conversation, and no client reads a Just me or team thread', () => {
    const first = ok(start(ADRIAN, { kind: 'client', clientId: 'cli-005' }, '', 'hh-003'))
    const second = ok(start(ADRIAN, { kind: 'client', clientId: 'cli-005' }, '', 'hh-003'))
    expect([second.thread.id, second.created]).toEqual([first.thread.id, false])
    const mine = ok(start(ADRIAN, { kind: 'private' }, 'Notes'))
    const team = ok(start(ADRIAN, { kind: 'internal' }, 'Review plan'))
    for (const client of ['cli-001', 'cli-002']) {
      const seen = visibleThreads(client).map((t) => t.id)
      expect(seen).not.toContain(mine.thread.id)
      expect(seen).not.toContain(team.thread.id)
    }
  })

  it('a client conversation with a member who has none makes it, titled with their name, and they see only it', () => {
    const { thread, created } = ok(start(ADRIAN, { kind: 'client', clientId: 'cli-005' }, '', 'hh-003'))
    expect(created).toBe(true)
    expect(thread).toMatchObject({ title: 'Sarah Williams', visibility: 'client', partyId: 'cli-005', subject: { type: 'client', id: 'cli-005' } })
  })

  it('refuses what it cannot start', () => {
    expect(start(ADRIAN, { kind: 'client', clientId: 'cli-003' })).toMatchObject({ ok: false, status: 400, code: 'NOT_A_MEMBER' })
    expect(start(ADRIAN, { kind: 'private' }, '   ')).toMatchObject({ ok: false, status: 400, code: 'TITLE_REQUIRED' })
    expect(start(ADRIAN, { kind: 'private' }, 'x'.repeat(121))).toMatchObject({ ok: false, status: 400, code: 'TITLE_TOO_LONG' })
    expect(start(ADRIAN, { kind: 'private' }, 'Notes', 'hh-999')).toMatchObject({ ok: false, status: 404, code: 'NO_HOUSEHOLD' })
    expect(start('user-003', { kind: 'client', clientId: 'cli-005' }, '', 'hh-003')).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(start('cli-001', { kind: 'private' })).toMatchObject({ ok: false, status: 404 })
  })
})
