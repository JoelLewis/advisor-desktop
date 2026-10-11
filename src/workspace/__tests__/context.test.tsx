import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { server } from '@/test/server'
import { createDraft } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

async function openThread(path: string, title: string) {
  const view = renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: title })
  await screen.findByRole('heading', { level: 2, name: 'Who can see' })
  return view
}

const contextColumn = () => screen.getByRole('complementary', { name: 'Thread context' })
const inContext = () => within(contextColumn())
const conversation = () => screen.getByRole('list', { name: 'Messages' })
const section = (name: string) => inContext().getByRole('region', { name })

async function viewAs(option: string) {
  const user = userEvent.setup()
  const select = await screen.findByRole('combobox', { name: 'View as' })
  await screen.findByRole('option', { name: option })
  await user.selectOptions(select, option)
}

describe('thread context column', () => {
  afterEach(() => sessionStorage.clear())

  it('drafts, sends to the client as a recorded act, and shows each viewer only their part', async () => {
    await openThread('/t/th-robert', 'Robert Johnson')
    const user = userEvent.setup()
    expect(inContext().getByText('None in this thread')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Draft' }), 'Sarah will be in touch this week.')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    const draft = await inContext().findByRole('article', { name: 'Draft · not sent' })
    expect(draft).toHaveTextContent('Sarah will be in touch this week.')
    expect(draft).toHaveTextContent('Sending is recorded as a binding act by you.')

    await user.click(within(draft).getByRole('button', { name: 'Send to Robert' }))
    const slip = await within(section('Binding acts')).findByRole('article', { name: 'Message sent to the client' })
    expect(slip).toHaveTextContent('REC-0001')
    expect(slip).toHaveTextContent('Adrian Hale, Advisor')
    const anchor = document.getElementById('act-REC-0001')
    expect(anchor).toContainElement(slip)
    await waitFor(() => expect(document.activeElement).toBe(anchor))
    expect(within(section('Binding acts')).getByRole('list', { name: 'Record trail' })).toHaveTextContent('Send to client')
    await waitFor(() => expect(conversation()).toHaveTextContent('Sarah will be in touch this week.'))
    expect(inContext().queryByRole('article', { name: 'Draft · not sent' })).toBeNull()

    await createDraft(ADRIAN, 'th-robert', 'Your statement is ready.')
    await viewAs('Robert Johnson · Client')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument())
    const record = await within(section('Records')).findByRole('article', { name: 'Sent to you' })
    expect(record).toHaveTextContent('Message from Adrian Hale')
    expect(record).toHaveTextContent('REC-0001')
    expect(record).toHaveTextContent('Adrian Hale, Advisor')
    expect(conversation()).toHaveTextContent('Sarah will be in touch this week.')
    expect(screen.queryByText('Draft · not sent')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Send to Robert' })).toBeNull()
    expect(document.body).not.toHaveTextContent('Your statement is ready.')
    expect(document.body.textContent).not.toMatch(/binding|Supervisory review|Send to client/i)
    expect(document.body).toHaveTextContent('Retained as a record')
    expect(inContext().queryByRole('region', { name: 'Ask an agent' })).toBeNull()
    expect(inContext().queryByRole('button')).toBeNull()
    const seenBy = within(section('Who can see'))
    expect(seenBy.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Robert Johnson · Client', 'Adrian Hale · Advisor', 'Sarah Mitchell · Client service',
    ])
    expect(contextColumn()).not.toHaveTextContent('Mark Davis')
    expect(contextColumn()).not.toHaveTextContent('Drift Monitor')

    await viewAs('Sarah Mitchell · Client service')
    const sarahsView = await within(await inContext().findByRole('region', { name: 'Drafts for Robert' })).findByRole('article', { name: 'Draft · not sent' })
    expect(sarahsView).toHaveTextContent('Your statement is ready.')
    expect(sarahsView).toHaveTextContent('Only the advisor of record can send this. Sending is recorded as a binding act.')
    expect(within(sarahsView).queryByRole('button')).toBeNull()
    expect(within(section('Binding acts')).getByText('Send to client · binding')).toBeInTheDocument()
  })

  it('a double-click on Send records exactly one act', async () => {
    await createDraft(ADRIAN, 'th-robert', 'Sarah will be in touch this week.')
    await openThread('/t/th-robert', 'Robert Johnson')
    const draft = await inContext().findByRole('article', { name: 'Draft · not sent' })
    const sends: string[] = []
    const countSends = ({ request }: { request: Request }) => {
      if (request.method === 'POST' && new URL(request.url).pathname === '/api/workspace/acts') sends.push(request.url)
    }
    server.events.on('request:start', countSends)
    // Hold each send long enough that the second click lands while the first is still in flight.
    server.use(http.post('/api/workspace/acts', async () => { await delay(100) }))
    const user = userEvent.setup()
    await user.dblClick(within(draft).getByRole('button', { name: 'Send to Robert' }))
    await within(section('Binding acts')).findByText('REC-0001')
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0001')))
    server.events.removeListener('request:start', countSends)
    expect(sends).toHaveLength(1)
    expect(store().acts).toHaveLength(1)
    expect(inContext().queryByRole('alert')).toBeNull()
  })

  it('shows the engine refusing a send as an alert, not as a record', async () => {
    server.use(http.post('/api/workspace/acts', () =>
      HttpResponse.json({ code: 'ALREADY_SENT', message: 'This draft was already sent (REC-0001).' }, { status: 409 })))
    await createDraft(ADRIAN, 'th-robert', 'Sarah will be in touch this week.')
    await openThread('/t/th-robert', 'Robert Johnson')
    const draft = await inContext().findByRole('article', { name: 'Draft · not sent' })
    await userEvent.setup().click(within(draft).getByRole('button', { name: 'Send to Robert' }))
    expect(await inContext().findByRole('alert')).toHaveTextContent('This draft was already sent (REC-0001).')
    expect(within(section('Binding acts')).getByText('None in this thread')).toBeInTheDocument()
  })

  it('"Ask Drift Monitor" adds its findings to the open thread', async () => {
    const { router } = await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    expect(within(conversation()).getAllByRole('listitem')).toHaveLength(3)
    const ask = within(section('Ask an agent'))
    expect(ask.getByRole('button', { name: 'Ask Pre-trade Check' })).toBeInTheDocument()
    await userEvent.setup().click(ask.getByRole('button', { name: 'Ask Drift Monitor' }))
    expect(await within(conversation()).findAllByRole('article', { name: /^Drift Monitor: / })).not.toHaveLength(0)
    expect(router.state.location.pathname).toBe('/t/th-johnson-review')
    expect(within(section('Ask an agent')).getByRole('status')).toHaveTextContent('Drift Monitor reported in the thread.')
    await userEvent.setup().click(ask.getByRole('button', { name: 'Ask Drift Monitor' }))
    expect(await within(section('Ask an agent')).findByText('Drift Monitor has already reported for this as-of.')).toBeInTheDocument()
  })

  it('lists the members, compliance supervision and the agents with their scopes', async () => {
    await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    const seenBy = within(section('Who can see'))
    expect(seenBy.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Adrian Hale · Advisor', 'Sarah Mitchell · Client service', 'Mike Chen · Analyst', 'Mark Davis · Compliance (supervision)',
      expect.stringMatching(/^Drift Monitor/), expect.stringMatching(/^Pre-trade Check/),
    ])
    const drift = seenBy.getByText('Drift Monitor').closest('li') as HTMLElement
    expect(drift).toHaveTextContent('may measure and flag')
    expect(drift).toHaveTextContent('may not stage or release trades · post in a client thread')
  })

  it("lists compliance supervision on a client thread for firm viewers, and not on a private one", async () => {
    await openThread('/t/th-robert', 'Robert Johnson')
    expect(section('Who can see')).toHaveTextContent('Mark Davis · Compliance (supervision)')
    expect(inContext().queryByRole('region', { name: 'Ask an agent' })).toBeNull()
  })

  it('a private thread is seen by its owner alone', async () => {
    await openThread('/t/th-brief', 'Brief')
    expect(within(section('Who can see')).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Adrian Hale · Advisor', expect.stringMatching(/^Drift Monitor/),
    ])
    expect(contextColumn()).not.toHaveTextContent('Mark Davis')
  })

  it('links the subject account to its full view, remembering the thread', async () => {
    await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    const link = await within(section('Full views')).findByRole('link', { name: /^Robert Johnson Individual/ })
    expect(link).toHaveAttribute('href', '/accounts/acc-002?from=th-johnson-review')
    expect(link).toHaveTextContent('Robert Johnson Individual ↗')
  })

  it('a firm viewer without the send permission sees the draft but no Send button', async () => {
    await createDraft(ADRIAN, 'th-robert', 'Sarah will be in touch this week.')
    viewAsOnLoad('cco-001')
    await openThread('/t/th-robert', 'Robert Johnson')
    const draft = await inContext().findByRole('article', { name: 'Draft · not sent' })
    expect(within(draft).queryByRole('button')).toBeNull()
  })
})
