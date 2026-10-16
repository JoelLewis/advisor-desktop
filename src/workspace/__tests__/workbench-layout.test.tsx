import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { createProposal } from '@/services/workspace'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const liveThread = () => screen.getByRole('complementary', { name: 'Live thread' })

async function openWorkbench(path = '/proposals/prop-0001?from=th-johnson-review') {
  await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  const view = renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: 'Johnson rebalance' })
  return view
}

describe('the workbench layout', () => {
  it('takes the main pane; the thread list steps aside; the team thread is live in the right column', async () => {
    await openWorkbench()
    expect(screen.queryByRole('navigation', { name: 'Threads' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-review')
    expect(screen.getByRole('main')).toHaveTextContent('v1 is not approved')
    expect(screen.getByRole('main')).toHaveTextContent('The workbench never approves.')
    const feed = await within(liveThread()).findByRole('list', { name: 'Thread feed' })
    expect(feed).toHaveTextContent('Drafted the proposal (v1).')
    const user = userEvent.setup()
    await user.type(within(liveThread()).getByRole('textbox', { name: 'Message' }), 'Looking at the lots now.')
    await user.click(within(liveThread()).getByRole('button', { name: 'Post to the team' }))
    await waitFor(() => expect(feed).toHaveTextContent('Looking at the lots now.'))
  })

  it('an unknown proposal is not found, with no thread column', async () => {
    renderRoutes(routes, '/proposals/prop-9999')
    expect(await screen.findByRole('heading', { level: 1, name: 'Proposal not found' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Live thread' })).toBeNull()
  })

  it('a proposal on a fresh load says the demo resets on reload, and links to the Brief', async () => {
    renderRoutes(routes, '/proposals/prop-0001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Proposal not found' })).toBeInTheDocument()
    expect(screen.getByText("This demo's state resets when the page reloads.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start again from the Brief' })).toHaveAttribute('href', '/t/th-brief')
  })

  it('a client is told the proposal is not found', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/proposals/prop-0001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Proposal not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Johnson rebalance')
  })

  it('switching "view as" to Robert on the workbench goes home', async () => {
    const { router } = await openWorkbench()
    const user = userEvent.setup()
    await screen.findByRole('option', { name: 'Robert Johnson · Client' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(document.body).not.toHaveTextContent('Johnson rebalance')
  })

  it('the command line offers "Proposal · Johnson rebalance"', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const { router } = renderRoutes(routes, '/')
    await screen.findByRole('heading', { level: 1, name: 'Workspace' })
    const user = userEvent.setup()
    await user.keyboard('/')
    const box = await screen.findByRole('combobox', { name: 'Go to' })
    await waitFor(() => expect(box).toHaveFocus())
    await waitFor(() => expect(screen.getAllByRole('option').map((o) => o.textContent)).toContain('Proposal · Johnson rebalance'))
    await user.keyboard('Johnson rebalance{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/proposals/prop-0001'))
    expect(router.state.location.search).toBe('?from=th-johnson-review')
  })
})
