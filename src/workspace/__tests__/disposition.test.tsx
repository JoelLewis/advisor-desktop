import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, draftLetter, reviseProposal, sendToParty, withdrawApproval } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'
import { JOHNSON_REASON } from '@/test/suitability-fixture'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const queue = () => within(screen.getByRole('navigation', { name: 'Supervision queue' }))

async function approved() {
  const detail = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  await approveProposal(ADRIAN, detail.id, 1, detail.versions[0]!.fingerprint, JOHNSON_REASON)
}
async function openItem(path: string, name: string) {
  renderRoutes(routes, path)
  const item = await screen.findByRole('region', { name })
  return { item, panel: within(item).getByRole('region', { name: 'Record a disposition' }) }
}

describe('recording a disposition', () => {
  it('Mark releases with a rationale, once, after confirming; focus goes to the new slip; the item moves to Closed today', async () => {
    await approved()
    viewAsOnLoad('cco-001')
    const { item, panel } = await openItem('/supervision/orders/prop-0001', 'Orders · Johnson rebalance · v1')
    const record = within(panel).getByRole('button', { name: 'Record disposition' })
    expect(record).toBeDisabled()
    expect(record).toHaveAccessibleDescription('Write a rationale to record the disposition.')
    const user = userEvent.setup()
    const rationale = within(panel).getByLabelText('Rationale (required)')
    await user.type(rationale, '   ')
    expect(record).toBeDisabled()
    await user.clear(rationale)
    await user.type(rationale, 'Legs, tax effect and pre-trade reading reviewed.')
    await user.click(record)
    const dialog = screen.getByRole('dialog', { name: 'Release orders?' })
    expect(dialog).toHaveTextContent("The staged orders are released and fill at the day's prices. The book moves.")
    expect(dialog).toHaveTextContent('Legs, tax effect and pre-trade reading reviewed.')
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    const slip = await within(item).findByRole('article', { name: 'Released the orders staged from v1 of the Johnson rebalance' })
    expect(slip).toHaveTextContent('Rationale · Legs, tax effect and pre-trade reading reviewed.')
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0002')))
    expect(store().acts.filter((a) => a.kind === 'release_orders')).toHaveLength(1)
    expect(queue().getByText("No orders are waiting. Today's are under Closed today.")).toBeInTheDocument()
    expect(queue().getByRole('link', { name: /^Release · Johnson rebalance · v1/ })).toBeInTheDocument()
    expect(item).toHaveTextContent('FILLED')
    expect(within(item).queryByRole('region', { name: 'Record a disposition' })).toBeNull()
  })

  it('the advisor reads the item but records nothing', async () => {
    await approved()
    const { panel } = await openItem('/supervision/orders/prop-0001', 'Orders · Johnson rebalance · v1')
    expect(panel).toHaveTextContent('Only compliance records a disposition.')
    expect(within(panel).queryByRole('button')).toBeNull()
  })

  it('a release against an approval withdrawn meanwhile shows the engine\'s reason and records nothing', async () => {
    await approved()
    viewAsOnLoad('cco-001')
    const { panel } = await openItem('/supervision/orders/prop-0001', 'Orders · Johnson rebalance · v1')
    const user = userEvent.setup()
    await user.type(within(panel).getByLabelText('Rationale (required)'), 'Reviewed.')
    await user.click(within(panel).getByRole('button', { name: 'Record disposition' }))
    await withdrawApproval(ADRIAN, 'prop-0001')
    await user.click(within(screen.getByRole('dialog', { name: 'Release orders?' })).getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The approval of v1 (REC-0001) was withdrawn by the advisor; nothing from it can be released.')
    expect(await screen.findByText('This item is not in the queue. It may have been disposed of on another day, withdrawn by the advisor, or never existed. This demo\'s state resets when the page reloads.')).toBeInTheDocument()
    expect(store().acts.some((a) => a.kind === 'release_orders')).toBe(false)
  })

  it('Mark approves the MSFT alert; the disposition joins its record trail', async () => {
    viewAsOnLoad('cco-001')
    const name = 'Alert · Single-name concentration — MSFT in Johnson Trust'
    const { item, panel } = await openItem('/supervision/alert/comp-002', name)
    const user = userEvent.setup()
    await user.type(within(panel).getByLabelText('Rationale (required)'), 'Long-held position; the IPS exception is documented.')
    await user.click(within(panel).getByRole('button', { name: 'Record disposition' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Approve?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(within(item).getByRole('list', { name: 'Record trail' })).toHaveTextContent('Approved'))
    expect(within(item).getByRole('list', { name: 'Reviewer notes' })).toHaveTextContent('sr-004')
    expect(queue().getByRole('link', { name: /^Alert closed · Single-name concentration — MSFT in Johnson Trust/ })).toBeInTheDocument()
  })

  it('a flagged letter stays in the queue, flagged, with only "Mark reviewed" left to choose', async () => {
    await approved()
    const draft = await draftLetter(ADRIAN, 'th-robert', 'prop-0001')
    const sent = await sendToParty(ADRIAN, draft.id)
    viewAsOnLoad('cco-001')
    const { item, panel } = await openItem(`/supervision/correspondence/${sent.messageId}`, 'Correspondence · Message to Robert Johnson')
    const user = userEvent.setup()
    await user.selectOptions(within(panel).getByLabelText('Disposition'), 'Flag for follow-up')
    await user.type(within(panel).getByLabelText('Rationale (required)'), 'Ask Adrian to confirm the look-back date.')
    await user.click(within(panel).getByRole('button', { name: 'Record disposition' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Flag for follow-up?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(item).toHaveTextContent('FLAGGED'))
    expect(queue().getByRole('link', { name: /^Message to Robert Johnson/ })).toBeInTheDocument()
    const options = within(within(item).getByRole('region', { name: 'Record a disposition' })).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Mark reviewed'])
  })
})

describe('refusals and limits', () => {
  it('a release against a newer approved version shows the engine\'s reason; nothing fills', async () => {
    await approved()
    viewAsOnLoad('cco-001')
    const { panel } = await openItem('/supervision/orders/prop-0001', 'Orders · Johnson rebalance · v1')
    const user = userEvent.setup()
    await user.type(within(panel).getByLabelText('Rationale (required)'), 'Reviewed.')
    await user.click(within(panel).getByRole('button', { name: 'Record disposition' }))
    await withdrawApproval(ADRIAN, 'prop-0001')
    const v2 = (await reviseProposal(ADRIAN, 'prop-0001', [{ kind: 'harvest_only' }])).versions[1]!
    await approveProposal(ADRIAN, 'prop-0001', 2, v2.fingerprint, JOHNSON_REASON)
    await user.click(within(screen.getByRole('dialog', { name: 'Release orders?' })).getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(store().acts.some((a) => a.kind === 'release_orders')).toBe(false)
  })

  it('a rationale over 2,000 characters is refused with the engine\'s reason', async () => {
    await approved()
    viewAsOnLoad('cco-001')
    const { panel } = await openItem('/supervision/orders/prop-0001', 'Orders · Johnson rebalance · v1')
    const user = userEvent.setup()
    await user.click(within(panel).getByLabelText('Rationale (required)'))
    await user.paste('x'.repeat(2001))
    await user.click(within(panel).getByRole('button', { name: 'Record disposition' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Release orders?' })).getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Keep the rationale to 2000 characters or fewer.')
    expect(store().acts.some((a) => a.kind === 'release_orders')).toBe(false)
  })

  it('a refusal is cleared by the next confirm and stays gone once that disposition is recorded', async () => {
    await approved()
    viewAsOnLoad('cco-001')
    const { item, panel } = await openItem('/supervision/orders/prop-0001', 'Orders · Johnson rebalance · v1')
    const user = userEvent.setup()
    const rationale = within(panel).getByLabelText('Rationale (required)')
    await user.click(rationale)
    await user.paste('x'.repeat(2001))
    await user.click(within(panel).getByRole('button', { name: 'Record disposition' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Release orders?' })).getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Keep the rationale to 2000 characters or fewer.')
    await user.clear(rationale)
    await user.type(rationale, 'Reviewed.')
    await user.click(within(panel).getByRole('button', { name: 'Record disposition' }))
    expect(screen.queryByRole('alert')).toBeNull()
    await user.click(within(screen.getByRole('dialog', { name: 'Release orders?' })).getByRole('button', { name: 'Confirm' }))
    await within(item).findByRole('article', { name: 'Released the orders staged from v1 of the Johnson rebalance' })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
