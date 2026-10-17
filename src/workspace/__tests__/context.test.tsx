import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { server } from '@/test/server'
import { runAgent } from '@/mocks/workspace/run-agent'
import { viewerFrom } from '@/mocks/workspace/visibility'
import { createDraft } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

async function openThread(path: string, title: string) {
  const view = renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: title })
  await inContext().findByRole('region', { name: /^(Binding acts|Records)$/ })
  return view
}

/** The roster under the thread's title, without its visual "Who can see:" prefix. */
const roster = () => screen.getByRole('note', { name: 'Who can see' }).textContent?.replace(/^Who can see: /, '')

const contextColumn = () => screen.getByRole('complementary', { name: 'Details' })
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

    await user.type(screen.getByRole('textbox', { name: 'Message to Robert Johnson' }), 'Sarah will be in touch this week.')
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your conversation with Larkfield')
    expect(roster()).toBe('Robert Johnson · Client, Adrian Hale · Advisor, Sarah Mitchell · Client service, Larkfield compliance (review)')
    expect(contextColumn()).not.toHaveTextContent('Mark Davis')
    expect(contextColumn()).not.toHaveTextContent('Drift Monitor')

    await viewAs('Sarah Mitchell · Client service')
    const sarahsView = await within(await inContext().findByRole('region', { name: 'Drafts · message to Robert Johnson' })).findByRole('article', { name: 'Draft · not sent' })
    expect(sarahsView).toHaveTextContent('Your statement is ready.')
    expect(sarahsView).toHaveTextContent('Only the advisor of record can send this. Sending is recorded as a binding act.')
    expect(within(sarahsView).queryByRole('button', { name: 'Send to Robert' })).toBeNull()
    expect(within(sarahsView).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(within(section('Binding acts')).getByText('Send to client or prospect · binding')).toBeInTheDocument()
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
    expect(ask.getByRole('button', { name: 'Ask Proposal Agent' })).toBeInTheDocument()
    await userEvent.setup().click(ask.getByRole('button', { name: 'Ask Drift Monitor' }))
    expect(await within(conversation()).findAllByRole('article', { name: /^Drift Monitor: / })).not.toHaveLength(0)
    expect(router.state.location.pathname).toBe('/t/th-johnson-review')
    expect(within(section('Ask an agent')).getByText('Drift Monitor reported in the thread.')).toBeInTheDocument()
    await userEvent.setup().click(ask.getByRole('button', { name: 'Ask Drift Monitor' }))
    expect(await within(section('Ask an agent')).findByText('Drift Monitor has already reported for this as-of.')).toBeInTheDocument()
  })

  it('announces an agent run in the app announcer', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Ask Drift Monitor' }))
    await waitFor(() => expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent('Drift Monitor reported in the thread.'))
  })

  it('lists the members, compliance supervision and the agents with their scopes', async () => {
    await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    expect(roster()).toBe('Adrian Hale · Advisor, Sarah Mitchell · Client service, Mike Chen · Analyst, Mark Davis · Compliance (supervision)')
    const agents = within(section('Agents'))
    expect(agents.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringMatching(/^Drift Monitor/), expect.stringMatching(/^Pre-trade Check/), expect.stringMatching(/^Proposal Agent/),
    ])
    const drift = agents.getByText('Drift Monitor').closest('li') as HTMLElement
    expect(drift).toHaveTextContent('Can measure and flag')
    expect(drift).toHaveTextContent('Can\'t stage or release trades · post in a client thread')
  })

  it("lists compliance supervision under a client thread's title for firm viewers, and leaves it out of the context column", async () => {
    await openThread('/t/th-robert', 'Robert Johnson')
    expect(roster()).toContain('Mark Davis · Compliance (supervision)')
    expect(inContext().queryByRole('heading', { name: 'Who can see' })).toBeNull()
    expect(inContext().queryByRole('region', { name: 'Ask an agent' })).toBeNull()
  })

  it('a private thread is seen by its owner alone', async () => {
    await openThread('/t/th-brief', 'Brief')
    expect(roster()).toBe('Adrian Hale · Advisor')
    expect(within(section('Agents')).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringMatching(/^Drift Monitor/), expect.stringMatching(/^Harvest Scanner/),
    ])
    expect(contextColumn()).not.toHaveTextContent('Mark Davis')
  })

  it('links the subject account to its full view, remembering the thread', async () => {
    await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    const link = await within(section('Related records')).findByRole('link', { name: /^Robert Johnson Individual/ })
    expect(link).toHaveAttribute('href', '/accounts/acc-002?from=th-johnson-review')
    expect(link).toHaveTextContent('Robert Johnson Individual ↗')
  })

  it("tells Robert, on his own thread, that compliance reviews it, without naming anyone in compliance", async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/t/th-robert')
    await screen.findByRole('heading', { level: 1, name: 'Your conversation with Larkfield' })
    expect(roster()).toContain('Larkfield compliance (review)')
    expect(roster()).not.toContain('Mark Davis')
    await inContext().findByRole('region', { name: 'Records' })
    expect(inContext().queryByRole('region', { name: 'Agents' })).toBeNull()
  })

  it('a firm viewer without the send permission sees the draft but no Send button', async () => {
    await createDraft(ADRIAN, 'th-robert', 'Sarah will be in touch this week.')
    viewAsOnLoad('cco-001')
    await openThread('/t/th-robert', 'Robert Johnson')
    const draft = await inContext().findByRole('article', { name: 'Draft · not sent' })
    expect(within(draft).queryByRole('button')).toBeNull()
  })

  it('Ask Drift Monitor keeps focus through its request', async () => {
    // Hold the request so the button is observed while it is in flight.
    server.use(http.post('/api/workspace/threads/:id/agents/:agentId/run', async ({ request, params }) => {
      await delay(150)
      const viewer = viewerFrom(request)
      if (!viewer) throw new Error('The run request carries a viewer')
      const result = runAgent(viewer, String(params.id), 'drift-monitor')
      if (!result.ok) throw new Error(result.message)
      return HttpResponse.json(result.findings)
    }))
    renderRoutes(routes, '/t/th-johnson-review')
    const ask = await screen.findByRole('button', { name: 'Ask Drift Monitor' })
    await userEvent.setup().click(ask)
    expect(ask).toHaveAttribute('aria-disabled', 'true')
    expect(ask).toHaveFocus()
    await screen.findByText('Drift Monitor reported in the thread.')
    expect(ask).not.toHaveAttribute('aria-disabled')
    expect(ask).toHaveFocus()
  })
})
