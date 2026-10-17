import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'
import type { BindingAct, Message } from '@/types/workspace'

const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

const DELIVERY: BindingAct = { id: 'REC-0001', kind: 'deliver_disclosure', actorId: 'user-001', at: '2026-02-25T12:09:00.000Z', threadId: 'th-pell',
  subject: { type: 'prospect', id: 'prsp-011' }, fingerprint: 'AAAAAAAA', summary: 'Delivered Form CRS (client relationship summary) to Dr. Amanda Pell', delivers: ['form_crs'] }
const HERS: Message[] = [
  { kind: 'disclosure_delivered', id: 'msg-t1', threadId: 'th-pell', at: '2026-02-25T12:09:00.000Z', prospectId: 'prsp-011', document: 'form_crs', actId: 'REC-0001' },
  { kind: 'act', id: 'msg-t2', threadId: 'th-pell', at: '2026-02-25T12:10:00.000Z', actId: 'REC-0001' },
  { kind: 'party_step', id: 'msg-t3', threadId: 'th-pell', at: '2026-02-26T14:11:00.000Z', authorId: 'prsp-011', step: 'questionnaire', summary: 'Answered the risk questionnaire.' },
]
const WORK: Message[] = [
  { kind: 'prospect_note', id: 'msg-t4', threadId: 'th-pell-work', at: '2026-02-25T21:30:00.000Z', authorId: 'user-001', prospectId: 'prsp-011', eventId: 'evt-004',
    title: 'Coffee with Dr. Amanda Pell', start: '2026-02-25T20:30:00.000Z', end: '2026-02-25T21:30:00.000Z', body: 'She asked about the old 403(b).' },
  { kind: 'prospect_proposal_version', id: 'msg-t5', threadId: 'th-pell-work', at: '2026-02-26T14:20:00.000Z', proposalId: 'pprop-0001', version: 2,
    author: { kind: 'agent', agentId: 'proposal' }, changeSummary: 'Documented a phased sale of Stryker Corp. over two tax years; nothing sold.' },
  { kind: 'onboarding_opened', id: 'msg-t6', threadId: 'th-pell-work', at: '2026-03-02T15:02:00.000Z', prospectId: 'prsp-011', acceptanceActId: 'REC-0009',
    items: [{ id: 'ofac', label: 'OFAC screen', status: 'open', ownerId: 'user-002', due: '2026-03-03' }, { id: 'acat', label: 'ACAT transfer', status: 'not_started', ownerId: 'user-002' }] },
]

describe('prospect messages', () => {
  afterEach(() => sessionStorage.clear())

  it("the Brief's Today opens her thread, whose band names the prospect", async () => {
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, '/t/th-brief')
    const link = within(await screen.findByRole('region', { name: 'Today' })).getByRole('link', { name: 'Open her thread' })
    expect(link.closest('li')).toHaveTextContent('15:30 ETCoffee with Dr. Amanda Pell · Form CRS due before it (firm policy)')
    await user.click(link)
    await waitFor(() => expect(router.state.location.pathname).toBe('/t/th-pell'))
    expect(await screen.findByRole('note', { name: 'Visibility: Dr. Amanda Pell can read this' })).toHaveTextContent('Dr. Amanda Pell')
    expect(conversation().getByText('James Thompson suggested I get in touch. Looking forward to coffee this afternoon.')).toBeInTheDocument()
  })

  it('her thread shows a delivered document, its slip in her own terms, and her step', async () => {
    store().acts.push(DELIVERY)
    store().messages.push(...HERS)
    viewAsOnLoad('prsp-011')
    renderRoutes(routes, '/t/th-pell')
    await screen.findByRole('list', { name: 'Messages' })
    expect(await conversation().findByRole('article', { name: 'Delivered · Form CRS (client relationship summary)' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('Document from Adrian Hale'))
    expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('Form CRS (client relationship summary) delivered to you')
    expect(conversation().getByRole('article', { name: 'Dr. Amanda Pell · Answered the risk questionnaire.' })).toHaveTextContent('Prospect')
    expect(screen.getByRole('main').textContent).not.toMatch(/binding|Supervisory review/)
  })

  it('the internal thread shows the coffee note, a version line and the onboarding items', async () => {
    store().messages.push(...WORK)
    renderRoutes(routes, '/t/th-pell-work')
    expect(await screen.findByRole('note', { name: `Visibility: Larkfield team · Dr. Pell can't see this` })).toBeInTheDocument()
    expect(await conversation().findByRole('article', { name: 'Note · Coffee with Dr. Amanda Pell' })).toHaveTextContent('15:30–16:30 ET')
    expect(conversation().getByRole('article', { name: 'v2 · Proposal Agent' })).toHaveTextContent('nothing sold')
    const onboarding = conversation().getByRole('article', { name: 'Onboarding opened' })
    expect(within(onboarding).getByRole('list', { name: 'Onboarding items' })).toHaveTextContent('OFAC screen')
    expect(onboarding).toHaveTextContent('Sarah Mitchell')
    expect(onboarding).toHaveTextContent('due 3 Mar 2026')
    expect(onboarding).toHaveTextContent('Not started')
  })
})
