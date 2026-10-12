import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { carryFinding } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const INTC_CLAIM = 'Intel Corp. can be sold at a loss today, and nothing bought in the last thirty days would wash the loss.'

async function carryIntc() {
  const finding = store().messages.find((m) => m.kind === 'agent_finding' && m.agentId === 'harvest-scanner')!
  await carryFinding('user-001', 'th-brief', finding.id, 'th-johnson-review')
}

describe('the Brief', () => {
  it('opens ready with its ranked summary; a finding goes to the team thread once', async () => {
    renderRoutes(routes, '/t/th-brief')
    await screen.findByRole('heading', { level: 1, name: 'Brief' })
    const summary = await screen.findByRole('region', { name: 'Ranked summary' })
    const items = within(summary).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('US Equity is outside its tolerance band.')
    expect(items[1]).toHaveTextContent(INTC_CLAIM)
    const user = userEvent.setup()
    await user.click(within(items[1]!).getByRole('button', { name: INTC_CLAIM }))
    const intc = screen.getByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    await waitFor(() => expect(document.activeElement).toBe(intc))
    expect(intc).toHaveTextContent('7,000')
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
    expect(within(card).getByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })).toBeInTheDocument()
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
})
