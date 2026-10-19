import { describe, it, expect } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { showConversationsFor } from '@/test/book-mode'

const threadNav = () => screen.getByRole('navigation', { name: 'Book' })

async function renderAt(path: string) {
  const view = renderRoutes(routes, path)
  await screen.findByRole('navigation', { name: 'Book' })
  await within(threadNav()).findByRole('link', { name: 'Brief' })
  return view
}

async function openCommandLine() {
  await userEvent.keyboard('/')
  const box = await screen.findByRole('combobox', { name: 'Go to' })
  await waitFor(() => expect(box).toHaveFocus())
  return box
}

const destinationNames = () => screen.getAllByRole('option').map((o) => o.textContent)

describe('keyboard in the shell', () => {
  it('/ then "Johnson Rebalance" and Enter opens the thread and focuses its heading', async () => {
    const { router } = await renderAt('/')
    await openCommandLine()
    await userEvent.keyboard('Johnson Rebalance{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/t/th-johnson-review'))
    const title = await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
    await waitFor(() => expect(title).toHaveFocus())
  })

  it('/ then "Johnson", named exactly, opens the household', async () => {
    const { router } = await renderAt('/')
    const box = await openCommandLine()
    await waitFor(() => expect(destinationNames()).toContain('Household · Johnson'))
    await userEvent.type(box, 'Johnson{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/households/hh-001'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Johnson Household' })).toBeInTheDocument()
  })

  it('offers every visible thread, the accounts they are about, the household and its clients, the meeting, home and the kit', async () => {
    await renderAt('/')
    await openCommandLine()
    await waitFor(() => expect(destinationNames()).toContain('Account · Robert Johnson · Individual (…3847)'))
    await waitFor(() => expect(destinationNames()).toContain('Client · Patricia Johnson'))
    await waitFor(() => expect(destinationNames()).toContain('Meeting · Johnson annual review'))
    await waitFor(() => expect(destinationNames()).toContain('Model · Moderate Balanced'))
    expect(destinationNames()).toEqual([
      'Workspace home',
      'Thread · Brief',
      'Thread · Johnson Rebalance Review',
      'Thread · Johnson annual review',
      'Thread · Robert Johnson',
      'Thread · Patricia Johnson',
      'Thread · Dr. Amanda Pell',
      'Thread · Pell · prospect work',
      'Account · Robert Johnson · Individual (…3847)',
      'Household · Johnson',
      'Client · Robert Johnson',
      'Client · Patricia Johnson',
      'Meeting · Johnson annual review',
      'Prospect · Dr. Amanda Pell',
      'Billing',
      'Reconciliation',
      'Risk · book',
      'Models',
      'Practice',
      'Blotter',
      'Risk · Robert Johnson · Individual (…3847)',
      'Attribution · Robert Johnson · Individual (…3847)',
      'Model · Balanced Growth',
      'Model · Growth',
      'Model · Conservative Income',
      'Model · Aggressive Growth',
      'Model · Ultra-HNW Multi-Strategy',
      'Model · Education 529',
      'Model · Moderate Balanced',
      'Supervision',
      'Archive',
      'Component kit',
    ])
  })

  it('after a switch to Robert, offers only his conversation, titled for him, plus home: no kit for a client', async () => {
    await renderAt('/')
    const user = userEvent.setup()
    const select = await screen.findByRole('combobox', { name: 'View as' })
    await screen.findByRole('option', { name: 'Robert Johnson · Client' })
    await user.selectOptions(select, 'Robert Johnson · Client')
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Book' })).toBeNull())
    act(() => (document.activeElement as HTMLElement).blur())
    await openCommandLine()
    expect(destinationNames()).toEqual(['Workspace home', 'Thread · Your conversation with Larkfield'])
  })

  it('[ focuses the thread list, \\ the main region, ] the context column when there is one', async () => {
    await renderAt('/t/th-brief')
    await screen.findByRole('heading', { level: 1, name: 'Brief' })
    await userEvent.keyboard('[[') // [[ is a literal [ in user-event
    expect(threadNav()).toHaveFocus()
    await userEvent.keyboard('\\')
    expect(screen.getByRole('main')).toHaveFocus()
    await userEvent.keyboard(']')
    expect(document.getElementById('context-column')).toHaveFocus()
  })

  const failThreadLoad = (): void => { server.use(http.get('/api/workspace/threads/:id', () => HttpResponse.json({ message: 'Engine offline' }, { status: 503 }))) }
  const noChange = (): void => undefined
  it.each([
    ['not found', '/t/th-nope', noChange, 'Thread not found'],
    ['failed', '/t/th-brief', failThreadLoad, undefined],
  ] as const)('a thread that is %s has no context column and no ] key', async (_, path, arrange, heading) => {
    arrange()
    await renderAt(path)
    if (heading) await screen.findByRole('heading', { level: 1, name: heading })
    else await within(screen.getByRole('main')).findByRole('alert')
    await waitFor(() => expect(screen.queryByRole('complementary')).toBeNull())
    expect(document.getElementById('context-column')).toBeNull()
    await userEvent.keyboard('?')
    expect(screen.getByRole('dialog', { name: 'Keyboard' })).not.toHaveTextContent('Context column')
  })

  it('the key sheet lists the shell jump keys; ] only where there is a context column', async () => {
    await renderAt('/')
    await userEvent.keyboard('?')
    const sheet = screen.getByRole('dialog', { name: 'Keyboard' })
    expect(sheet).toHaveTextContent('Book')
    expect(sheet).not.toHaveTextContent('Context column')
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(threadNav()).getByRole('link', { name: 'Brief' }))
    await waitFor(() => expect(document.getElementById('context-column')).not.toBeNull())
    await userEvent.keyboard('?')
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Keyboard' })).toHaveTextContent('Context column'))
  })

  it('shows only the two global keys in the header, and their modifier forms once single keys are off', async () => {
    await renderAt('/')
    const legend = screen.getByRole('list', { name: 'Keys' })
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['/command', '?keys'])
    await userEvent.keyboard('?')
    await userEvent.click(screen.getByRole('switch', { name: 'Single-key shortcuts' }))
    await userEvent.keyboard('{Escape}')
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Ctrl/⌘ Kcommand', 'Ctrl/⌘ /keys'])
  })

  it('a route change focuses the new page heading', async () => {
    await renderAt('/')
    await userEvent.click(within(threadNav()).getByRole('link', { name: 'Brief' }))
    const title = await screen.findByRole('heading', { level: 1, name: 'Brief' })
    await waitFor(() => expect(title).toHaveFocus())
  })

  it('does not take focus from where the user moved it while the page loaded', async () => {
    let release = () => {}
    const gate = new Promise<void>((resolve) => { release = resolve })
    showConversationsFor()
    // Holds the thread back until released, then falls through to the real handler.
    server.use(http.get('/api/workspace/threads/:id', async () => { await gate }))
    await renderAt('/')
    await userEvent.click(within(threadNav()).getByRole('link', { name: 'Brief' }))
    expect(screen.getByRole('main')).toHaveFocus()
    const link = within(threadNav()).getByRole('link', { name: 'Robert Johnson' })
    act(() => link.focus())
    release()
    await screen.findByRole('heading', { level: 1, name: 'Brief' })
    expect(link).toHaveFocus()
  })

  it('leaves focus alone on the first page load', async () => {
    await renderAt('/t/th-brief')
    await screen.findByRole('heading', { level: 1, name: 'Brief' })
    expect(document.body).toHaveFocus()
  })
})
