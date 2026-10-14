import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { getDirectory } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'
import { CompactMessage } from '@/workspace/workbench/CompactMessage'
import type { Message } from '@/types/workspace'

const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const MEETING: Message[] = [
  { kind: 'agenda_version', id: 'msg-t1', threadId: 'th-johnson-meeting', at: '2026-02-25T12:10:00.000Z', eventId: 'evt-010', version: 1,
    author: { kind: 'agent', agentId: 'meeting-prep' }, changeSummary: 'Proposed an agenda ordered by what needs attention first.' },
  { kind: 'meeting_held', id: 'msg-t2', threadId: 'th-johnson-meeting', at: '2026-02-25T20:15:00.000Z', eventId: 'evt-010',
    start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z' },
  { kind: 'notes_drafted', id: 'msg-t3', threadId: 'th-johnson-meeting', at: '2026-02-25T20:16:00.000Z', eventId: 'evt-010', agentId: 'meeting-notes' },
  { kind: 'meeting_tasks', id: 'msg-t4', threadId: 'th-johnson-meeting', at: '2026-02-25T20:18:00.000Z', eventId: 'evt-010', filedActId: 'REC-0001',
    tasks: [{ id: 'task-0001', title: 'Send the beneficiary checklist.', owner: { kind: 'person', personId: 'user-002' }, due: '2026-02-26', state: 'open', fromNoteLine: 'n-22' }] },
  { kind: 'agenda_version', id: 'msg-t5', threadId: 'th-johnson-meeting', at: '2026-02-25T12:11:00.000Z', eventId: 'evt-010', version: 2,
    author: { kind: 'person', personId: 'user-001' }, changeSummary: 'Moved an item up.' },
]

describe('meeting messages', () => {
  it("the Brief's Today says when the meeting is, and opens the meeting thread", async () => {
    renderRoutes(routes, '/t/th-brief')
    const link = within(await screen.findByRole('region', { name: 'Today' })).getByRole('link', { name: 'Open the meeting thread' })
    expect(link.closest('li')).toHaveTextContent('14:00–15:15 ETJohnson annual review · scheduled')
    expect(link).toHaveAttribute('href', '/t/th-johnson-meeting')
  })

  it('the meeting thread shows agenda versions, the held line, the notes line and the tasks', async () => {
    store().messages.push(...MEETING)
    renderRoutes(routes, '/t/th-johnson-meeting')
    await screen.findByRole('heading', { level: 1, name: 'Johnson annual review' })
    const agenda = await conversation().findByRole('article', { name: 'Agenda v1 · Meeting Prep' })
    expect(agenda).toHaveTextContent('Proposed an agenda ordered by what needs attention first.')
    expect(agenda).toHaveTextContent('Agent')
    // A person's version is tagged by their role.
    const byAdrian = conversation().getByRole('article', { name: 'Agenda v2 · Adrian Hale' })
    expect(byAdrian).toHaveTextContent(/^Agenda v2Adrian HaleAdvisor/)
    expect(within(agenda).getByRole('link', { name: /Open the meeting view/ })).toHaveAttribute('href', '/meetings/evt-010?from=th-johnson-meeting')
    expect(conversation().getByRole('article', { name: 'Meeting held' })).toHaveTextContent('Meeting held · 14:00–15:15 ET · transcript received')
    expect(conversation().getByRole('article', { name: 'Notes drafted · Meeting Notes' })).toHaveTextContent('Drafted the notes from the transcript; every line cites the lines it records.')
    const tasks = conversation().getByRole('article', { name: 'Tasks from the filed record' })
    const table = within(tasks).getByRole('table', { name: 'Tasks from the filed record' })
    expect(table).toHaveTextContent('Send the beneficiary checklist.')
    expect(table).toHaveTextContent('Sarah Mitchell')
    expect(table).toHaveTextContent('2026-02-26')
    expect(tasks).toHaveTextContent('From REC-0001. Tracked here; nobody works them in this demo.')
  })

  it('the live thread has one line for each new kind', async () => {
    const directory = await getDirectory('user-001')
    const lines = MEETING.map((m) => {
      const { container, unmount } = render(<CompactMessage message={m} directory={directory} />)
      const text = container.textContent ?? ''
      unmount()
      return text
    })
    expect(lines[0]).toContain('Agenda v1 · Proposed an agenda ordered by what needs attention first.')
    expect(lines[1]).toContain('Meeting held · 14:00–15:15 ET · transcript received')
    expect(lines[2]).toContain('Drafted the notes from the transcript.')
    expect(lines[3]).toContain('1 follow-up task from REC-0001.')
  })
})
