import { describe, it, expect, afterEach } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { draftMeetingNotes, holdMeeting, runMeetingPrep } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const PATH = '/meetings/evt-010?from=th-johnson-meeting'
const liveThread = () => screen.getByRole('complementary', { name: 'Live thread' })
const transcriptLine = (id: string) => document.getElementById(`transcript-${id}`)

async function openMeeting(path = PATH) {
  const view = renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: 'Johnson annual review' })
  return view
}
async function heldWithNotes() {
  await runMeetingPrep(ADRIAN, 'evt-010')
  await holdMeeting(ADRIAN, 'evt-010')
  await draftMeetingNotes(ADRIAN, 'evt-010')
}

describe('the meeting full view', () => {
  afterEach(() => sessionStorage.clear())

  it('takes the main pane beside the live meeting thread; before the meeting: when, who, the agenda and the household', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    await openMeeting()
    expect(screen.queryByRole('navigation', { name: 'Threads' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-meeting')
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent('2026-02-25 · 14:00–15:15 ET · Office — Main')
    expect(main).toHaveTextContent('With Robert Johnson, Patricia Johnson and Adrian Hale')
    expect(main).toHaveTextContent('SCHEDULED')
    expect(main).toHaveTextContent("Firm only · client can't see")
    expect(within(main).getByRole('list', { name: 'Agenda · v1' })).toBeInTheDocument()
    const links = within(within(main).getByRole('navigation', { name: 'Full views' }))
    expect(links.getByRole('link', { name: 'Household' })).toHaveAttribute('href', '/households/hh-001?from=th-johnson-meeting')
    expect(await links.findByRole('link', { name: 'Robert Johnson' })).toHaveAttribute('href', '/clients/cli-001?from=th-johnson-meeting')
    expect(await links.findByRole('link', { name: 'Patricia Johnson' })).toHaveAttribute('href', '/clients/cli-002?from=th-johnson-meeting')
    expect(links.queryByRole('link', { name: 'Adrian Hale' })).toBeNull()
    expect(await within(main).findByRole('table', { name: 'Household accounts' })).toBeInTheDocument()
    expect(within(main).queryByRole('list', { name: 'Transcript' })).toBeNull()
    expect(await within(liveThread()).findByRole('list', { name: 'Thread feed' })).toHaveTextContent('Agenda v1 · Proposed an agenda ordered by what needs attention first.')
  })

  it('holding from here moves the meeting on; the transcript arrives beside the notes', async () => {
    await openMeeting()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Hold the meeting' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Hold the meeting?' })).getByRole('button', { name: 'Hold the meeting' }))
    const transcript = await screen.findByRole('list', { name: 'Transcript' })
    expect(within(transcript).getAllByRole('listitem')).toHaveLength(28)
    expect(transcript).toHaveTextContent('Patricia Johnson')
    expect(screen.getByText('No notes yet. Ask Meeting Notes for a draft.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Draft notes' }))
    expect(await screen.findByRole('list', { name: 'Decisions' })).toBeInTheDocument()
    await waitFor(() => expect(within(liveThread()).getByRole('list', { name: 'Thread feed' })).toHaveTextContent('Drafted the notes from the transcript.'))
  })

  it('hovering or focusing a citation highlights the transcript line it cites', async () => {
    await heldWithNotes()
    await openMeeting()
    const user = userEvent.setup()
    const decisions = await screen.findByRole('list', { name: 'Decisions' })
    const cite = within(decisions).getByRole('button', { name: 'Cites t-07 · Patricia Johnson' })
    expect(transcriptLine('t-07')).not.toHaveAttribute('data-highlighted')
    await user.hover(cite)
    expect(transcriptLine('t-07')).toHaveAttribute('data-highlighted', 'true')
    await user.unhover(cite)
    expect(transcriptLine('t-07')).not.toHaveAttribute('data-highlighted')
    act(() => cite.focus())
    await waitFor(() => expect(transcriptLine('t-07')).toHaveAttribute('data-highlighted', 'true'))
    // The pointer leaving a focused citation keeps its line lit: focus still points at it.
    await user.hover(cite)
    await user.unhover(cite)
    expect(transcriptLine('t-07')).toHaveAttribute('data-highlighted', 'true')
  })

  it('a citation is described by the transcript line it cites', async () => {
    await heldWithNotes()
    await openMeeting()
    const decisions = await screen.findByRole('list', { name: 'Decisions' })
    const cite = within(decisions).getByRole('button', { name: 'Cites t-07 · Patricia Johnson' })
    expect(cite).toHaveAttribute('aria-describedby', 'transcript-t-07')
    expect(cite).toHaveAccessibleDescription(transcriptLine('t-07')!.textContent!)
  })

  it('unsaved edits block filing; saved, the record files from here, once, with its tasks', async () => {
    await heldWithNotes()
    await openMeeting()
    const user = userEvent.setup()
    const discussion = await screen.findByRole('list', { name: 'Discussion' })
    await user.click(within(discussion).getByRole('button', { name: 'Edit n-01' }))
    const field = screen.getByRole('textbox', { name: 'Edit n-01' })
    await user.clear(field)
    await user.type(field, 'Reviewed the rebalance and the Intel harvest.')
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'File the record' }))
    const blocked = screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })
    expect(blocked).toHaveTextContent('Save your edits before filing.')
    expect(within(blocked).getByRole('button', { name: 'Confirm' })).toBeDisabled()
    await user.click(within(blocked).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Save notes' }))
    await waitFor(() => expect(store().meetings[0]!.notesDraft![0]!.text).toBe('Reviewed the rebalance and the Intel harvest.'))
    await waitFor(() => expect(screen.queryByText('Unsaved edits')).toBeNull())
    await user.click(screen.getByRole('button', { name: 'File the record' }))
    await user.dblClick(within(screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })).getByRole('button', { name: 'Confirm' }))
    const filed = await screen.findByText((_, el) => el?.tagName === 'P' && /^Filed · REC-0001 · fingerprint [0-9A-F]{8}$/.test(el.textContent ?? ''))
    await waitFor(() => expect(document.activeElement).toBe(filed))
    expect(screen.getByRole('table', { name: 'Follow-up tasks' })).toHaveTextContent('Sarah Mitchell')
    expect(screen.queryByRole('button', { name: 'Edit n-01' })).toBeNull()
    expect(store().acts.filter((a) => a.kind === 'file_meeting_record')).toHaveLength(1)
  })

  it('shows, beneath a line the client reads, the wording filed for that client; an edit to the line says it drops on save', async () => {
    await heldWithNotes()
    await openMeeting()
    const user = userEvent.setup()
    const decisions = await screen.findByRole('list', { name: 'Decisions' })
    const n09 = store().meetings[0]!.notesDraft!.find((l) => l.id === 'n-09')!
    const wording = within(decisions).getByText(`To Robert: ${n09.toClient!.text}`)
    expect(wording.closest('li')).toHaveTextContent(n09.text)
    expect(within(decisions).getAllByText(/^To Robert: /)).toHaveLength(2)
    expect(within(await screen.findByRole('list', { name: 'Client requests' })).getAllByText(/^To Robert: /)).toHaveLength(2)
    expect(within(screen.getByRole('list', { name: 'Discussion' })).queryByText(/^To Robert: /)).toBeNull()

    await user.click(within(decisions).getByRole('button', { name: 'Edit n-12' }))
    await user.type(screen.getByRole('textbox', { name: 'Edit n-12' }), ' Soon.')
    const n12 = screen.getByRole('textbox', { name: 'Edit n-12' }).closest('li')!
    expect(n12).toHaveTextContent("Robert's wording of this line is dropped when it is saved; the recap will read the line as written.")
    await user.click(screen.getByRole('button', { name: 'Save notes' }))
    await waitFor(() => expect(store().meetings[0]!.notesDraft!.find((l) => l.id === 'n-12')!.toClient).toBeUndefined())
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Decisions' })).getAllByText(/^To Robert: /)).toHaveLength(1))
  })

  it('the filed record shows the client wording it holds', async () => {
    await heldWithNotes()
    await openMeeting()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'File the record' }))
    await user.click(within(screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })).getByRole('button', { name: 'Confirm' }))
    await screen.findByText((_, el) => el?.tagName === 'P' && /^Filed · REC-0001 · fingerprint/.test(el.textContent ?? ''))
    expect(within(screen.getByRole('list', { name: 'Decisions' })).getAllByText(/^To Robert: /)).toHaveLength(2)
  })

  it('follow-ups show their owner and due date', async () => {
    await heldWithNotes()
    await openMeeting()
    const followUps = await screen.findByRole('list', { name: 'Follow-ups' })
    expect(followUps).toHaveTextContent('Mike Chen · due 2026-03-02')
    expect(followUps).toHaveTextContent('Sarah Mitchell · due 2026-02-26')
  })

  it("is read-only for Mark, and not found for Robert; switching to Robert goes home", async () => {
    await heldWithNotes()
    sessionStorage.setItem('ws-viewer', 'cco-001')
    const { unmount } = await openMeeting()
    expect(await screen.findByRole('list', { name: 'Transcript' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit n-/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'File the record' })).toBeNull()
    unmount()
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, PATH)
    expect(await screen.findByRole('heading', { level: 1, name: 'Meeting not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/transcript|Johnson annual review/i)
    expect(screen.queryByRole('complementary', { name: 'Live thread' })).toBeNull()
  })

  it('switching "view as" to Robert on the meeting view goes home', async () => {
    const { router } = await openMeeting()
    const user = userEvent.setup()
    await screen.findByRole('option', { name: 'Robert Johnson · Client' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
