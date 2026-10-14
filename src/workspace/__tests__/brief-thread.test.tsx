import { describe, it, expect } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http } from 'msw'
import { server } from '@/test/server'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { carryFinding } from '@/services/workspace'
import { advanceClockTo, store } from '@/mocks/data/workspace-store'
import { minuteOf } from '@/lib/clock'

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

  it('a finding goes to the team thread through the Take to menu, once; Escape closes the menu and returns focus', async () => {
    renderRoutes(routes, '/t/th-brief')
    const intc = await screen.findByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    expect(intc).toHaveTextContent('7,000')
    expect(intc).not.toHaveTextContent(/may (not )?measure/i)
    const user = userEvent.setup()
    const toggle = within(intc).getByRole('button', { name: 'Take to' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const menu = within(intc).getByRole('list', { name: 'Take to' })
    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
    await user.click(toggle)
    await user.click(within(within(intc).getByRole('list', { name: 'Take to' })).getByRole('button', { name: 'Johnson Rebalance Review' }))
    expect(await within(intc).findByRole('status')).toHaveTextContent('Taken to Johnson Rebalance Review.')
    expect(menu).not.toBeInTheDocument()
    expect(within(intc).queryByRole('list', { name: 'Take to' })).toBeNull()
    expect(store().messages.filter((m) => m.kind === 'carried')).toHaveLength(1)
  })

  it('the Take to menu opens and moves with the arrow keys', async () => {
    renderRoutes(routes, '/t/th-brief')
    const intc = await screen.findByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    const user = userEvent.setup()
    const toggle = await within(intc).findByRole('button', { name: 'Take to' })
    toggle.focus()
    await user.keyboard('{ArrowDown}')
    const menu = within(intc).getByRole('list', { name: 'Take to' })
    await waitFor(() => expect(within(menu).getAllByRole('button')).toHaveLength(2))
    const [first, second] = within(menu).getAllByRole('button')
    expect(first).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(second).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(first).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(toggle).toHaveFocus()
  })

  it('the team thread shows the carried finding as a quoted card with who carried it', async () => {
    await carryIntc()
    renderRoutes(routes, '/t/th-johnson-review')
    const card = await screen.findByRole('article', { name: `Carried from the Brief: ${INTC_CLAIM}` })
    expect(card).toHaveTextContent('From the Brief · carried by Adrian Hale')
    expect(within(card).getByRole('link', { name: 'the Brief' })).toHaveAttribute('href', '/t/th-brief')
    const carried = within(card).getByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    expect(carried.querySelector('[data-status]')).toBeNull()
    expect(within(card).queryByRole('button', { name: 'Take to' })).toBeNull()
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
    expect(within(intc).queryByRole('button', { name: 'Take to' })).toBeNull()
  })

  it("offers the team thread at once; the meeting thread joins when the account's household arrives", async () => {
    let release: () => void = () => undefined
    const arrived = new Promise<void>((resolve) => { release = resolve })
    server.use(http.get('/api/custodian/accounts/:id', async () => { await arrived; await delay(0); return undefined }))
    renderRoutes(routes, '/t/th-brief')
    const intc = await screen.findByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    await userEvent.setup().click(await within(intc).findByRole('button', { name: 'Take to' }))
    const menu = within(intc).getByRole('list', { name: 'Take to' })
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(['Johnson Rebalance Review'])
    release()
    await waitFor(() => expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(['Johnson Rebalance Review', 'Johnson annual review']))
  })

  it('leads with Today: the meeting and the coffee at their Eastern times, the open break, each with its action', async () => {
    renderRoutes(routes, '/t/th-brief')
    const today = await screen.findByRole('region', { name: 'Today' })
    const rows = within(today).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      '14:00–15:15 ETJohnson annual review · scheduledOpen the meeting thread',
      '15:30 ETCoffee with Dr. Amanda Pell · Form CRS due before it (firm policy)Open her thread',
      'Reconciliation · 1 open breakOpen reconciliation',
    ])
    expect(within(rows[0]!).getByRole('link', { name: 'Open the meeting thread' })).toHaveAttribute('href', '/t/th-johnson-meeting')
    expect(within(rows[1]!).getByRole('link', { name: 'Open her thread' })).toHaveAttribute('href', '/t/th-pell')
    const order = [today, screen.getByRole('region', { name: 'Needs a decision' })]
    expect(order[0]!.compareDocumentPosition(order[1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('dates a line that is not on the session\'s day', async () => {
    advanceClockTo(minuteOf('2026-02-26T14:10:00Z'))
    renderRoutes(routes, '/t/th-brief')
    const today = await screen.findByRole('region', { name: 'Today' })
    expect(today).toHaveTextContent('25 Feb 14:00–15:15 ET')
  })
})
