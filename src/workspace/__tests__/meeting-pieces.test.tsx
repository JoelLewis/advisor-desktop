import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { getHousehold, getMeeting, reviseAgenda, runMeetingPrep, holdMeeting, draftMeetingNotes } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'
import { useMeeting } from '@/hooks/use-meetings'
import { MeetingControls } from '@/workspace/meeting/MeetingControls'
import { AgendaEditor } from '@/workspace/meeting/AgendaEditor'
import { agendaFindings } from '@/workspace/meeting/agenda-findings'
import { HouseholdSummaryPanes } from '@/workspace/household/HouseholdSummaryPanes'
import { heldAwayPolicy, ipsLine } from '@/workspace/household/household-words'

const ADRIAN = 'user-001'
const meeting = () => store().meetings[0]!
/** Matches the paragraph whose whole text is this, though a record id inside it sits in its own span. */
const wholeParagraph = (text: string) => (_: string, el: Element | null) => el?.tagName === 'P' && el.textContent === text

/** The controls as the context column mounts them: reading the live meeting, so each write re-renders them. */
function LiveControls({ canPrepare = true }: { canPrepare?: boolean }) {
  const view = useMeeting('evt-010')
  return view.data ? <MeetingControls meeting={view.data} canPrepare={canPrepare} onRecorded={() => undefined} /> : <p role="status">Loading the meeting…</p>
}
function LiveAgenda() {
  const view = useMeeting('evt-010')
  if (!view.data) return <p role="status">Loading the meeting…</p>
  const findings = agendaFindings(store().messages.filter((m) => m.threadId === 'th-johnson-meeting'))
  return <div data-testid="agenda-editor"><AgendaEditor meeting={view.data} findings={findings} editable /></div>
}
/** The editor's own status line, not the app announcer that repeats it. */
const editorStatus = () => within(screen.getByTestId('agenda-editor')).getByRole('status')

describe('meeting controls', () => {
  afterEach(() => sessionStorage.clear())

  it('runs prep, then holds the meeting once however hard Confirm is clicked', async () => {
    renderWithProviders(<LiveControls />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Run prep' }))
    expect(await screen.findByText('Meeting Prep posted its findings and agenda v1.')).toBeInTheDocument()
    expect(meeting().agenda).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Hold the meeting' }))
    const dialog = screen.getByRole('dialog', { name: 'Hold the meeting?' })
    expect(dialog).toHaveTextContent('The session clock moves to the end of the meeting, 15:15 ET, and the transcript arrives. Prep and the agenda close.')
    await user.dblClick(within(dialog).getByRole('button', { name: 'Hold the meeting' }))
    await screen.findByRole('button', { name: 'Draft notes' })
    expect(store().messages.filter((m) => m.kind === 'meeting_held')).toHaveLength(1)
  })

  it('drafts the notes, then files the record once, naming the act', async () => {
    await holdMeeting(ADRIAN, 'evt-010')
    renderWithProviders(<LiveControls />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Draft notes' }))
    expect(await screen.findByText('Meeting Notes drafted the notes; edit them beside the transcript in the meeting view.')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'File the record' }))
    const dialog = screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText(wholeParagraph('Filed · REC-0001'))).toBeInTheDocument()
    expect(store().acts.filter((a) => a.kind === 'file_meeting_record')).toHaveLength(1)
  })

  it('a blocked filing says why and cannot be confirmed', async () => {
    await holdMeeting(ADRIAN, 'evt-010')
    await draftMeetingNotes(ADRIAN, 'evt-010')
    const view = await getMeeting(ADRIAN, 'evt-010')
    renderWithProviders(<MeetingControls meeting={view} canPrepare onRecorded={() => undefined} filingBlockedReason="Save your edits before filing." />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'File the record' }))
    const dialog = screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })
    expect(dialog).toHaveTextContent('Save your edits before filing.')
    expect(within(dialog).getByRole('button', { name: 'Confirm' })).toBeDisabled()
  })

  it('a filed meeting names its act; one with no act id is a broken invariant', async () => {
    const view = await getMeeting(ADRIAN, 'evt-010')
    renderWithProviders(<MeetingControls meeting={{ ...view, state: 'filed', filedActId: 'REC-0001' }} canPrepare onRecorded={() => undefined} />)
    expect(screen.getByText(wholeParagraph('Filed · REC-0001'))).toBeInTheDocument()
    // React reports the thrown render to the console and to jsdom's window: keep the output quiet, the throw is the assertion.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const swallow = (e: ErrorEvent) => e.preventDefault()
    window.addEventListener('error', swallow)
    expect(() => renderWithProviders(<MeetingControls meeting={{ ...view, state: 'filed', filedActId: undefined }} canPrepare onRecorded={() => undefined} />))
      .toThrow('Meeting evt-010 is filed but names no filing act')
    window.removeEventListener('error', swallow)
    quiet.mockRestore()
  })

  it('a firm viewer who does not run the meeting sees why, and no control', async () => {
    const view = await getMeeting('user-002', 'evt-010')
    renderWithProviders(<MeetingControls meeting={view} canPrepare={false} onRecorded={() => undefined} />)
    expect(screen.getByText('Only the advisor runs the meeting: prep, the agenda, holding it and its notes.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('the agenda editor', () => {
  it('moves, drops and adds items, each a new version; findings not on the agenda can be added', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    const v1 = meeting().agenda[0]!.items
    await reviseAgenda(ADRIAN, 'evt-010', v1.slice(1))
    renderWithProviders(<LiveAgenda />)
    const user = userEvent.setup()
    const list = await screen.findByRole('list', { name: 'Agenda · v2' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(v1.length - 1)
    await user.click(within(list).getByRole('button', { name: `Move “${v1[2]!.title}” up` }))
    await screen.findByRole('list', { name: 'Agenda · v3' })
    expect(meeting().agenda[2]!.items.map((i) => i.id).slice(0, 2)).toEqual([v1[2]!.id, v1[1]!.id])
    await user.type(screen.getByRole('textbox', { name: 'New agenda item' }), 'ESG alternatives for the trust')
    await user.click(screen.getByRole('button', { name: 'Add to agenda' }))
    await screen.findByRole('list', { name: 'Agenda · v4' })
    const dropped = meeting().agenda[0]!.items[0]!
    const finding = store().messages.find((m) => m.kind === 'agent_finding' && m.id === (dropped.source.kind === 'finding' ? dropped.source.messageId : ''))
    if (finding?.kind !== 'agent_finding') throw new Error('agenda v1 carries its findings')
    await user.click(screen.getByRole('button', { name: `Add to agenda: ${dropped.title}` }))
    const v5 = await screen.findByRole('list', { name: 'Agenda · v5' })
    expect(v5).toHaveTextContent(dropped.title)
    await user.click(within(v5).getByRole('button', { name: 'Drop “ESG alternatives for the trust”' }))
    await screen.findByRole('list', { name: 'Agenda · v6' })
    expect(meeting().agenda.map((v) => v.n)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('keeps focus on the moved item, says what changed, and says why an edge control is off', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    const v1 = meeting().agenda[0]!.items
    renderWithProviders(<LiveAgenda />)
    const user = userEvent.setup()
    const list = await screen.findByRole('list', { name: 'Agenda · v1' })
    const first = within(list).getByRole('button', { name: `Move “${v1[0]!.title}” up` })
    expect(first).toBeDisabled()
    expect(first).toHaveAttribute('title', 'Already first on the agenda')
    expect(within(list).getByRole('button', { name: `Move “${v1[v1.length - 1]!.title}” down` })).toHaveAttribute('title', 'Already last on the agenda')

    await user.click(within(list).getByRole('button', { name: `Move “${v1[2]!.title}” up` }))
    const v2 = await screen.findByRole('list', { name: 'Agenda · v2' })
    expect(within(v2).getByRole('button', { name: `Move “${v1[2]!.title}” up` })).toHaveFocus()
    const summary = (n: number) => store().messages.flatMap((m) => (m.kind === 'agenda_version' && m.version === n ? [m.changeSummary] : []))[0]
    expect(editorStatus()).toHaveTextContent(`Agenda v2: ${summary(2)}`)

    await user.keyboard('{Enter}')
    const v3 = await screen.findByRole('list', { name: 'Agenda · v3' })
    // At the top, Move up is off: focus goes to the same item's Move down.
    expect(within(v3).getByRole('button', { name: `Move “${v1[2]!.title}” down` })).toHaveFocus()
    expect(editorStatus()).toHaveTextContent(`Agenda v3: ${summary(3)}`)

    await user.click(within(v3).getByRole('button', { name: `Drop “${v1[2]!.title}”` }))
    const v4 = await screen.findByRole('list', { name: 'Agenda · v4' })
    expect(within(v4).getByRole('button', { name: `Drop “${v1[0]!.title}”` })).toHaveFocus()
  })

  it('holds its status region from the start, empty until the first change', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    const v1 = meeting().agenda[0]!.items
    renderWithProviders(<LiveAgenda />)
    const list = await screen.findByRole('list', { name: 'Agenda · v1' })
    const status = editorStatus()
    expect(status).toBeEmptyDOMElement()
    await userEvent.setup().click(within(list).getByRole('button', { name: `Move “${v1[1]!.title}” up` }))
    await screen.findByRole('list', { name: 'Agenda · v2' })
    // The same element, now filled: a live region announces a change, not its own arrival.
    expect(editorStatus()).toBe(status)
    expect(status).toHaveTextContent(/^Agenda v2: /)
  })

  it('after adding a free-text item, focus goes to the new item', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    renderWithProviders(<LiveAgenda />)
    const user = userEvent.setup()
    await screen.findByRole('list', { name: 'Agenda · v1' })
    await user.type(screen.getByRole('textbox', { name: 'New agenda item' }), 'Questions from Patricia')
    await user.click(screen.getByRole('button', { name: 'Add to agenda' }))
    const v2 = await screen.findByRole('list', { name: 'Agenda · v2' })
    await waitFor(() => expect(within(v2).getByRole('button', { name: 'Move “Questions from Patricia” up' })).toHaveFocus())
    expect(screen.getByRole('textbox', { name: 'New agenda item' })).toHaveValue('')
  })

  it('a read-only agenda has no controls', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    const view = await getMeeting(ADRIAN, 'evt-010')
    renderWithProviders(<AgendaEditor meeting={view} findings={[]} editable={false} />)
    expect(screen.getByRole('list', { name: 'Agenda · v1' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

describe('the household summary', () => {
  it('shows the accounts against their models, held-away accounts, goals, windows, the IPS and open items', async () => {
    renderWithProviders(<HouseholdSummaryPanes summary={await getHousehold(ADRIAN, 'hh-001')} />)
    const accounts = screen.getByRole('table', { name: 'Household accounts' })
    expect(within(accounts).getAllByRole('row').map((r) => r.textContent).join('|')).toContain('Johnson Family Trust')
    expect(accounts).toHaveTextContent('Robert Johnson Individual')
    // A drift and its unit never break apart.
    expect(accounts.textContent).toMatch(/\d\u00a0pp/)
    expect(accounts.textContent).not.toMatch(/\d pp/)
    expect(screen.getByRole('table', { name: 'Held-away accounts' })).toHaveTextContent('2,400,000')
    expect(screen.getByText("The firm does not manage these and cannot see their holdings. A purchase in an IRA or Roth still counts for the taxpayer's wash-sale windows; the firm treats purchases in the held-away 401(k) and 403(b) as if they count, though the rule for employer plans is unsettled.")).toBeInTheDocument()
    const goals = screen.getByRole('table', { name: 'Plan goals' })
    expect(within(goals).getByRole('row', { name: /Legacy \/ Estate/ })).toHaveTextContent(/78\.0.*85\.0.*AT RISK/)
    const windows = screen.getByRole('table', { name: 'Open wash-sale windows' })
    expect(within(windows).getByRole('row', { name: /INTC/ })).toHaveTextContent(/2026-02-20.*−32,750.*2026-03-22/)
    expect(screen.getByRole('region', { name: 'IPS and open items' })).toHaveTextContent('Johnson Family Trust — IPS · signed 2025-11-15')
    expect(screen.getByRole('region', { name: 'IPS and open items' })).not.toHaveTextContent('Awaiting signature')
  })

  it('states the IPS by its signature status in words', () => {
    const ips = { documentId: 'doc-x', name: 'Trust — IPS', signedOn: undefined }
    expect(ipsLine({ ...ips, signatureStatus: 'pending' })).toBe('Trust — IPS · awaiting signature')
    expect(ipsLine({ ...ips, signatureStatus: 'not_required' })).toBe('Trust — IPS · no signature required')
    expect(ipsLine(undefined)).toBe('No investment policy statement on file.')
  })

  it('names the held-away employer plans the household has, or says employer plans', () => {
    const tail = 'as if they count, though the rule for employer plans is unsettled.'
    expect(heldAwayPolicy([{ accountType: '401(k)' }])).toContain(`the firm treats purchases in the held-away 401(k) ${tail}`)
    expect(heldAwayPolicy([{ accountType: '403(b)' }, { accountType: '401(k) Roth' }, { accountType: '403(b)' }])).toContain('the held-away 403(b) and 401(k) as if')
    expect(heldAwayPolicy([{ accountType: 'Brokerage' }])).toContain(`the firm treats purchases in held-away employer plans ${tail}`)
  })
})
