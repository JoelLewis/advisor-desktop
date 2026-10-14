import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { draftMeetingNotes, holdMeeting, runMeetingPrep } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const meetingSection = () => inContext().findByRole('region', { name: 'Meeting' })
const INTC_CLAIM = 'The remaining Intel Corp. shares can be sold at a loss today, and nothing bought in the last thirty days would wash the loss.'

async function openMeetingThread() {
  renderRoutes(routes, '/t/th-johnson-meeting')
  await screen.findByRole('heading', { level: 1, name: 'Johnson annual review' })
  return meetingSection()
}

describe('the meeting thread', () => {
  afterEach(() => sessionStorage.clear())

  it("the Brief's Today opens the meeting thread; a Brief finding can be carried into it", async () => {
    const { router } = renderRoutes(routes, '/t/th-brief')
    const user = userEvent.setup()
    const intc = await screen.findByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    await user.click(await within(intc).findByRole('button', { name: 'Take to' }))
    await user.click(within(within(intc).getByRole('menu', { name: 'Take to' })).getByRole('menuitem', { name: 'Johnson annual review' }))
    expect(await within(intc).findByText('Taken to Johnson annual review.')).toBeInTheDocument()
    await user.click(within(await screen.findByRole('region', { name: 'Today' })).getByRole('link', { name: 'Open the meeting thread' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/t/th-johnson-meeting'))
    expect(await conversation().findByRole('article', { name: `Carried from the Brief: ${INTC_CLAIM}` })).toBeInTheDocument()
  })

  it('states the meeting and runs prep: findings in the thread, agenda v1 in the panel', async () => {
    const panel = await openMeetingThread()
    expect(panel).toHaveTextContent('Annual Review — Johnson Household')
    expect(panel).toHaveTextContent('2026-02-25 · 14:00–15:15 ET · Office — Main')
    expect(panel).toHaveTextContent('SCHEDULED')
    expect(within(panel).getByRole('link', { name: /Open the meeting view/ })).toHaveAttribute('href', '/meetings/evt-010?from=th-johnson-meeting')
    expect(within(panel).getByText('No agenda yet. Run prep, or add the first item.')).toBeInTheDocument()
    await userEvent.setup().click(within(panel).getByRole('button', { name: 'Run prep' }))
    expect(await within(panel).findByRole('list', { name: 'Agenda · v1' })).toBeInTheDocument()
    expect(await conversation().findByRole('article', { name: 'Agenda v1 · Meeting Prep' })).toBeInTheDocument()
    expect(conversation().getAllByRole('article', { name: /^Meeting Prep: / }).length).toBe(7)
    // A meeting's attention items are for discussion: no breach code.
    expect(screen.getByRole('list', { name: 'Messages' }).querySelector('[data-status="OUT"]')).toBeNull()
  })

  it('holds, drafts, files once; the slip takes focus, then the task list follows', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    const panel = await openMeetingThread()
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('button', { name: 'Hold the meeting' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Hold the meeting?' })).getByRole('button', { name: 'Hold the meeting' }))
    expect(await conversation().findByRole('article', { name: 'Meeting held' })).toHaveTextContent('Meeting held · 14:00–15:15 ET · transcript received')
    await waitFor(() => expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent('Meeting held.'))
    await user.click(await within(await meetingSection()).findByRole('button', { name: 'Draft notes' }))
    expect(await conversation().findByRole('article', { name: 'Notes drafted · Meeting Notes' })).toBeInTheDocument()
    await user.click(await within(await meetingSection()).findByRole('button', { name: 'File the record' }))
    await user.dblClick(within(screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })).getByRole('button', { name: 'Confirm' }))
    const slip = await conversation().findByRole('article', { name: 'Filed the record of the Johnson annual review' })
    expect(slip).toHaveTextContent('REC-0001')
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0001')))
    expect(conversation().getByRole('article', { name: 'Tasks from the filed record' })).toBeInTheDocument()
    const tasks = within(await meetingSection()).getByRole('table', { name: 'Follow-up tasks' })
    expect(within(tasks).getAllByRole('row').filter((r) => r.querySelector('td'))).toHaveLength(7)
    expect(tasks).toHaveTextContent('Mike Chen')
    expect(store().acts.filter((a) => a.kind === 'file_meeting_record')).toHaveLength(1)
  })

  it('links the meeting, the household and its clients as full views', async () => {
    await openMeetingThread()
    const views = await inContext().findByRole('region', { name: 'Full views' })
    expect(await within(views).findByRole('link', { name: /^Meeting · Johnson annual review/ })).toHaveAttribute('href', '/meetings/evt-010?from=th-johnson-meeting')
    expect(within(views).getByRole('link', { name: /^Johnson Household/ })).toHaveAttribute('href', '/households/hh-001?from=th-johnson-meeting')
    expect(within(views).getByRole('link', { name: /^Robert Johnson/ })).toHaveAttribute('href', '/clients/cli-001?from=th-johnson-meeting')
    expect(within(views).getByRole('link', { name: /^Patricia Johnson/ })).toHaveAttribute('href', '/clients/cli-002?from=th-johnson-meeting')
  })

  it("Robert's thread links his client view and the household for the firm", async () => {
    renderRoutes(routes, '/t/th-robert')
    const views = await inContext().findByRole('region', { name: 'Full views' })
    expect(await within(views).findByRole('link', { name: /^Robert Johnson/ })).toHaveAttribute('href', '/clients/cli-001?from=th-robert')
    expect(within(views).getByRole('link', { name: /^Johnson Household/ })).toHaveAttribute('href', '/households/hh-001?from=th-robert')
  })

  it('Sarah reads the meeting and its agenda, and runs nothing', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    sessionStorage.setItem('ws-viewer', 'user-002')
    const panel = await openMeetingThread()
    expect(await within(panel).findByRole('list', { name: 'Agenda · v1' })).toBeInTheDocument()
    expect(panel).toHaveTextContent('Only the advisor runs the meeting: prep, the agenda, holding it and its notes.')
    expect(within(panel).queryByRole('button')).toBeNull()
  })

  it('Robert is told the meeting thread does not exist', async () => {
    await holdMeeting(ADRIAN, 'evt-010')
    await draftMeetingNotes(ADRIAN, 'evt-010')
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, '/t/th-johnson-meeting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Thread not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/transcript|Meeting Notes|agenda/i)
  })
})
