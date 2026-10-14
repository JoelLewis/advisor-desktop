import { describe, it, expect } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http } from 'msw'
import { server } from '@/test/server'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { carryFinding } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const INTC_CLAIM = 'The remaining Intel Corp. shares can be sold at a loss today, and nothing bought in the last thirty days would wash the loss.'

async function carryIntc() {
  const finding = store().messages.find((m) => m.kind === 'agent_finding' && m.agentId === 'harvest-scanner')!
  await carryFinding('user-001', 'th-brief', finding.id, 'th-johnson-review')
}

describe('the Brief', () => {
  it('opens with Needs a decision, numbered, each line with its key figure, and Context collapsed', async () => {
    renderRoutes(routes, '/t/th-brief')
    await screen.findByRole('heading', { level: 1, name: 'Brief' })
    const decide = await screen.findByRole('region', { name: 'Needs a decision' })
    const items = [...decide.querySelector('ol')!.children] as HTMLElement[]
    expect(items).toHaveLength(3)
    expect(items[0]!.textContent).toMatch(/^1/)
    expect(items[0]).toHaveTextContent('US Equity is outside its tolerance band')
    expect(items[0]).toHaveTextContent('+13.2')
    expect(items[0]!.querySelector('[data-status="OUT"]')).not.toBeNull()
    expect(items[1]).toHaveTextContent('Intel Corp.')
    expect(items[1]).toHaveTextContent('−45,850')
    expect(items[1]).toHaveTextContent('−32,750')
    expect(items[1]!.querySelector('[data-status]')).toBeNull()
    const context = screen.getByRole('region', { name: 'Context' })
    expect(context.querySelector('details')).not.toHaveAttribute('open')
    const user = userEvent.setup()
    await user.click(within(items[1]!).getByRole('button', { name: 'Open finding: The remaining shares can be sold at a loss today' }))
    const intc = screen.getByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    await waitFor(() => expect(document.activeElement).toBe(intc))
  })

  it('the Context group keeps its open state across a refetch', async () => {
    const { queryClient } = renderRoutes(routes, '/t/th-brief')
    const context = await screen.findByRole('region', { name: 'Context' })
    await userEvent.setup().click(within(context).getByText(/^Context/))
    expect(context.querySelector('details')).toHaveAttribute('open')
    await act(() => queryClient.invalidateQueries({ queryKey: ['workspace'] }))
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(screen.getByRole('region', { name: 'Context' }).querySelector('details')).toHaveAttribute('open')
  })

  it('a finding goes to the team thread once', async () => {
    renderRoutes(routes, '/t/th-brief')
    const intc = await screen.findByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    expect(intc).toHaveTextContent('7,000')
    const user = userEvent.setup()
    await user.click(within(intc).getByRole('button', { name: 'Take to team thread' }))
    expect(await within(intc).findByRole('status')).toHaveTextContent('Taken to Johnson Rebalance Review.')
    await user.click(within(intc).getByRole('button', { name: 'Take to team thread' }))
    await waitFor(() => expect(within(intc).getByRole('button', { name: 'Take to team thread' })).toBeEnabled())
    expect(store().messages.filter((m) => m.kind === 'carried')).toHaveLength(1)
  })

  it('the team thread shows the carried finding as a quoted card with who carried it', async () => {
    await carryIntc()
    renderRoutes(routes, '/t/th-johnson-review')
    const card = await screen.findByRole('article', { name: `Carried from the Brief: ${INTC_CLAIM}` })
    expect(card).toHaveTextContent('From the Brief · carried by Adrian Hale')
    expect(within(card).getByRole('link', { name: 'the Brief' })).toHaveAttribute('href', '/t/th-brief')
    const carried = within(card).getByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    expect(carried.querySelector('[data-status]')).toBeNull()
    expect(within(card).queryByRole('button', { name: 'Take to team thread' })).toBeNull()
  })

  it('names the brief without linking it for anyone but the person who carried it', async () => {
    await carryIntc()
    sessionStorage.setItem('ws-viewer', 'user-002')
    renderRoutes(routes, '/t/th-johnson-review')
    const card = await screen.findByRole('article', { name: `Carried from Adrian Hale's brief: ${INTC_CLAIM}` })
    expect(card).toHaveTextContent("From Adrian Hale's brief")
    expect(card).not.toHaveTextContent('carried by')
    expect(within(card).queryByRole('link')).toBeNull()
  })

  it('offers no team thread for a brief without a subject, even beside another thread without one', async () => {
    for (const t of store().threads.filter((t) => t.id === 'th-brief' || t.id === 'th-johnson-review')) delete t.subject
    renderRoutes(routes, '/t/th-brief')
    const intc = await screen.findByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    expect(within(intc).queryByRole('button', { name: 'Take to team thread' })).toBeNull()
  })

  it("offers the team thread at once; the meeting thread joins when the account's household arrives", async () => {
    let release: () => void = () => undefined
    const arrived = new Promise<void>((resolve) => { release = resolve })
    server.use(http.get('/api/custodian/accounts/:id', async () => { await arrived; await delay(0); return undefined }))
    renderRoutes(routes, '/t/th-brief')
    const intc = await screen.findByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    expect(await within(intc).findByRole('button', { name: 'Take to team thread' })).toBeInTheDocument()
    expect(within(intc).queryByRole('button', { name: 'Take to Johnson annual review' })).toBeNull()
    release()
    expect(await within(intc).findByRole('button', { name: 'Take to Johnson annual review' })).toBeInTheDocument()
  })
})
