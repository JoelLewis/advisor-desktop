import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { server } from '@/test/server'
import { routes } from '@/app/routes'
import { createTestQueryClient, renderRoutes } from '@/test/render'
import { approveProposal, createProposal, reviseProposal, saveProposalVersion } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'
import { JOHNSON_REASON } from '@/test/suitability-fixture'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const inContext = () => within(screen.getByRole('complementary', { name: 'Details' }))

async function openApproval(queryClient = createTestQueryClient()) {
  renderRoutes(routes, '/t/th-johnson-review', queryClient)
  await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
  return inContext().findByRole('region', { name: 'Approval · Johnson rebalance' })
}

describe('approving a proposal', () => {
  it('the advisor attests and approves v1 once, even on a double click; orders are staged pending compliance review', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const panel = await openApproval()
    const approve = within(panel).getByRole('button', { name: 'Approve v1' })
    expect(approve).toBeDisabled()
    expect(approve).toHaveAccessibleDescription('Confirm your review above to approve.')
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v1 and its pre-trade check results.' }))
    await user.dblClick(within(panel).getByRole('button', { name: 'Approve v1' }))
    const slip = await inContext().findByRole('article', { name: 'Approved v1 of the Johnson rebalance' })
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0001')))
    expect(slip).toHaveTextContent('Adrian Hale, Advisor')
    expect(store().acts).toHaveLength(1)
    const staged = await within(panel).findByRole('list', { name: 'Staged orders' })
    expect(within(panel).getByText('PENDING COMPLIANCE REVIEW')).toBeInTheDocument()
    expect(staged).toHaveTextContent('Sell 7,000 INTC')
    expect(within(panel).getByText('v1 is approved')).toBeInTheDocument()
    expect(within(panel).queryByRole('alert')).toBeNull()
  })

  it('a version the pre-trade check blocks cannot be approved, and says why', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await saveProposalVersion(ADRIAN, 'prop-0001', [{ kind: 'quantity', symbol: 'VWO', quantity: 100_000 }])
    const panel = await openApproval()
    await userEvent.setup().click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v2 and its pre-trade check results.' }))
    const approve = within(panel).getByRole('button', { name: 'Approve v2' })
    expect(approve).toBeDisabled()
    expect(approve).toHaveAccessibleDescription('The pre-trade check blocks this version, so it cannot be approved.')
    expect(within(panel).getAllByText('BLOCK').length).toBeGreaterThan(0)
  })

  it('a newer version leaves the approval on v1; approving v2 withdraws it in the same act', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint, JOHNSON_REASON)
    await reviseProposal(ADRIAN, created.id, [{ kind: 'harvest_only' }])
    const panel = await openApproval()
    expect(within(panel).getByText('Approval applies to v1; v2 is unapproved')).toBeInTheDocument()
    expect(within(panel).getByText('Staged from v1 · REC-0001')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v2 and its pre-trade check results.' }))
    await user.click(within(panel).getByRole('button', { name: 'Approve v2' }))
    expect(await inContext().findByRole('article', { name: 'Approved v2 of the Johnson rebalance; the approval of v1 is withdrawn' })).toBeInTheDocument()
    expect(await within(panel).findByText('Staged from v2 · REC-0002')).toBeInTheDocument()
    expect(within(panel).queryByText('Staged from v1 · REC-0001')).toBeNull()
  })

  it('a version that arrives after the panel rendered does not move the approval: v1 is approved and v2 is reported unapproved', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const panel = await openApproval()
    await reviseProposal(ADRIAN, created.id, [{ kind: 'harvest_only' }])
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v1 and its pre-trade check results.' }))
    await user.click(within(panel).getByRole('button', { name: 'Approve v1' }))
    expect(await within(panel).findByText('Approval applies to v1; v2 is unapproved')).toBeInTheDocument()
    expect(store().approvals.map((a) => [a.version, a.status])).toEqual([[1, 'active']])
  })

  it('the approver withdraws after confirming, once even on a double click; the staging goes with it', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint, JOHNSON_REASON)
    const panel = await openApproval()
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('button', { name: 'Withdraw the approval of v1' }))
    const confirm = await screen.findByRole('dialog', { name: 'Withdraw the approval of v1?' })
    expect(confirm).toHaveAccessibleDescription('The staged orders are withdrawn.')
    await user.dblClick(within(confirm).getByRole('button', { name: 'Confirm' }))
    expect(await inContext().findByRole('article', { name: 'Withdrew the approval of v1 of the Johnson rebalance' })).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0002')))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(store().acts).toHaveLength(2)
    await waitFor(() => expect(within(panel).queryByRole('list', { name: 'Staged orders' })).toBeNull())
    expect(within(panel).getByText('v1 is not approved')).toBeInTheDocument()
  })

  it('a withdrawal in flight cannot be dismissed; once it lands the slip takes focus and approving still works', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint, JOHNSON_REASON)
    let release = () => {}
    const gate = new Promise<void>((resolve) => { release = resolve })
    // Holds every act until released, then falls through to the real handler.
    server.use(http.post('/api/workspace/acts', async () => { await gate }))
    const panel = await openApproval()
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('button', { name: 'Withdraw the approval of v1' }))
    const confirm = await screen.findByRole('dialog', { name: 'Withdraw the approval of v1?' })
    await user.click(within(confirm).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(within(confirm).getByRole('button', { name: 'Confirm' })).toHaveAttribute('aria-disabled', 'true'))
    await user.keyboard('{Escape}')
    await user.click(within(confirm).getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('dialog', { name: 'Withdraw the approval of v1?' })).toBeInTheDocument()
    expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveAttribute('aria-disabled', 'true')
    release()
    // The page behind a modal dialog is hidden from the accessibility tree, so the dialog closes first.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await inContext().findByRole('article', { name: 'Withdrew the approval of v1 of the Johnson rebalance' })
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0002')))
    await user.click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v1 and its pre-trade check results.' }))
    await user.click(within(panel).getByRole('button', { name: 'Approve v1' }))
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0003')))
    expect(store().acts).toHaveLength(3)
    expect(within(panel).getByText('v1 is approved')).toBeInTheDocument()
  })

  it('canceling the withdrawal records nothing and keeps the approval', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint, JOHNSON_REASON)
    const panel = await openApproval()
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('button', { name: 'Withdraw the approval of v1' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(store().acts).toHaveLength(1)
    expect(within(panel).getByText('v1 is approved')).toBeInTheDocument()
    expect(document.activeElement).toBe(within(panel).getByRole('button', { name: 'Withdraw the approval of v1' }))
  })

  it('the review attests one version: a newer version arriving un-ticks it', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const queryClient = createTestQueryClient()
    const panel = await openApproval(queryClient)
    await userEvent.setup().click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v1 and its pre-trade check results.' }))
    expect(within(panel).getByRole('button', { name: 'Approve v1' })).toBeEnabled()
    await reviseProposal(ADRIAN, created.id, [{ kind: 'harvest_only' }])
    await queryClient.invalidateQueries()
    const box = await within(panel).findByRole('checkbox', { name: 'I reviewed every leg of v2 and its pre-trade check results.' })
    expect(box).not.toBeChecked()
    const approve = within(panel).getByRole('button', { name: 'Approve v2' })
    expect(approve).toBeDisabled()
    expect(approve).toHaveAccessibleDescription('Confirm your review above to approve.')
  })

  it('the pre-trade warnings sit under the attestation with the blocks', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const panel = await openApproval()
    const reading = within(panel).getByRole('list', { name: 'Pre-trade check results · v1' })
    expect(within(reading).getAllByText('WARN').length).toBeGreaterThan(0)
    expect(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v1 and its pre-trade check results.' })).toHaveAccessibleDescription([...reading.querySelectorAll('li')].map((li) => li.textContent).join(' '))
  })

  describe('the suitability reason', () => {
    const WHOLE = "Robert Johnson's accounts as a whole stay within tolerance (asset location)"
    const REVIEWED_V1 = 'I reviewed every leg of v1 and its pre-trade check results.'

    it("is chosen for the advisor where Robert Johnson's accounts as a whole stay within his tolerance, stating the figure, and the slip records it", async () => {
      await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
      const panel = await openApproval()
      const reasons = within(panel).getByRole('group', { name: 'Suitability reason' })
      expect(within(reasons).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['ips_permits_growth', 'client_acknowledged_risk', 'accounts_within_tolerance'])
      expect(within(reasons).getByRole('radio', { name: WHOLE })).toBeChecked()
      expect(reasons).toHaveAccessibleDescription("After this proposal, Robert Johnson's accounts as a whole sit at 46 pts, within Moderate, 41–55 pts.")
      expect(within(panel).queryByText('OUT')).toBeNull()
      const user = userEvent.setup()
      await user.click(within(panel).getByRole('checkbox', { name: REVIEWED_V1 }))
      await user.click(within(panel).getByRole('button', { name: 'Approve v1' }))
      const slip = await inContext().findByRole('article', { name: 'Approved v1 of the Johnson rebalance' })
      expect(slip).toHaveTextContent(`Suitability reason · ${WHOLE} · 46 pts after this proposal, within Moderate, 41–55 pts`)
      expect(store().approvals[0]!.suitability).toMatchObject({ reason: 'accounts_within_tolerance', clientName: 'Robert Johnson' })
    })

    it('another reason with a note can replace it', async () => {
      await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
      const panel = await openApproval()
      const user = userEvent.setup()
      await user.click(within(panel).getByRole('checkbox', { name: REVIEWED_V1 }))
      await user.click(within(panel).getByRole('radio', { name: 'The IPS permits a growth allocation for this account' }))
      expect(within(panel).getByRole('radio', { name: WHOLE })).not.toBeChecked()
      await user.type(within(panel).getByRole('textbox', { name: 'Note (optional)' }), 'IPS section 4.')
      await user.click(within(panel).getByRole('button', { name: 'Approve v1' }))
      const slip = await inContext().findByRole('article', { name: 'Approved v1 of the Johnson rebalance' })
      expect(slip).toHaveTextContent('Suitability reason · The IPS permits a growth allocation for this account · IPS section 4.')
    })

    it('a new version clears the chosen reason and the note', async () => {
      const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
      const queryClient = createTestQueryClient()
      const panel = await openApproval(queryClient)
      const user = userEvent.setup()
      await user.click(within(panel).getByRole('radio', { name: 'Client acknowledged the higher risk in writing' }))
      await user.type(within(panel).getByRole('textbox', { name: 'Note (optional)' }), 'Signed 12 Feb.')
      await reviseProposal(ADRIAN, created.id, [{ kind: 'harvest_only' }])
      await queryClient.invalidateQueries()
      await within(panel).findByRole('checkbox', { name: 'I reviewed every leg of v2 and its pre-trade check results.' })
      expect(within(panel).getByRole('radio', { name: WHOLE })).toBeChecked()
      expect(within(panel).getByRole('radio', { name: 'Client acknowledged the higher risk in writing' })).not.toBeChecked()
      expect(within(panel).getByRole('textbox', { name: 'Note (optional)' })).toHaveValue('')
    })

    it("where the client's accounts as a whole sit above the tolerance too, nothing is chosen, that reason cannot be chosen, and the warning is the stronger one", async () => {
      await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
      const v1 = store().proposals[0]!.versions[0]!
      v1.pretrade = {
        ...v1.pretrade,
        violations: v1.pretrade.violations.map((v) => (v.tolerance ? { ...v, tolerance: { ...v.tolerance, wholeAfterScore: 62, wholeAfterStatus: 'above' } } : v)),
      }
      const panel = await openApproval()
      const reasons = within(panel).getByRole('group', { name: 'Suitability reason' })
      expect(within(reasons).getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)).toHaveLength(0)
      expect(within(reasons).getByRole('radio', { name: WHOLE })).toBeDisabled()
      expect(reasons).toHaveAccessibleDescription(expect.stringContaining("After this proposal, Robert Johnson's accounts as a whole would sit above the tolerance too, at 62 pts against Moderate, 41–55 pts. No reason is chosen for you"))
      expect(within(panel).getByText('OUT')).toBeInTheDocument()
      await userEvent.setup().click(within(panel).getByRole('checkbox', { name: REVIEWED_V1 }))
      expect(within(panel).getByRole('button', { name: 'Approve v1' })).toHaveAccessibleDescription('Choose a suitability reason above to approve.')
    })
  })

  it.each(['cco-001', 'user-002', 'user-003'])('%s sees the approval and the staged orders, and no button', async (viewer) => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint, JOHNSON_REASON)
    viewAsOnLoad(viewer)
    const panel = await openApproval()
    expect(within(panel).getByText('PENDING COMPLIANCE REVIEW')).toBeInTheDocument()
    expect(within(panel).queryByRole('button')).toBeNull()
  })
})
