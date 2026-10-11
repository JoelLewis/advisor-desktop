import { describe, it, expect } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { server } from '@/test/server'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'

const threadNav = () => screen.getByRole('navigation', { name: 'Threads' })

async function renderAt(path: string) {
  const view = renderRoutes(routes, path)
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
  it('/ then "Johnson" and Enter opens the thread and focuses its heading', async () => {
    const { router } = await renderAt('/')
    await openCommandLine()
    await userEvent.keyboard('Johnson{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/t/th-johnson-review'))
    const title = await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
    await waitFor(() => expect(title).toHaveFocus())
  })

  it('offers every visible thread, the accounts they are about, home and the kit', async () => {
    await renderAt('/')
    await openCommandLine()
    await waitFor(() => expect(destinationNames()).toContain('Account · Robert Johnson Individual'))
    expect(destinationNames()).toEqual([
      'Workspace home',
      'Thread · Brief',
      'Thread · Johnson Rebalance Review',
      'Thread · Robert Johnson',
      'Account · Robert Johnson Individual',
      'Component kit',
    ])
  })

  it('after a switch to Robert, offers only his thread plus home and the kit', async () => {
    await renderAt('/')
    const user = userEvent.setup()
    const select = await screen.findByRole('combobox', { name: 'View as' })
    await screen.findByRole('option', { name: 'Robert Johnson · Client' })
    await user.selectOptions(select, 'Robert Johnson · Client')
    await waitFor(() => expect(within(threadNav()).queryByRole('link', { name: 'Brief' })).toBeNull())
    act(() => (document.activeElement as HTMLElement).blur())
    await openCommandLine()
    expect(destinationNames()).toEqual(['Workspace home', 'Thread · Robert Johnson', 'Component kit'])
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

  it('the top bar legend shows the shell jump keys; ] only where there is a context column', async () => {
    await renderAt('/')
    const legend = within(screen.getByRole('banner')).getByRole('list', { name: 'Keys' })
    expect(legend).toHaveTextContent('Thread list')
    expect(legend).not.toHaveTextContent('Context column')
    await userEvent.click(within(threadNav()).getByRole('link', { name: 'Brief' }))
    await waitFor(() => expect(legend).toHaveTextContent('Context column'))
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
