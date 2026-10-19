import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { audienceOf } from '../party'

const thread = (id: string) => {
  const t = store().threads.find((x) => x.id === id)
  if (!t) throw new Error(`no thread ${id}`)
  return t
}

describe('audienceOf', () => {
  beforeEach(() => resetWorkspaceStore())

  it('a private thread is its owner alone', () => expect(audienceOf(thread('th-brief'))).toEqual({ kind: 'owner' }))
  it('a client thread is read by its party', () => {
    expect(audienceOf(thread('th-robert'))).toEqual({ kind: 'party', name: 'Robert Johnson' })
    expect(audienceOf(thread('th-pell'))).toEqual({ kind: 'party', name: 'Dr. Amanda Pell' })
  })
  it("a team thread about an account names the account's owner", () => {
    expect(audienceOf(thread('th-johnson-review'))).toEqual({ kind: 'team', about: ['Robert Johnson'] })
  })
  it('a household thread names every client in it', () => {
    expect(audienceOf(thread('th-johnson-meeting'))).toEqual({ kind: 'team', about: ['Robert Johnson', 'Patricia Johnson'] })
  })
  it("a prospect's team thread names her", () => {
    expect(audienceOf(thread('th-pell-work'))).toEqual({ kind: 'team', about: ['Dr. Amanda Pell'] })
  })
  it('a thread about no client names nobody', () => {
    expect(audienceOf({ id: 'th-x', title: 'Models', visibility: 'internal', memberIds: ['user-001'], agentIds: [], subject: { type: 'model', id: 'mod-002' } }))
      .toEqual({ kind: 'team', about: [] })
    expect(audienceOf({ id: 'th-y', title: 'Notes', visibility: 'internal', memberIds: ['user-001'], agentIds: [] })).toEqual({ kind: 'team', about: [] })
  })
})
