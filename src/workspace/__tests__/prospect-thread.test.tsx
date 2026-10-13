import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'
import { PELL_REPLY } from '@/mocks/data/prospect-script'
import {
  advanceProspect, approveProspectProposal, createProspectProposal, deliverDisclosure, recordCoffee, reviseProspectProposal, sendProspectProposal,
} from '@/services/workspace'

const ADRIAN = 'user-001'
const PELL = 'prsp-011'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const section = (name: string) => inContext().findByRole('region', { name })

async function openHerThread() {
  renderRoutes(routes, '/t/th-pell')
  await screen.findByRole('heading', { level: 1, name: 'Dr. Amanda Pell' })
}
async function approvedV1() {
  await recordCoffee(ADRIAN, PELL, 'Coffee after the introduction.')
  await advanceProspect(ADRIAN, PELL, 'reply')
  const proposal = await createProspectProposal(ADRIAN, PELL)
  await approveProspectProposal(ADRIAN, proposal.id, 1, proposal.versions[0]?.fingerprint ?? '', 'Growth fits her answers.')
  return proposal
}
async function sentV1() {
  const proposal = await approvedV1()
  await deliverDisclosure(ADRIAN, PELL, 'form_crs')
  await sendProspectProposal(ADRIAN, proposal.id)
}

describe('her thread, for the firm', () => {
  afterEach(() => sessionStorage.clear())

  it('says where she stands and delivers Form CRS as a binding act, once, however fast the confirm is pressed', async () => {
    const user = userEvent.setup()
    await openHerThread()
    expect(await section('Prospect')).toHaveTextContent('Referred by James Thompson')
    const disclosures = await section('Disclosures')
    expect(within(disclosures).queryByRole('button', { name: 'Deliver ADV Part 2B' })).toBeNull()
    await user.click(within(disclosures).getByRole('button', { name: 'Deliver Form CRS' }))
    const dialog = await screen.findByRole('dialog', { name: 'Deliver Form CRS to Dr. Amanda Pell?' })
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(await conversation().findByRole('article', { name: 'Delivered · Form CRS (client relationship summary)' })).toBeInTheDocument()
    expect(store().acts.filter((a) => a.kind === 'deliver_disclosure')).toHaveLength(1)
    await waitFor(() => expect(within(disclosures).queryByRole('button', { name: 'Deliver Form CRS' })).toBeNull())
    expect(disclosures).toHaveTextContent(/Wed 25 Feb \d\d:\d\d ET · REC-0001/)
  })

  it('the advance waits for the coffee and says so; the presenter records the coffee and her reply arrives on Thursday', async () => {
    const user = userEvent.setup()
    await openHerThread()
    const clock = await section('Clock')
    const jump = within(clock).getByRole('button', { name: 'Advance to her reply · Thu 26 Feb 09:10 ET' })
    expect(jump).toBeDisabled()
    expect(jump).toHaveAccessibleDescription('Record the coffee first; her reply follows it.')
    await user.click(within(clock).getByRole('button', { name: 'Record the coffee' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record the coffee' })
    await user.click(within(dialog).getByRole('button', { name: 'Record' }))
    await waitFor(() => expect(clock).toHaveTextContent('Coffee recorded'))
    await user.dblClick(await within(clock).findByRole('button', { name: 'Advance to her reply · Thu 26 Feb 09:10 ET' }))
    expect(await conversation().findByText(PELL_REPLY)).toBeInTheDocument()
    expect(conversation().getByRole('article', { name: 'Dr. Amanda Pell · Answered the risk questionnaire.' })).toBeInTheDocument()
    expect(store().messages.filter((m) => m.kind === 'party_step')).toHaveLength(2)
    await waitFor(() => expect(within(clock).queryByRole('button', { name: /Advance to her reply/ })).toBeNull())
  })

  it('Sarah reads where she stands but neither delivers nor moves the clock nor acts as her', async () => {
    viewAsOnLoad('user-002')
    await openHerThread()
    await section('Disclosures')
    expect(inContext().queryByRole('button', { name: /^Deliver/ })).toBeNull()
    expect(inContext().queryByRole('button', { name: /^Advance/ })).toBeNull()
    expect(inContext().queryByRole('region', { name: 'Demo · act as Dr. Pell' })).toBeNull()
  })

  it('the presenter answers her questionnaire through the shortcut; it is recorded as her, marked', async () => {
    const user = userEvent.setup()
    await recordCoffee(ADRIAN, PELL, 'Coffee.')
    await openHerThread()
    const demo = await section('Demo · act as Dr. Pell')
    await user.click(within(demo).getByRole('button', { name: 'Answer her questionnaire' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Answer her questionnaire as Dr. Pell?' })).getByRole('button', { name: 'Confirm' }))
    expect(await conversation().findByRole('article', { name: 'Dr. Amanda Pell · Answered the risk questionnaire.' })).toBeInTheDocument()
    expect(store().prospects[0]?.steps[0]?.viaPresenter).toEqual({ presenterId: ADRIAN, path: 'shortcut' })
  })

  it('the send waits for Form CRS, then delivers ADV 2A in the same record, before the proposal', async () => {
    const user = userEvent.setup()
    await approvedV1()
    await openHerThread()
    const proposal = await section('Proposal')
    await user.click(within(proposal).getByRole('button', { name: 'Send v1 to Dr. Pell' }))
    let dialog = await screen.findByRole('dialog', { name: 'Send v1 to Dr. Pell?' })
    expect(dialog).toHaveTextContent('Deliver Form CRS first: it comes before or with the first recommendation.')
    expect(within(dialog).getByRole('button', { name: 'Confirm' })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(within(await section('Disclosures')).getByRole('button', { name: 'Deliver Form CRS' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Deliver Form CRS to Dr. Amanda Pell?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(within(proposal).getByRole('button', { name: 'Send v1 to Dr. Pell' })).toBeEnabled())
    await waitFor(() => expect(store().prospects[0]?.disclosures).toHaveLength(1))
    await user.click(within(proposal).getByRole('button', { name: 'Send v1 to Dr. Pell' }))
    dialog = await screen.findByRole('dialog', { name: 'Send v1 to Dr. Pell?' })
    expect(dialog).toHaveTextContent('Form ADV Part 2A (firm brochure) is delivered with it, in the same record.')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(await conversation().findByRole('article', { name: 'Delivered · Form ADV Part 2A (firm brochure)' })).toBeInTheDocument()
    expect(conversation().getByText(/^Dear Dr\. Pell,/)).toBeInTheDocument()
    await waitFor(() => expect(proposal).toHaveTextContent('Sent v1'))
  })
})

describe('her thread, for the firm, around the send and the acceptance', () => {
  afterEach(() => sessionStorage.clear())

  it('a version newer than the approved one blocks the send and says why', async () => {
    const user = userEvent.setup()
    const proposal = await approvedV1()
    await deliverDisclosure(ADRIAN, PELL, 'form_crs')
    await reviseProspectProposal(ADRIAN, PELL, proposal.id, [{ kind: 'stage_diversification', tranches: 2 }])
    await openHerThread()
    const proposalSection = await section('Proposal')
    await user.click(within(proposalSection).getByRole('button', { name: 'Send v1 to Dr. Pell' }))
    const dialog = await screen.findByRole('dialog', { name: 'Send v1 to Dr. Pell?' })
    expect(dialog).toHaveTextContent('v2 is newer than the approved v1; approve the version you mean to send.')
    expect(within(dialog).getByRole('button', { name: 'Confirm' })).toBeDisabled()
    expect(store().acts.filter((a) => a.kind === 'send_to_party')).toHaveLength(0)
  })

  it('the presenter accepts for her through the shortcut; it is recorded as her, marked, and the sent time reads Eastern', async () => {
    const user = userEvent.setup()
    await sentV1()
    await openHerThread()
    expect(await section('Proposal')).toHaveTextContent(/Sent v1 · REC-\d{4} · Thu 26 Feb \d\d:\d\d ET/)
    const demo = await section('Demo · act as Dr. Pell')
    await user.click(within(demo).getByRole('button', { name: 'Accept v1' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Accept v1 as Dr. Pell?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(store().acts.filter((a) => a.kind === 'accept_proposal')).toHaveLength(1))
    expect(store().acts.find((a) => a.kind === 'accept_proposal')).toMatchObject({ actorId: PELL, viaPresenter: { presenterId: ADRIAN, path: 'shortcut' } })
    await waitFor(async () => expect(await section('Proposal')).toHaveTextContent('Accepted v1'))
  })
})

describe('her thread, as she sees it', () => {
  afterEach(() => sessionStorage.clear())

  it('only her thread, her steps, her slips — nothing of the firm\'s', async () => {
    const user = userEvent.setup()
    await recordCoffee(ADRIAN, PELL, 'Coffee.')
    await deliverDisclosure(ADRIAN, PELL, 'form_crs')
    viewAsOnLoad(PELL)
    await openHerThread()
    expect(screen.getByRole('note', { name: 'Visibility: PROSPECT CAN SEE' })).toBeInTheDocument()
    const links = within(screen.getByRole('navigation', { name: 'Threads' })).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAccessibleName('Dr. Amanda Pell')
    const steps = await section('Your steps')
    await user.click(within(steps).getByRole('button', { name: 'Answer the questionnaire' }))
    expect(await conversation().findByRole('article', { name: 'Dr. Amanda Pell · Answered the risk questionnaire.' })).toBeInTheDocument()
    expect(store().prospects[0]?.steps[0]?.viaPresenter).toEqual({ presenterId: ADRIAN, path: 'view_as' })
    for (const name of ['Prospect', 'Disclosures', 'Clock', 'Proposal', 'Demo · act as Dr. Pell']) expect(inContext().queryByRole('region', { name })).toBeNull()
    expect(screen.getByRole('main').textContent).not.toMatch(/binding|Supervisory review|Mike Chen|Transfer-In|Prospect Profile|best-interest|prospect work/i)
    await waitFor(() => expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('Document from Adrian Hale'))
  })
  it('she accepts the proposal sent to her through a dialog; her acceptance is recorded as her, through View as', async () => {
    const user = userEvent.setup()
    await sentV1()
    viewAsOnLoad(PELL)
    await openHerThread()
    expect(within(screen.getByRole('navigation', { name: 'Threads' })).getByRole('heading', { name: 'Your conversation' })).toBeInTheDocument()
    const steps = await section('Your steps')
    await user.click(within(steps).getByRole('button', { name: 'Accept the proposal' }))
    const dialog = await screen.findByRole('dialog', { name: 'Accept the proposal?' })
    expect(dialog).toHaveTextContent('Your acceptance is recorded, and the firm opens your account paperwork.')
    await user.click(within(dialog).getByRole('button', { name: 'Accept' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Accept the proposal?' })).toBeNull())
    expect(store().acts.filter((a) => a.kind === 'accept_proposal')).toHaveLength(1)
    expect(store().acts.find((a) => a.kind === 'accept_proposal')).toMatchObject({ actorId: PELL, version: 1, viaPresenter: { presenterId: ADRIAN, path: 'view_as' } })
    await waitFor(() => expect(within(steps).queryByRole('button', { name: 'Accept the proposal' })).toBeNull())
    expect(screen.getByRole('main').textContent).not.toMatch(/viaPresenter|view_as|presenter|REC-\d{4}.*bestInterest/i)
  })
})
