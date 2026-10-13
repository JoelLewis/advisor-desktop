import { describe, it, expect } from 'vitest'
import { advanceClockTo, nextAt, store } from '@/mocks/data/workspace-store'
import { eventTime } from '@/lib/clock'
import { agendaChangeSummary, holdMeeting, meetingEvent, meetingSummaries, meetingView, notesFingerprint, reviseAgenda, visibleMeeting } from '../meetings'
import { ok } from './story-fixture'

const ADRIAN = 'user-001'
const ESG = { title: 'ESG alternatives for the trust', source: { kind: 'advisor' as const } }
const IPS = { title: 'The investment policy statement', source: { kind: 'advisor' as const } }
const heldMessages = () => store().messages.filter((m) => m.kind === 'meeting_held')
const agendaMessages = () => store().messages.filter((m) => m.kind === 'agenda_version')

describe('the meeting read model', () => {
  it('names the calendar event in UTC with its attendees, Patricia from the CRM', () => {
    expect(meetingEvent('evt-010')).toEqual({
      id: 'evt-010', title: 'Annual Review — Johnson Household', start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z',
      location: 'Office — Main', householdId: 'hh-001', clientId: 'cli-001',
      attendees: [{ id: 'cli-001', name: 'Robert Johnson' }, { id: 'cli-002', name: 'Patricia Johnson' }, { id: 'user-001', name: 'Adrian Hale' }],
    })
    expect(meetingEvent('evt-004')).toBeUndefined()
  })

  it('every firm viewer reads the meeting; a client and a stranger are told it does not exist', () => {
    for (const viewer of ['user-001', 'user-002', 'user-003', 'cco-001']) expect(visibleMeeting(viewer, 'evt-010'), viewer).toBeDefined()
    expect(visibleMeeting('cli-001', 'evt-010')).toBeUndefined()
    expect(visibleMeeting('nobody', 'evt-010')).toBeUndefined()
    expect(visibleMeeting(ADRIAN, 'evt-999')).toBeUndefined()
    expect(meetingSummaries('cli-001')).toBeUndefined()
    expect(meetingSummaries('cco-001')).toEqual([{
      eventId: 'evt-010', title: 'Johnson annual review', threadId: 'th-johnson-meeting', householdId: 'hh-001', clientId: 'cli-001',
      start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z', state: 'scheduled',
    }])
  })

  it('serves no transcript while the meeting is scheduled', () => {
    const view = meetingView(ADRIAN, 'evt-010')
    expect(view?.state).toBe('scheduled')
    expect(view?.transcript).toBeUndefined()
    expect(view?.notesDraft).toBeUndefined()
  })
})

describe('holding the meeting', () => {
  it("moves the session clock to the meeting's end and posts the held line; the transcript arrives", () => {
    const { meeting } = ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(meeting).toMatchObject({ state: 'held', heldAt: { start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z' } })
    expect(store().sequence).toBe(495)
    expect(heldMessages()).toEqual([{
      kind: 'meeting_held', id: expect.any(String), threadId: 'th-johnson-meeting', at: '2026-02-25T20:15:00.000Z', eventId: 'evt-010',
      start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z',
    }])
    expect(meetingView(ADRIAN, 'evt-010')?.transcript).toHaveLength(28)
    expect(nextAt()).toBe(eventTime(496))
  })

  it('holds once: a second hold is refused and the clock does not move again', () => {
    ok(holdMeeting(ADRIAN, 'evt-010'))
    const sequence = store().sequence
    expect(holdMeeting(ADRIAN, 'evt-010')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_HELD' })
    expect(store().sequence).toBe(sequence)
    expect(heldMessages()).toHaveLength(1)
  })

  it('never runs the clock backwards: held after the end, the line is at the later time', () => {
    advanceClockTo(600)
    const { meeting } = ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(heldMessages()[0]?.at).toBe(eventTime(601))
    expect(meeting.heldAt).toEqual({ start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z' })
  })

  it('only the advisor holds it; a client is told it does not exist', () => {
    for (const viewer of ['user-002', 'user-003', 'cco-001']) expect(holdMeeting(viewer, 'evt-010'), viewer).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(holdMeeting('cli-001', 'evt-010')).toMatchObject({ ok: false, status: 404, code: 'NO_MEETING' })
    expect(store().meetings[0]?.state).toBe('scheduled')
    expect(store().sequence).toBe(8)
  })
})

describe('agenda versions', () => {
  it("each change is a new version, posted as a line in the meeting thread, the earlier ones kept", () => {
    ok(reviseAgenda(ADRIAN, 'evt-010', [ESG]))
    const v1 = store().meetings[0]!.agenda[0]!
    expect(v1).toMatchObject({ n: 1, author: { kind: 'person', personId: ADRIAN }, items: [{ id: 'ag-0001', ...ESG }] })
    ok(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0001', ...ESG }, IPS]))
    ok(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0002', ...IPS }, { id: 'ag-0001', ...ESG }]))
    ok(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0002', ...IPS }]))
    const agenda = store().meetings[0]!.agenda
    expect(agenda.map((v) => v.n)).toEqual([1, 2, 3, 4])
    expect(agenda[0]).toEqual(v1)
    expect(agendaMessages().map((m) => m.kind === 'agenda_version' && [m.version, m.changeSummary])).toEqual([
      [1, 'Added “ESG alternatives for the trust”.'],
      [2, 'Added “The investment policy statement”.'],
      [3, 'Reordered the agenda.'],
      [4, 'Dropped “ESG alternatives for the trust”.'],
    ])
  })

  it('refuses an unchanged, empty, untitled or unknown agenda, and a finding that is not in the meeting thread', () => {
    ok(reviseAgenda(ADRIAN, 'evt-010', [ESG]))
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0001', ...ESG }])).toMatchObject({ status: 400, code: 'NO_CHANGE' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [])).toMatchObject({ status: 400, code: 'EMPTY_AGENDA' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ title: '   ', source: { kind: 'advisor' } }])).toMatchObject({ status: 400, code: 'TITLE_REQUIRED' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ title: 'x'.repeat(301), source: { kind: 'advisor' } }])).toMatchObject({ status: 400, code: 'TITLE_TOO_LONG' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0099', ...ESG }])).toMatchObject({ status: 400, code: 'UNKNOWN_ITEM' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0001', ...ESG }, { id: 'ag-0001', ...ESG }])).toMatchObject({ status: 400, code: 'DUPLICATE_ITEM' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ title: 'A finding', source: { kind: 'finding', messageId: 'msg-b01' } }])).toMatchObject({ status: 400, code: 'UNKNOWN_FINDING' })
    expect(store().meetings[0]!.agenda).toHaveLength(1)
    // A refused write allocates no item ids.
    ok(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0001', ...ESG }, IPS]))
    expect(store().meetings[0]!.agenda[1]!.items[1]!.id).toBe('ag-0002')
  })

  it('closes when the meeting is held; only the advisor edits it', () => {
    expect(reviseAgenda('user-002', 'evt-010', [ESG])).toMatchObject({ status: 403, code: 'NOT_PERMITTED' })
    ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(reviseAgenda(ADRIAN, 'evt-010', [ESG])).toMatchObject({ status: 409, code: 'MEETING_HELD' })
  })

  it('a renamed item reads as renamed', () => {
    expect(agendaChangeSummary([{ id: 'ag-0001', ...ESG }], [{ id: 'ag-0001', title: 'ESG for the trust', source: { kind: 'advisor' } }]))
      .toBe('Renamed “ESG alternatives for the trust” to “ESG for the trust”.')
  })
})

describe('the notes fingerprint', () => {
  it('covers every part of every line, in order', () => {
    const line = { id: 'n-01', section: 'decisions' as const, text: 'Keep the legacy goal.', cites: ['t-07'] }
    const base = notesFingerprint([line])
    expect(notesFingerprint([line])).toBe(base)
    expect(notesFingerprint([{ ...line, text: 'Keep the legacy goal!' }])).not.toBe(base)
    expect(notesFingerprint([{ ...line, cites: ['t-08'] }])).not.toBe(base)
    expect(notesFingerprint([{ ...line, section: 'discussion' }])).not.toBe(base)
    expect(notesFingerprint([{ ...line, due: '2026-03-02' }])).not.toBe(base)
  })
})
