import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http } from 'msw'
import { server } from '@/test/server'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'
import {
  advanceProspect, approveProspectProposal, createProspectProposal, deliverDisclosure, recordCoffee, reviseProspectProposal, sendProspectProposal,
} from '@/services/workspace'

const ADRIAN = 'user-001'
const PELL = 'prsp-011'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const inContext = () => within(screen.getByRole('complementary', { name: 'Details' }))
const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const embed = () => screen.findByRole('region', { name: 'Proposal · Pell proposal' })

async function replied() {
  await recordCoffee(ADRIAN, PELL, 'Coffee.')
  await advanceProspect(ADRIAN, PELL, 'reply')
}
async function openWork() {
  renderRoutes(routes, '/t/th-pell-work')
  await screen.findByRole('heading', { level: 1, name: 'Pell · prospect work' })
}

describe('the prospect work thread', () => {
  afterEach(() => sessionStorage.clear())

  it('the agents report here, and the Proposal Agent drafts v1 from them', async () => {
    const user = userEvent.setup()
    await replied()
    await openWork()
    expect(screen.getByRole('note', { name: `Visibility: Larkfield team · Dr. Pell can't see this` })).toBeInTheDocument()
    const ask = await inContext().findByRole('region', { name: 'Ask an agent' })
    await user.click(within(ask).getByRole('button', { name: 'Ask Prospect Profile' }))
    expect(await conversation().findByRole('article', { name: "Prospect Profile: Dr. Amanda Pell's answers average to a score in the moderate aggressive band." })).toHaveTextContent('66')
    await user.click(within(ask).getByRole('button', { name: 'Ask Transfer-In' }))
    expect(await conversation().findByRole('article', { name: /^Transfer-In: Stryker Corp\. is a concentrated position/ })).toHaveTextContent('481,378')
    await user.click(within(ask).getByRole('button', { name: 'Ask Proposal Agent' }))
    const proposal = await embed()
    expect(within(proposal).getByRole('table', { name: 'Transfer in kind · v1' })).toHaveTextContent('Stryker Corp. (SYK)')
    expect(within(proposal).getByRole('table', { name: 'Model against the transfer · v1' })).toHaveTextContent('US Equity')
    expect(proposal).toHaveTextContent('Growth · Moderate Aggressive · score 66')
    expect(proposal).toHaveTextContent('TIAA 403(b) · 900,000 USD · rollover: asked about; comparison to follow')
    expect(proposal).toHaveTextContent('Prices as of 25 Feb 2026 close.')
    expect(proposal).toHaveTextContent('state tax is not modeled')
    expect(proposal).toHaveTextContent('Not approved')
  })

  it('a revision documents the staged sale; the embed shows v2 with its tranches', async () => {
    const user = userEvent.setup()
    await replied()
    await createProspectProposal(ADRIAN, PELL)
    await openWork()
    const proposal = await embed()
    await user.click(within(proposal).getByRole('button', { name: 'Revise' }))
    const dialog = await screen.findByRole('dialog', { name: 'Revise the Pell proposal' })
    await user.selectOptions(within(dialog).getByLabelText('Staged sale of the concentrated stock'), '2')
    await user.click(within(dialog).getByRole('button', { name: 'Ask for v2' }))
    expect(await within(proposal).findByRole('table', { name: 'Staged sale option · v2' })).toHaveTextContent('2027')
    expect(conversation().getByRole('article', { name: 'v2 · Proposal Agent' })).toHaveTextContent('over two tax years')
  })

  it('approval waits for the attestation and the rationale, files the best-interest record, and opens the rollover follow-up', async () => {
    const user = userEvent.setup()
    await replied()
    await createProspectProposal(ADRIAN, PELL)
    await openWork()
    const approval = await inContext().findByRole('region', { name: 'Approval · Pell proposal' })
    expect(approval).toHaveTextContent('Balanced Growth')
    expect(approval).toHaveTextContent('Staying self-directed')
    expect(approval).toHaveTextContent("Best-interest record · draft, not yet filed · Larkfield team · Dr. Pell can't see this")
    expect(approval).toHaveTextContent('Rollover of the former employer 403(b): asked about; comparison to follow.')
    const approve = within(approval).getByRole('button', { name: 'Approve v1' })
    expect(approve).toBeDisabled()
    await user.click(within(approval).getByRole('checkbox', { name: 'I reviewed v1: its model, its transfer plan, its fees and the best-interest record.' }))
    await user.click(approve)
    const dialog = await screen.findByRole('dialog', { name: 'Approve v1 of the Pell proposal?' })
    expect(dialog).toHaveTextContent("the best-interest record is filed with it, and Dr. Pell can't see the record.")
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(approval).toHaveTextContent('v1 is approved'))
    expect(await within(approval).findByText(/filed with the approval/)).toHaveTextContent("Best-interest record · filed with the approval · Larkfield team · Dr. Pell can't see this")
    expect(store().acts.filter((a) => a.kind === 'approve_proposal')).toHaveLength(1)
    expect(store().acts[0]?.bestInterest?.rationale).toMatch(/^Growth/)
    // Approved on Thu 26 Feb (after her reply): five trading days later is Thu 5 Mar.
    expect(await inContext().findByRole('region', { name: 'Follow-up' })).toHaveTextContent('due 5 Mar 2026')
  })

  it('an approval of content that moved is refused, and says so', async () => {
    const user = userEvent.setup()
    await replied()
    const created = await createProspectProposal(ADRIAN, PELL)
    await openWork()
    const approval = await inContext().findByRole('region', { name: 'Approval · Pell proposal' })
    await user.click(within(approval).getByRole('checkbox', { name: /^I reviewed v1/ }))
    await user.click(within(approval).getByRole('button', { name: 'Approve v1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Approve v1 of the Pell proposal?' })
    await reviseProspectProposal(ADRIAN, PELL, created.id, [{ kind: 'stage_diversification', tranches: 2 }])
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('v2 is newer than v1; review v2 before approving.')
    expect(store().acts.filter((a) => a.kind === 'approve_proposal')).toHaveLength(0)
  })

  it('after her acceptance the checklist names owners, dues and states; ADV 2B is delivered from it', async () => {
    const user = userEvent.setup()
    await replied()
    const created = await createProspectProposal(ADRIAN, PELL)
    await approveProspectProposal(ADRIAN, created.id, 1, created.versions[0]?.fingerprint ?? '', 'Growth fits her answers.')
    await deliverDisclosure(ADRIAN, PELL, 'form_crs')
    await sendProspectProposal(ADRIAN, created.id)
    await advanceProspect(ADRIAN, PELL, 'acceptance')
    await openWork()
    const onboarding = await inContext().findByRole('region', { name: 'Onboarding' })
    const table = within(onboarding).getByRole('table', { name: 'Onboarding checklist' })
    expect(table).toHaveTextContent('CIP identity verification')
    expect(table).toHaveTextContent('Trusted contact (custodian account form, FINRA Rule 4512)')
    const acceptance = await within(onboarding).findByRole('article', { name: /accepted v1 of the Pell proposal/ })
    expect(acceptance).toHaveTextContent('Dr. Amanda Pell')
    expect(table).toHaveTextContent('Awaiting her signature')
    expect(table).toHaveTextContent('9 Mar 2026')
    expect(table).toHaveTextContent('Not started')
    await user.click(within(onboarding).getByRole('button', { name: 'Deliver ADV Part 2B' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Deliver ADV Part 2B to Dr. Amanda Pell?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(within(onboarding).queryByRole('button', { name: 'Deliver ADV Part 2B' })).toBeNull())
    expect(conversation().getByRole('article', { name: 'Onboarding opened' })).toBeInTheDocument()
  })

  it('Mark reads the approval\'s record but has no approve control', async () => {
    await replied()
    await createProspectProposal(ADRIAN, PELL)
    viewAsOnLoad('cco-001')
    await openWork()
    const approval = await inContext().findByRole('region', { name: 'Approval · Pell proposal' })
    expect(within(approval).queryByRole('button', { name: /^Approve/ })).toBeNull()
    expect(approval).toHaveTextContent('Staying self-directed')
  })

  it('after approval the approval shows the filed record with her rationale, not the live draft', async () => {
    const user = userEvent.setup()
    await replied()
    await createProspectProposal(ADRIAN, PELL)
    await openWork()
    const approval = await inContext().findByRole('region', { name: 'Approval · Pell proposal' })
    expect(approval).toHaveTextContent('draft, not yet filed')
    await user.click(within(approval).getByRole('checkbox', { name: /^I reviewed v1/ }))
    await user.click(within(approval).getByRole('button', { name: 'Approve v1' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Approve v1 of the Pell proposal?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(approval).toHaveTextContent('filed with the approval'))
    expect(approval).not.toHaveTextContent('draft, not yet filed')
    expect(approval).toHaveTextContent("Why, in the advisor's words: Growth matches her questionnaire")
  })

  it('while the approval\'s record is loading it says so, never "draft, not yet filed"', async () => {
    await replied()
    const created = await createProspectProposal(ADRIAN, PELL)
    await approveProspectProposal(ADRIAN, created.id, 1, created.versions[0]?.fingerprint ?? '', 'Growth fits her answers.')
    server.use(http.get('/api/workspace/acts', async () => { await delay('infinite') }))
    await openWork()
    const approval = await inContext().findByRole('region', { name: 'Approval · Pell proposal' })
    expect(within(approval).getByRole('status')).toHaveTextContent('Loading the filed best-interest record…')
    expect(approval).not.toHaveTextContent('draft, not yet filed')
  })

  it('Mark sees no Revise button on the proposal', async () => {
    await replied()
    await createProspectProposal(ADRIAN, PELL)
    viewAsOnLoad('cco-001')
    await openWork()
    const proposal = await embed()
    expect(within(proposal).queryByRole('button', { name: 'Revise' })).toBeNull()
  })

  it('Revise is gone once the proposal is sent', async () => {
    await replied()
    const created = await createProspectProposal(ADRIAN, PELL)
    await approveProspectProposal(ADRIAN, created.id, 1, created.versions[0]?.fingerprint ?? '', 'Growth fits her answers.')
    await deliverDisclosure(ADRIAN, PELL, 'form_crs')
    await sendProspectProposal(ADRIAN, created.id)
    await openWork()
    const proposal = await embed()
    expect(within(proposal).queryByRole('button', { name: 'Revise' })).toBeNull()
  })
})
