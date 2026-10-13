import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { draftMeetingNotes, draftRecap, fileMeetingRecord, getMeeting, holdMeeting, sendToClient } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const RECAP = 'Ask Client Letter Agent for the recap'

async function filed() {
  await holdMeeting(ADRIAN, 'evt-010')
  await draftMeetingNotes(ADRIAN, 'evt-010')
  const view = await getMeeting(ADRIAN, 'evt-010')
  await fileMeetingRecord(ADRIAN, 'evt-010', view.notesFingerprint!)
}
async function openRobert() {
  renderRoutes(routes, '/t/th-robert')
  await screen.findByRole('heading', { level: 1, name: 'Robert Johnson' })
  return inContext().findByRole('region', { name: 'Drafts for Robert' })
}

describe("Robert's recap", () => {
  afterEach(() => sessionStorage.clear())

  it('waits for the filed record, and says so', async () => {
    const panel = await openRobert()
    const button = await within(panel).findByRole('button', { name: RECAP })
    expect(button).toBeDisabled()
    expect(panel).toHaveTextContent('File the record of the Johnson annual review first.')
  })

  it('is drafted from the filed record, names its origin, and is sent as one message', async () => {
    await filed()
    const panel = await openRobert()
    const user = userEvent.setup()
    expect(panel).toHaveTextContent('From the filed record of the Johnson annual review (REC-0001)')
    expect(within(panel).getByText('REC-0001')).toHaveClass('whitespace-nowrap')
    await user.dblClick(await within(panel).findByRole('button', { name: RECAP }))
    expect(await within(panel).findByRole('status')).toHaveTextContent('The Client Letter Agent drafted the recap of the Johnson annual review.')
    const draft = await within(panel).findByRole('article', { name: 'Draft · not sent' })
    expect(draft).toHaveTextContent('Dear Robert,')
    expect(draft).toHaveTextContent('What you asked us:')
    expect(draft).toHaveTextContent(/from the filed record REC-0001 · fingerprint [0-9A-F]{8}/)
    expect(store().drafts).toHaveLength(1)
    await user.click(within(draft).getByRole('button', { name: 'Send to Robert' }))
    await waitFor(() => expect(conversation().getAllByRole('listitem').some((li) => li.textContent?.includes('What we decided:'))).toBe(true))
    expect(within(panel).queryByRole('article', { name: 'Draft · not sent' })).toBeNull()
  })

  it('Robert sees exactly the recap, and nothing of the firm-only record', async () => {
    await filed()
    const draft = await draftRecap(ADRIAN, 'th-robert', 'evt-010')
    await sendToClient(ADRIAN, draft.id)
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/t/th-robert')
    await screen.findByRole('heading', { level: 1, name: 'Robert Johnson' })
    await waitFor(() => expect(conversation().getAllByRole('listitem')).toHaveLength(3))
    const texts = store().messages.filter((m) => m.threadId === 'th-robert' && m.kind === 'text')
    expect(texts).toHaveLength(2)
    expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('When is my annual review this year?')
    expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('Dear Robert,')
    // The View-as menu lists the firm's people for the demo, so the check reads Robert's thread and its context, not the whole page.
    expect(screen.getByRole('list', { name: 'Messages' })).not.toHaveTextContent(/transcript|Meeting Notes|agenda|REC-0001|Sarah Mitchell|Mike Chen|follow-up|filed record/i)
    expect(screen.getByRole('complementary', { name: 'Thread context' })).not.toHaveTextContent(/transcript|Meeting Notes|agenda|REC-0001|Mike Chen|follow-up|filed record|fingerprint [0-9A-F]{8} · agent draft/i)
    expect(within(screen.getByRole('navigation', { name: 'Threads' })).getAllByRole('link')).toHaveLength(1)
  })

  it('Mark sees the recap in Supervision with its provenance, and the filing in the Archive', async () => {
    await filed()
    const draft = await draftRecap(ADRIAN, 'th-robert', 'evt-010')
    await sendToClient(ADRIAN, draft.id)
    viewAsOnLoad('cco-001')
    const { unmount } = renderRoutes(routes, '/supervision')
    await screen.findByRole('heading', { level: 1, name: 'Supervision' })
    const queue = screen.getByRole('navigation', { name: 'Supervision queue' })
    await userEvent.setup().click(await within(queue).findByRole('link', { name: /^Message to Robert Johnson/ }))
    const item = await screen.findByRole('region', { name: 'Correspondence · Message to Robert Johnson' })
    expect(item).toHaveTextContent('What we decided:')
    expect(item).toHaveTextContent(/from the filed record REC-0001 · fingerprint [0-9A-F]{8} · agent draft, unedited/)
    unmount()
    renderRoutes(routes, '/archive')
    expect(await screen.findByRole('table', { name: 'Archive' })).toHaveTextContent('REC-0001 · Filed the record of the Johnson annual review')
  })

  it('a stale recap says why and cannot be sent', async () => {
    await filed()
    store().drafts.push({
      id: 'draft-9001', clientThreadId: 'th-robert', authorId: ADRIAN, body: 'Dear Robert, an older recap.', createdAt: '2026-02-25T20:30:00.000Z',
      agentId: 'client-letter', recordBasis: { eventId: 'evt-010', actId: 'REC-0001', fingerprint: 'DEADBEEF' },
    })
    const panel = await openRobert()
    const draft = await within(panel).findByRole('article', { name: 'Draft · not sent' })
    expect(draft).toHaveTextContent('STALE')
    expect(draft).toHaveTextContent('This recap was drafted from REC-0001, which no longer matches the filed record. Ask for a new recap.')
    expect(within(draft).getByRole('button', { name: 'Send to Robert' })).toBeDisabled()
  })
  it('a recap whose Intel window moved says so, not that the filed record changed', async () => {
    await filed()
    const filing = store().meetings.find((m) => m.eventId === 'evt-010')!.filed!
    store().drafts.push({
      id: 'draft-9002', clientThreadId: 'th-robert', authorId: ADRIAN, body: 'Dear Robert, a recap with an older window.', createdAt: '2026-02-25T20:30:00.000Z',
      agentId: 'client-letter', recordBasis: { eventId: 'evt-010', actId: filing.actId, fingerprint: filing.fingerprint, windowEnd: '2026-03-20' },
    })
    const panel = await openRobert()
    const draft = await within(panel).findByRole('article', { name: 'Draft · not sent' })
    expect(draft).toHaveTextContent('STALE')
    expect(draft).toHaveTextContent('This recap states the Intel wash-sale window through March 20, 2026, but it now runs through March 22, 2026. Ask for a new recap.')
    expect(draft).not.toHaveTextContent('no longer matches the filed record')
    expect(within(draft).getByRole('button', { name: 'Send to Robert' })).toBeDisabled()
  })
})
