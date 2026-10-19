import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { runMeetingPrepAgent } from '@/mocks/agents/meeting-prep'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { holdMeeting, reviseAgenda } from '../meetings'
import { runMeetingPrep } from '../meeting-agents'
import { approvedV1, ok, release } from './story-fixture'

const ADRIAN = 'user-001'
const prepFindings = () => store().messages.filter((m) => m.kind === 'agent_finding' && m.agentId === 'meeting-prep')

describe('running prep', () => {
  it('posts the findings in the meeting thread and agenda v1, ordered attention first, each item carrying its finding', () => {
    const r = ok(runMeetingPrep(ADRIAN, 'evt-010'))
    expect(r.created).toBe(true)
    expect(r.findings.every((f) => f.threadId === 'th-johnson-meeting' && f.agentId === 'meeting-prep')).toBe(true)
    const measured = runMeetingPrepAgent('hh-001', MOCK_NOW_ISO)
    const expectedTitles = [...measured.filter((f) => f.attention === 'attention'), ...measured.filter((f) => f.attention === 'info')].map((f) => f.agendaTitle)
    const v1 = store().meetings[0]!.agenda[0]!
    expect(v1.author).toEqual({ kind: 'agent', agentId: 'meeting-prep' })
    expect(v1.items.map((i) => i.title)).toEqual(expectedTitles)
    expect(v1.items[0]!.title).toBe('Wash-sale windows: what not to buy back')
    for (const item of v1.items) expect(r.findings.map((f) => f.id)).toContain(item.source.kind === 'finding' ? item.source.messageId : 'none')
    const line = store().messages.find((m) => m.kind === 'agenda_version')
    expect(line).toMatchObject({ version: 1, author: { kind: 'agent', agentId: 'meeting-prep' }, changeSummary: 'Proposed an agenda ordered by what needs attention first.' })
    expect(Date.parse(line!.at)).toBeGreaterThan(Date.parse(r.findings[0]!.at))
  })

  it('repeating prep returns the same findings and posts no second agenda', () => {
    const first = ok(runMeetingPrep(ADRIAN, 'evt-010'))
    const again = ok(runMeetingPrep(ADRIAN, 'evt-010'))
    expect(again.created).toBe(false)
    expect(again.findings.map((f) => f.id)).toEqual(first.findings.map((f) => f.id))
    expect(prepFindings()).toHaveLength(first.findings.length)
    expect(store().meetings[0]!.agenda).toHaveLength(1)
  })

  it('after the book moves, prep measures again; the agenda Adrian already has is left alone', () => {
    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    release(approvedV1())
    const again = ok(runMeetingPrep(ADRIAN, 'evt-010'))
    expect(again.created).toBe(true)
    expect(again.findings.some((f) => f.claim.startsWith('Orders released today were filled'))).toBe(true)
    expect(store().meetings[0]!.agenda).toHaveLength(1)
  })

  it('an agenda Adrian started before prep is not replaced', () => {
    ok(reviseAgenda(ADRIAN, 'evt-010', [{ title: 'ESG alternatives for the trust', source: { kind: 'advisor' } }]))
    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    expect(store().meetings[0]!.agenda.map((v) => v.author.kind)).toEqual(['person'])
  })

  it('only the advisor runs prep; a client is told the meeting does not exist; prep closes once the meeting is held', () => {
    expect(runMeetingPrep('user-002', 'evt-010')).toMatchObject({ status: 403, code: 'NOT_PERMITTED' })
    expect(runMeetingPrep('cli-001', 'evt-010')).toMatchObject({ status: 404, code: 'NO_MEETING' })
    ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(runMeetingPrep(ADRIAN, 'evt-010')).toMatchObject({ status: 409, code: 'MEETING_HELD' })
    expect(prepFindings()).toEqual([])
  })
})
