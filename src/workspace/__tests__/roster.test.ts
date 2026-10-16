import { describe, it, expect } from 'vitest'
import { rosterOf, threadTitleFor } from '@/workspace/people/roster'
import type { Directory, Thread } from '@/types/workspace'

const directory: Directory = {
  people: [
    { id: 'user-001', name: 'Adrian Hale', role: 'advisor' }, { id: 'user-002', name: 'Sarah Mitchell', role: 'csa' },
    { id: 'cco-001', name: 'Mark Davis', role: 'compliance' }, { id: 'cli-001', name: 'Robert Johnson', role: 'client' },
  ],
  agents: [], permissions: {},
}
const robert: Thread = { id: 'th-robert', title: 'Robert Johnson', visibility: 'client', partyId: 'cli-001', memberIds: ['cli-001', 'user-001', 'user-002'], agentIds: [] }
const brief: Thread = { id: 'th-brief', title: 'Brief', visibility: 'private', ownerId: 'user-001', memberIds: ['user-001'], agentIds: [] }

describe('rosterOf', () => {
  it('names each reader and their role, and compliance supervising a firm-side view', () => {
    expect(rosterOf(robert, directory, false)).toEqual([
      'Robert Johnson · Client', 'Adrian Hale · Advisor', 'Sarah Mitchell · Client service', 'Mark Davis · Compliance (supervision)',
    ])
  })
  it("an outsider's roster names compliance but no compliance person", () => {
    const roster = rosterOf(robert, directory, true)
    expect(roster).toEqual(['Robert Johnson · Client', 'Adrian Hale · Advisor', 'Sarah Mitchell · Client service', 'Larkfield compliance (review)'])
    expect(roster.join(' ')).not.toContain('Mark Davis')
  })
  it('a private thread is its owner alone', () => expect(rosterOf(brief, directory, false)).toEqual(['Adrian Hale · Advisor']))
})

describe('threadTitleFor', () => {
  it('addresses an outsider; the firm reads the thread title', () => {
    expect(threadTitleFor(robert, true)).toBe('Your conversation with Larkfield')
    expect(threadTitleFor(robert, false)).toBe('Robert Johnson')
  })
})
