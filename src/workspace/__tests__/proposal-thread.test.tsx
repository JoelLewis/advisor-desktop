import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, reviseProposal, saveProposalVersion } from '@/services/workspace'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'

const ADRIAN = 'user-001'

async function openJohnson() {
  renderRoutes(routes, '/t/th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
  return screen.findByRole('region', { name: 'Proposal · Johnson rebalance' })
}

describe('the proposal in the team thread', () => {
  it('shows v1 as an embed: legs with pre-trade, tax readings, restrictions, drift before and after, and the workbench link', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const embed = await openJohnson()
    const legs = await within(embed).findByRole('table', { name: 'Proposal legs · v1' })
    expect(within(legs).getAllByRole('row')).toHaveLength(10)
    expect(within(legs).getByRole('row', { name: /^SPY/ })).toHaveTextContent('WARN')
    expect(within(embed).getByText('Est. tax added to the return')).toBeInTheDocument()
    expect(embed).toHaveTextContent('10,422')
    expect(embed).toHaveTextContent('no repurchase through 2026-03-27')
    expect(embed).toHaveTextContent('recorded · sale rs-001 of 2026-02-20 in acc-002')
    const drift = await within(embed).findByRole('table', { name: 'Drift before and after' })
    expect(drift).toHaveTextContent('Private Equity')
    expect(drift).toHaveTextContent('no market to sell into')
    expect(within(embed).getByRole('link', { name: 'Workbench' })).toHaveAttribute('href', '/proposals/prop-0001?from=th-johnson-review')
    expect(embed).toHaveTextContent('v1 is not approved')
    expect(embed).toHaveTextContent('Drafted a tax-aware rebalance toward the Growth model.')
  })

  it('a revision posts a version line and the embed moves to the latest version', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await reviseProposal(ADRIAN, 'prop-0001', [{ kind: 'harvest_only' }])
    const embed = await openJohnson()
    expect(await within(embed).findByRole('table', { name: 'Proposal legs · v2' })).toBeInTheDocument()
    const line = screen.getByRole('article', { name: 'v2 · Proposal Agent' })
    expect(line).toHaveTextContent('Revised to sell only lots at a loss.')
    expect(within(line).getByRole('link', { name: 'Open in the workbench' })).toHaveAttribute('href', '/proposals/prop-0001?from=th-johnson-review')
  })

  it('says the approval stays on the older version when a newer one arrives', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint)
    await reviseProposal(ADRIAN, created.id, [{ kind: 'harvest_only' }])
    const embed = await openJohnson()
    expect(await within(embed).findByText('Approval applies to v1; v2 is unapproved')).toBeInTheDocument()
  })

  it('names the author in the embed only for a person\'s version: the agent already heads it', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const { unmount } = renderRoutes(routes, '/t/th-johnson-review')
    const embed = await screen.findByRole('region', { name: 'Proposal · Johnson rebalance' })
    await within(embed).findByRole('table', { name: 'Proposal legs · v1' })
    expect(within(embed).getByText('v1')).toBeInTheDocument()
    expect(embed).not.toHaveTextContent('Proposal Agent')
    unmount()
    await saveProposalVersion(ADRIAN, 'prop-0001', [{ kind: 'exclude', symbol: 'SPY' }])
    const again = await openJohnson()
    expect(await within(again).findByText('v2 · Adrian Hale')).toBeInTheDocument()
  })

  it('shows each class\'s band before and after the trades', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const embed = await openJohnson()
    const drift = await within(embed).findByRole('table', { name: 'Drift before and after' })
    const bands = (name: RegExp) => [...within(drift).getByRole('row', { name }).querySelectorAll('[data-status]')].map((s) => s.getAttribute('data-status'))
    expect(bands(/^US Equity/)).toEqual(['OUT', 'IN'])
    expect(bands(/^Emerging Mkts/)).toEqual(['AT LIMIT', 'IN'])
    expect(bands(/^Private Equity/)).toEqual(['IN', 'IN'])
  })

  it("a released version's Before column is the drift it was built against, not the moved book", async () => {
    release(approvedV1())
    const embed = await openJohnson()
    const drift = await within(embed).findByRole('table', { name: 'Drift before and after' })
    const bands = (name: RegExp) => [...within(drift).getByRole('row', { name }).querySelectorAll('[data-status]')].map((s) => s.getAttribute('data-status'))
    expect(bands(/^US Equity/)).toEqual(['OUT', 'IN'])
  })
})
