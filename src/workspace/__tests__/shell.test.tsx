import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import type { RouteObject } from 'react-router-dom'
import { routes } from '@/app/routes'
import { RootLayout } from '@/app/RootLayout'
import { renderRoutes } from '@/test/render'
import { server } from '@/test/server'
import { WorkspaceShell } from '@/workspace/shell/WorkspaceShell'
import { WorkspaceHome } from '@/workspace/shell/WorkspaceHome'
import { OUTSIDER_BAND } from '@/workspace/people/visibility-words'
import type { ShellHandle } from '@/workspace/shell/context-column'
import { PHONE_LAYOUT_QUERY } from '@/workspace/shell/phone-panes'

const threadNav = () => screen.getByRole('navigation', { name: 'Threads' })

async function renderHome() {
  const view = renderRoutes(routes, '/')
  await within(threadNav()).findByRole('link', { name: 'Brief' })
  return view
}

async function viewAs(option: string) {
  const user = userEvent.setup()
  const select = await screen.findByRole('combobox', { name: 'View as' })
  await screen.findByRole('option', { name: option })
  await user.selectOptions(select, option)
}

const groupHeadings = () => within(threadNav()).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
const spokenText = (el: Element) => [...el.childNodes]
  .filter((n) => !(n instanceof Element && n.getAttribute('aria-hidden') === 'true')).map((n) => n.textContent).join('')
const threadLinks = () => within(threadNav()).getAllByRole('link').map(spokenText)

describe('workspace shell', () => {
  it('reserves the thread list while it loads: the panes and the rows the loaded list will have, and a status', async () => {
    server.use(http.get('/api/workspace/threads', async () => { await delay(200); return HttpResponse.json([]) }))
    renderRoutes(routes, '/')
    expect(await screen.findByText('Loading threads…')).toBeInTheDocument()
    const skeleton = document.querySelector('[data-part="thread-list-skeleton"]')!
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
    expect(skeleton.querySelectorAll('[data-part="skeleton-row"]')).toHaveLength(14)
    expect(skeleton.querySelector('ul[aria-label="Visibility"]')).toBeNull()
    expect([...skeleton.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Firm', 'Reports', 'Just me', 'Larkfield team', 'Client conversations'])
  })
  it('keeps the skeleton until the directory arrives, so no row is described before its party is known', async () => {
    server.use(http.get('/api/workspace/people', async () => { await delay('infinite'); return HttpResponse.json({}) }))
    let threadsServed = false
    const onResponse = ({ request }: { request: Request }) => { if (new URL(request.url).pathname === '/api/workspace/threads') threadsServed = true }
    server.events.on('response:mocked', onResponse)
    try {
      renderRoutes(routes, '/')
      await waitFor(() => expect(threadsServed).toBe(true))
      await delay(50)
      expect(screen.getByText('Loading threads…')).toBeInTheDocument()
      expect(document.querySelector('[data-part="thread-list-skeleton"]')).not.toBeNull()
      expect(within(threadNav()).queryAllByRole('link')).toHaveLength(0)
    } finally {
      server.events.removeListener('response:mocked', onResponse)
    }
  })
  it('needs no legend: the groups name who reads them, and each row is a mark with its readers as a description', async () => {
    await renderHome()
    expect(within(threadNav()).queryByRole('list', { name: 'Visibility' })).toBeNull()
    expect(within(threadNav()).getByRole('link', { name: 'Brief' })).toHaveAccessibleDescription('Visibility: Just you')
    expect(within(threadNav()).getByRole('link', { name: 'Johnson Rebalance Review' })).toHaveAccessibleDescription("Visibility: Larkfield team · Robert can't see this")
    expect(within(threadNav()).getByRole('link', { name: 'Johnson annual review' })).toHaveAccessibleDescription("Visibility: Larkfield team · Robert and Patricia can't see this")
    expect(within(threadNav()).getByRole('link', { name: 'Pell · prospect work' })).toHaveAccessibleDescription("Visibility: Larkfield team · Dr. Pell can't see this")
    expect(within(threadNav()).getByRole('link', { name: 'Robert Johnson' })).toHaveAccessibleDescription('Visibility: Robert Johnson can read this')
    expect(within(threadNav()).getByRole('link', { name: 'Dr. Amanda Pell' })).toHaveAccessibleDescription('Visibility: Dr. Amanda Pell can read this')
    const spoken = within(threadNav()).queryAllByText(/^Visibility: /)
    expect(spoken.length).toBe(6)
    for (const note of spoken) expect(note).toHaveClass('sr-only')
  })

  it('as Adrian lists six threads under the three headings, with one h1', async () => {
    const { container } = await renderHome()
    await waitFor(() => expect(groupHeadings()).toEqual(['Firm', 'Reports', 'Just me', 'Larkfield team', 'Client conversations', 'Agents']))
    expect(threadLinks()).toEqual(['Supervision', 'Archive', 'Billing', 'Reconciliation', 'Risk', 'Models', 'Practice', 'Blotter', 'Brief', 'Johnson Rebalance Review', 'Johnson annual review', 'Pell · prospect work', 'Robert Johnson', 'Dr. Amanda Pell'])
    expect(within(threadNav()).getByRole('link', { name: 'Johnson Rebalance Review' })).toHaveAttribute('href', '/t/th-johnson-review')
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Workspace' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('main')).toHaveTextContent(/^Workspace.*One advisor's day at Larkfield Advisory/)
  })

  it('home says the firm and its people are fictional and the date starts at 25 Feb, and links the Brief in the path', async () => {
    await renderHome()
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent('Larkfield Advisory and everyone in it are fictional, and nothing here is investment, tax or legal advice. Starts at 25 Feb 2026; the presenter can move the clock forward.')
    expect(within(main).getByRole('link', { name: 'Open the Brief' })).toHaveAttribute('href', '/t/th-brief')
  })

  it('lays out the frame: banner, thread nav, main, and no context column on home', async () => {
    await renderHome()
    const banner = screen.getByRole('banner')
    expect(within(banner).getByRole('link', { name: 'Advisor Desktop' })).toHaveAttribute('href', '/')
    expect(within(banner).getByRole('button', { name: /^Theme: / })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it("names the firm and the viewer in an outsider's banner; the product to the firm", async () => {
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, '/')
    const banner = await screen.findByRole('banner')
    expect(await within(banner).findByRole('link', { name: 'Larkfield Advisory' })).toHaveAttribute('href', '/')
    expect(banner).toHaveTextContent('Robert Johnson')
    expect(within(banner).queryByRole('link', { name: 'Advisor Desktop' })).toBeNull()
  })

  it("never shows an outsider the product's name, even while their own directory loads", async () => {
    sessionStorage.setItem('ws-viewer', 'cli-001')
    server.use(http.get('/api/workspace/people', async ({ request }) => {
      // Hold Robert's own directory; returning nothing hands the request on to the engine's handler.
      if (request.headers.get('X-Viewer') === 'cli-001') await delay(300)
    }))
    renderRoutes(routes, '/')
    const banner = await screen.findByRole('banner')
    // His directory is still on its way: the thread list waits for it.
    expect(within(threadNav()).getByRole('status')).toHaveTextContent('Loading threads…')
    expect(within(banner).getByRole('link', { name: 'Larkfield Advisory' })).toBeInTheDocument()
    expect(banner).toHaveTextContent('Robert Johnson')
    expect(document.title).toMatch(/(^| · )Larkfield Advisory$/)
    expect(document.body).not.toHaveTextContent('Advisor Desktop')
  })

  it("titles an outsider's tab with the firm, and a firm viewer's with the product", async () => {
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, '/t/th-robert')
    await screen.findByRole('heading', { level: 1, name: 'Your conversation with Larkfield' })
    await waitFor(() => expect(document.title).toBe('Your conversation with Larkfield · Larkfield Advisory'))
    await viewAs('Adrian Hale · Advisor')
    await screen.findByRole('heading', { level: 1, name: 'Robert Johnson' })
    await waitFor(() => expect(document.title).toBe('Robert Johnson · Advisor Desktop'))
  })

  it('lists the agents of the visible threads with their scopes', async () => {
    await renderHome()
    const agents = within(threadNav()).getByRole('heading', { name: 'Agents' }).closest('section') as HTMLElement
    expect(within(agents).getByText('Drift Monitor')).toBeInTheDocument()
    expect(within(agents).getByText('Pre-trade Check')).toBeInTheDocument()
    expect(agents).toHaveTextContent('Can measure and flag')
    expect(agents).toHaveTextContent('Can\'t clear a block')
  })

  it('the view-as control lists everyone in the directory with their role, defaulting to Adrian', async () => {
    await renderHome()
    const select = await screen.findByRole('combobox', { name: 'View as' })
    await within(select).findByRole('option', { name: 'Mark Davis · Compliance' })
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Adrian Hale · Advisor', 'Sarah Mitchell · Client service', 'Mike Chen · Analyst', 'Mark Davis · Compliance', 'Robert Johnson · Client', 'Dr. Amanda Pell · Prospect',
    ])
    expect(select).toHaveValue('user-001')
  })

  it('tells a client who reads their one conversation, compliance included, as the description of its row', async () => {
    await renderHome()
    await viewAs('Robert Johnson · Client')
    await waitFor(() => expect(threadLinks()).toEqual(['Your conversation with Larkfield']))
    expect(within(threadNav()).queryByRole('list', { name: 'Visibility' })).toBeNull()
    expect(within(threadNav()).getByRole('link', { name: 'Your conversation with Larkfield' })).toHaveAccessibleDescription(`Visibility: ${OUTSIDER_BAND}`)
  })

  it('viewing as Robert leaves only his thread and no agents', async () => {
    await renderHome()
    await viewAs('Robert Johnson · Client')
    await waitFor(() => expect(threadLinks()).toEqual(['Your conversation with Larkfield']))
    await waitFor(() => expect(groupHeadings()).toEqual(['Larkfield Advisory']))
    expect(within(threadNav()).queryByText('Drift Monitor')).toBeNull()
    expect(screen.getByRole('combobox', { name: 'View as' })).toHaveValue('cli-001')
  })

  it('the view-as list stays complete while viewing as the client', async () => {
    await renderHome()
    await viewAs('Robert Johnson · Client')
    await waitFor(() => expect(threadLinks()).toEqual(['Your conversation with Larkfield']))
    expect(within(screen.getByRole('combobox', { name: 'View as' })).getAllByRole('option')).toHaveLength(6)
  })

  it('viewing as Mark Davis shows the two firm threads, not the private brief', async () => {
    await renderHome()
    await viewAs('Mark Davis · Compliance')
    await waitFor(() => expect(threadLinks()).toEqual(['Supervision', 'Archive', 'Billing', 'Reconciliation', 'Risk', 'Models', 'Practice', 'Blotter', 'Johnson Rebalance Review', 'Johnson annual review', 'Pell · prospect work', 'Robert Johnson', 'Dr. Amanda Pell']))
    expect(groupHeadings()).toEqual(['Firm', 'Reports', 'Larkfield team', 'Client conversations', 'Agents'])
  })

  it('shows a status while threads load', () => {
    renderRoutes(routes, '/')
    expect(within(threadNav()).getByRole('status')).toHaveTextContent('Loading threads…')
  })

  it('shows the error message when threads fail to load', async () => {
    server.use(http.get('/api/workspace/threads', () => HttpResponse.json({ message: 'Engine offline' }, { status: 503 })))
    renderRoutes(routes, '/')
    const alert = await within(threadNav()).findByRole('alert')
    expect(alert).toHaveTextContent('Engine offline')
  })

  it('marks the current thread and renders a route-provided context column outside main', async () => {
    const handle: ShellHandle = { contextColumn: { label: 'Who can see', Content: () => <p>Adrian Hale · Advisor</p>, useAvailable: () => true } }
    const table: RouteObject[] = [{
      path: '/',
      element: <RootLayout />,
      children: [{
        element: <WorkspaceShell />,
        children: [
          { index: true, element: <WorkspaceHome /> },
          { path: 't/:threadId', handle, element: <h1>Thread</h1> },
        ],
      }],
    }]
    renderRoutes(table, '/t/th-brief')
    const current = await within(threadNav()).findByRole('link', { name: 'Brief' })
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current).not.toHaveClass('font-semibold')
    expect(within(current).getByText('Brief')).toHaveClass('font-semibold')
    expect(within(threadNav()).getByRole('link', { name: 'Robert Johnson' })).not.toHaveAttribute('aria-current')
    const aside = screen.getByRole('complementary', { name: 'Who can see' })
    expect(aside).toHaveTextContent('Adrian Hale · Advisor')
    expect(screen.getByRole('main')).not.toContainElement(aside)
  })

  it('on a phone shows one pane at a time, the thread first, and switches from the tab bar', async () => {
    renderRoutes(routes, '/t/th-johnson-review')
    await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
    const tabs = screen.getByRole('navigation', { name: 'Panes' })
    expect(within(tabs).getAllByRole('button').map((b) => b.textContent)).toEqual(['Threads', 'Thread', 'Context'])
    expect(within(tabs).getByRole('button', { name: 'Thread' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('navigation', { name: 'Threads' }).className).toContain('max-narrow:hidden')
    expect(screen.getByRole('main').className).not.toContain('max-narrow:hidden')
    await userEvent.setup().click(within(tabs).getByRole('button', { name: 'Context' }))
    expect(within(tabs).getByRole('button', { name: 'Context' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('main').className).toContain('max-narrow:hidden')
    expect(document.getElementById('context-column')!.className).not.toContain('max-narrow:hidden')
    expect(document.getElementById('context-column')).toHaveFocus()
  })

  it('on a phone, a route that opens on the thread list focuses the list, not its hidden h1; the open thread tapped in the list shows it', async () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({ matches: query === PHONE_LAYOUT_QUERY, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }))
    const user = userEvent.setup()
    renderRoutes(routes, '/t/th-johnson-review')
    await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
    await user.click(screen.getByRole('link', { name: 'Advisor Desktop' }))
    const tabs = screen.getByRole('navigation', { name: 'Panes' })
    await waitFor(() => expect(within(tabs).getByRole('button', { name: 'Threads' })).toHaveAttribute('aria-current', 'true'))
    expect(threadNav()).toHaveFocus()
    await user.click(within(threadNav()).getByRole('link', { name: 'Johnson Rebalance Review' }))
    await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
    await user.click(within(tabs).getByRole('button', { name: 'Threads' }))
    await user.click(within(threadNav()).getByRole('link', { name: 'Johnson Rebalance Review' }))
    expect(within(tabs).getByRole('button', { name: 'Thread' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('main')).toHaveFocus()
  })
})
