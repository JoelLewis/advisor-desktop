import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { createProposal, saveProposalVersion } from '@/services/workspace'

const contextColumn = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

async function openJohnson() {
  renderRoutes(routes, '/t/th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
  return contextColumn().findByRole('region', { name: 'Ask an agent' })
}

async function openReviseDialog() {
  const ask = await openJohnson()
  const user = userEvent.setup()
  await user.click(within(ask).getByRole('button', { name: 'Ask Proposal Agent' }))
  const embed = await screen.findByRole('region', { name: 'Proposal · Johnson rebalance' })
  await user.click(within(embed).getByRole('button', { name: 'Revise' }))
  const dialog = await screen.findByRole('dialog', { name: 'Revise the proposal' })
  return { user, ask, embed, dialog }
}

describe('asking and revising', () => {
  it('"Ask Proposal Agent" posts v1 once, even when clicked twice', async () => {
    const ask = await openJohnson()
    const user = userEvent.setup()
    await user.dblClick(within(ask).getByRole('button', { name: 'Ask Proposal Agent' }))
    expect(await screen.findByRole('region', { name: 'Proposal · Johnson rebalance' })).toBeInTheDocument()
    expect(within(ask).getByText(/Proposal Agent (posted v1 in the thread|has already drafted this proposal)/)).toBeInTheDocument()
    expect(store().proposals).toHaveLength(1)
    expect(store().messages.filter((m) => m.kind === 'proposal')).toHaveLength(1)
  })

  it('Revise offers the constraints; the agent posts v2 with a change summary', async () => {
    const { user, embed, dialog } = await openReviseDialog()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Cap realized gains' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Realized gains cap USD' }), '50,000')
    await user.click(within(dialog).getByRole('button', { name: 'Ask Proposal Agent to revise' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const line = await screen.findByRole('article', { name: 'v2 · Proposal Agent' })
    expect(line).toHaveTextContent('Revised to cap the gains it realizes.')
    expect(await within(embed).findByRole('table', { name: 'Proposal legs · v2' })).toBeInTheDocument()
  })

  it('offers to leave untouched only the classes the account holds, never cash, and states self-wash avoidance as fixed', async () => {
    const { dialog } = await openReviseDialog()
    const untouched = within(dialog).getByRole('combobox', { name: 'Leave untouched' })
    const offered = within(untouched).getAllByRole('option').map((o) => o.getAttribute('value') ?? '')
    const account = accounts.find((a) => a.id === 'acc-002')!
    const held = new Set<string>(getPositionsForAccount(account.id, account.totalValue).filter((p) => p.marketValue > 0).map((p) => p.assetClass))
    held.delete('cash')
    expect(offered[0]).toBe('')
    expect(new Set(offered.slice(1))).toEqual(held)
    expect(within(untouched).getByRole('option', { name: 'International Equity' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /wash/i })).toBeNull()
    expect(dialog).toHaveTextContent('Always on: no buy that would wash a loss the taxpayer has taken or this proposal takes.')
  })

  it('refuses a negative cap before asking the engine, on Enter, and moves focus to the field', async () => {
    const { user, dialog } = await openReviseDialog()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Cap realized gains' }))
    const cap = within(dialog).getByRole('textbox', { name: 'Realized gains cap USD' })
    await user.type(cap, '-5{Enter}')
    expect(cap).toHaveAccessibleDescription('Enter the cap as a dollar amount, zero or more.')
    expect(cap).toHaveFocus()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Harvest only: sell only lots at a loss' }))
    await user.click(within(dialog).getByRole('button', { name: 'Ask Proposal Agent to revise' }))
    await waitFor(() => expect(cap).toHaveFocus())
    expect(store().proposals[0]!.versions).toHaveLength(1)
  })

  it('says workbench edits on the latest version are not carried into the revision', async () => {
    await createProposal('user-001', 'th-johnson-review', 'acc-002')
    await saveProposalVersion('user-001', 'prop-0001', [{ kind: 'exclude', symbol: 'SPY' }])
    renderRoutes(routes, '/t/th-johnson-review')
    const embed = await screen.findByRole('region', { name: 'Proposal · Johnson rebalance' })
    await within(embed).findByRole('table', { name: 'Proposal legs · v2' })
    await userEvent.setup().click(within(embed).getByRole('button', { name: 'Revise' }))
    const dialog = await screen.findByRole('dialog', { name: 'Revise the proposal' })
    expect(dialog).toHaveTextContent('Edits made in v2 are not carried into the revision.')
  })

  it('stops saying v1 was posted once v2 is in the thread', async () => {
    const { user, ask, dialog } = await openReviseDialog()
    expect(within(ask).getByText('Proposal Agent posted v1 in the thread.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Harvest only: sell only lots at a loss' }))
    await user.click(within(dialog).getByRole('button', { name: 'Ask Proposal Agent to revise' }))
    await screen.findByRole('article', { name: 'v2 · Proposal Agent' })
    await waitFor(() => expect(within(ask).queryByText('Proposal Agent posted v1 in the thread.')).toBeNull())
  })

  it('says plainly when a revision changes nothing, without an error', async () => {
    const { user, dialog } = await openReviseDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Ask Proposal Agent to revise' }))
    expect(await within(dialog).findByRole('status')).toHaveTextContent('That changes nothing in the proposal.')
    expect(within(dialog).queryByRole('alert')).toBeNull()
    expect(store().proposals[0]!.versions).toHaveLength(1)
  })

  it('compliance reads the proposal but cannot ask or revise', async () => {
    await createProposal('user-001', 'th-johnson-review', 'acc-002')
    viewAsOnLoad('cco-001')
    renderRoutes(routes, '/t/th-johnson-review')
    const embed = await screen.findByRole('region', { name: 'Proposal · Johnson rebalance' })
    expect(await within(embed).findByRole('table', { name: 'Proposal legs · v1' })).toBeInTheDocument()
    expect(within(embed).queryByRole('button', { name: 'Revise' })).toBeNull()
    await contextColumn().findByRole('region', { name: 'Who can see' })
    expect(contextColumn().queryByRole('button', { name: 'Ask Proposal Agent' })).toBeNull()
  })
})
