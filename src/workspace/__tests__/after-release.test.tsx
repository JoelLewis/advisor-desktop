import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, recordComplianceAct } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'
import { approvedStoryV3 } from '@/mocks/workspace/__tests__/story-fixture'
import type { Message } from '@/types/workspace'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const RELEASED = 'Released the orders staged from v1 of the Johnson rebalance'

async function approved() {
  const detail = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  const act = await approveProposal(ADRIAN, detail.id, 1, detail.versions[0]!.fingerprint)
  return { proposalId: detail.id, approvalActId: act.id, fingerprint: detail.versions[0]!.fingerprint }
}
async function releasedByMark() {
  const a = await approved()
  await recordComplianceAct('cco-001', { kind: 'release_orders', ...a, rationale: 'Reviewed the legs and the pre-trade reading.' })
  return a
}
async function openThread() {
  renderRoutes(routes, '/t/th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
  return inContext().findByRole('region', { name: 'Approval · Johnson rebalance' })
}

describe('the team thread after compliance releases', () => {
  it("shows Mark's slip with his rationale, then the fills; the approval panel reads Filled and offers nothing to approve", async () => {
    await releasedByMark()
    const panel = await openThread()
    const slip = await conversation().findByRole('article', { name: RELEASED })
    expect(slip).toHaveTextContent('Mark Davis, Compliance')
    expect(slip).toHaveTextContent('Rationale · Reviewed the legs and the pre-trade reading.')
    expect(slip).not.toHaveTextContent('presenter shortcut')
    const fills = conversation().getByRole('article', { name: 'Fills · Johnson rebalance v1' })
    expect(within(fills).getByRole('table', { name: 'Fills · v1' })).toBeInTheDocument()
    expect(panel).toHaveTextContent('v1 was released by compliance and filled')
    expect(panel).toHaveTextContent('Filled from v1 · released by REC-0002')
    expect(within(panel).getByRole('list', { name: 'Filled orders' })).toHaveTextContent('Sold 7,000 INTC at 28.45')
    expect(within(panel).queryByRole('button')).toBeNull()
    expect(conversation().queryByRole('button', { name: 'Revise' })).toBeNull()
  })

  it('the presenter shortcut releases as Mark, once, with the shortcut on the record, and focus goes to the slip', async () => {
    await approved()
    const panel = await openThread()
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('button', { name: 'Demo · act as Mark Davis' }))
    const dialog = screen.getByRole('dialog', { name: 'Release v1 as Mark Davis?' })
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    const slip = await inContext().findByRole('article', { name: RELEASED })
    expect(slip).toHaveTextContent('Mark Davis, Compliance')
    expect(slip).toHaveTextContent('Demo · recorded through the presenter shortcut by Adrian Hale')
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0002')))
    expect(store().acts.filter((a) => a.kind === 'release_orders')).toHaveLength(1)
  })

  it('announces the release and its fills', async () => {
    approvedStoryV3()
    renderRoutes(routes, '/t/th-johnson-review')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Demo · act as Mark Davis' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }))
    const fills = () => store().messages.find((m) => m.kind === 'fills')
    await waitFor(() => expect(fills()).toBeDefined())
    const count = fills()!.kind === 'fills' ? (fills() as Extract<Message, { kind: 'fills' }>).fills.length : 0
    await waitFor(() => expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent(`Released by Mark Davis; ${count} orders filled`))
  })

  it('Mark and Sarah see no shortcut', async () => {
    await approved()
    for (const viewer of ['cco-001', 'user-002']) {
      viewAsOnLoad(viewer)
      const { unmount } = renderRoutes(routes, '/t/th-johnson-review')
      await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
      const panel = await inContext().findByRole('region', { name: 'Approval · Johnson rebalance' })
      expect(within(panel).queryByRole('button', { name: 'Demo · act as Mark Davis' })).toBeNull()
      unmount()
    }
  })

  it('an escalation reads as such in the panel', async () => {
    const a = await approved()
    await recordComplianceAct('cco-001', { kind: 'escalate', ...a, rationale: 'Needs the investment committee.' })
    const panel = await openThread()
    expect(panel).toHaveTextContent('ESCALATED')
    expect(panel).toHaveTextContent('Held by compliance for further review.')
  })

  it('a filled proposal\'s workbench is closed; asking the Proposal Agent again drafts "Johnson rebalance 2"', async () => {
    await releasedByMark()
    const { unmount } = renderRoutes(routes, '/proposals/prop-0001?from=th-johnson-review')
    await screen.findByRole('heading', { level: 1, name: 'Johnson rebalance' })
    expect(screen.getByText('The orders from v1 were filled. This proposal is closed; ask the Proposal Agent for a new one from the moved book.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Draft version' })).toBeNull()
    unmount()
    await openThread()
    await userEvent.setup().click(inContext().getByRole('button', { name: 'Ask Proposal Agent' }))
    expect(await screen.findByRole('region', { name: 'Proposal · Johnson rebalance 2' })).toBeInTheDocument()
    expect(await inContext().findByText('Proposal Agent posted v1 in the thread.')).toBeInTheDocument()
  })
})

describe('the account view after the fills', () => {
  it('shows the moved holdings: no INTC, and the positions the fills opened', async () => {
    await releasedByMark()
    renderRoutes(routes, '/accounts/acc-002?from=th-johnson-review')
    const holdings = await screen.findByRole('table', { name: 'Holdings' })
    const symbols = within(holdings).getAllByRole('row').map((r) => r.querySelector('td')?.textContent)
    expect(symbols).not.toContain('INTC')
    expect(symbols).toContain('VWO')
  })

  it("the presenter's release lands focus on the release's record slip", async () => {
    approvedStoryV3()
    renderRoutes(routes, '/t/th-johnson-review')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Demo · act as Mark Davis' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }))
    const releaseAct = () => store().acts.find((a) => a.kind === 'release_orders')
    await waitFor(() => expect(releaseAct()).toBeDefined())
    await waitFor(() => expect(document.activeElement?.id).toBe(`act-${releaseAct()!.id}`))
  })
})
