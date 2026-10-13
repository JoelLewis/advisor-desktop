import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { RouteObject } from 'react-router-dom'
import { routes } from '@/app/routes'
import { RootLayout } from '@/app/RootLayout'
import { renderRoutes } from '@/test/render'
import { server } from '@/test/server'
import { WorkspaceShell } from '@/workspace/shell/WorkspaceShell'
import { WorkspaceHome } from '@/workspace/shell/WorkspaceHome'
import type { ShellHandle } from '@/workspace/shell/context-column'

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
  it('as Adrian lists three threads under the three headings, with one h1', async () => {
    const { container } = await renderHome()
    await waitFor(() => expect(groupHeadings()).toEqual(['Desk', 'Private', 'Internal', 'Client', 'Agents on this desk']))
    expect(threadLinks()).toEqual(['Supervision', 'Brief', 'Johnson Rebalance Review', 'Robert Johnson'])
    expect(within(threadNav()).getByRole('link', { name: 'Johnson Rebalance Review' })).toHaveAttribute('href', '/t/th-johnson-review')
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Workspace' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('main')).toHaveTextContent('Choose a thread.')
  })

  it('lays out the frame: banner, thread nav, main, and no context column on home', async () => {
    await renderHome()
    const banner = screen.getByRole('banner')
    expect(within(banner).getByRole('link', { name: 'Advisor Desktop' })).toHaveAttribute('href', '/')
    expect(within(banner).getByRole('button', { name: /^Theme: / })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('lists the agents of the visible threads with their scopes', async () => {
    await renderHome()
    const agents = within(threadNav()).getByRole('heading', { name: 'Agents on this desk' }).closest('section') as HTMLElement
    expect(within(agents).getByText('Drift Monitor')).toBeInTheDocument()
    expect(within(agents).getByText('Pre-trade Check')).toBeInTheDocument()
    expect(agents).toHaveTextContent('may measure and flag')
    expect(agents).toHaveTextContent('may not clear a block')
  })

  it('the view-as control lists everyone in the directory with their role, defaulting to Adrian', async () => {
    await renderHome()
    const select = await screen.findByRole('combobox', { name: 'View as' })
    await within(select).findByRole('option', { name: 'Mark Davis · Compliance' })
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Adrian Hale · Advisor', 'Sarah Mitchell · Client service', 'Mike Chen · Analyst', 'Mark Davis · Compliance', 'Robert Johnson · Client',
    ])
    expect(select).toHaveValue('user-001')
  })

  it('viewing as Robert leaves only his thread and no agents', async () => {
    await renderHome()
    await viewAs('Robert Johnson · Client')
    await waitFor(() => expect(threadLinks()).toEqual(['Robert Johnson']))
    expect(groupHeadings()).toEqual(['Client'])
    expect(within(threadNav()).queryByText('Drift Monitor')).toBeNull()
    expect(screen.getByRole('combobox', { name: 'View as' })).toHaveValue('cli-001')
  })

  it('the view-as list stays complete while viewing as the client', async () => {
    await renderHome()
    await viewAs('Robert Johnson · Client')
    await waitFor(() => expect(threadLinks()).toEqual(['Robert Johnson']))
    expect(within(screen.getByRole('combobox', { name: 'View as' })).getAllByRole('option')).toHaveLength(5)
  })

  it('viewing as Mark Davis shows the two firm threads, not the private brief', async () => {
    await renderHome()
    await viewAs('Mark Davis · Compliance')
    await waitFor(() => expect(threadLinks()).toEqual(['Supervision', 'Johnson Rebalance Review', 'Robert Johnson']))
    expect(groupHeadings()).toEqual(['Desk', 'Internal', 'Client', 'Agents on this desk'])
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
})
