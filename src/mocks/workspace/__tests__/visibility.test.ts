import { describe, it, expect, beforeEach } from 'vitest'
import { canSeeThread, visibleThreads } from '../visibility'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'

const ids = (viewer: string) => visibleThreads(viewer).map((t) => t.id).sort()

describe('viewer filtering (engine rule 2)', () => {
  beforeEach(() => resetWorkspaceStore())
  it('advisor sees all three; their private brief included', () => {
    expect(ids('user-001')).toEqual(['th-brief', 'th-johnson-meeting', 'th-johnson-review', 'th-robert'])
  })
  it('a csa sees firm threads they belong to, never another person\'s private thread', () => {
    expect(ids('user-002')).toEqual(['th-johnson-meeting', 'th-johnson-review', 'th-robert'])
  })
  it('compliance supervises internal and client threads but not private ones', () => {
    expect(ids('cco-001')).toEqual(['th-johnson-meeting', 'th-johnson-review', 'th-robert'])
  })
  it('a client sees exactly their own client thread', () => {
    expect(ids('cli-001')).toEqual(['th-robert'])
  })
  it('an unknown viewer sees nothing', () => {
    expect(ids('nobody')).toEqual([])
  })
  it('a client never sees an internal thread even if wrongly added as a member', () => {
    const internal = store().threads.find((t) => t.id === 'th-johnson-review')!
    expect(canSeeThread('cli-001', { ...internal, memberIds: [...internal.memberIds, 'cli-001'] })).toBe(false)
  })
})
