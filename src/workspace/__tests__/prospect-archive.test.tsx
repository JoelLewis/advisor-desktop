import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import {
  advanceProspect, approveProspectProposal, createProspectProposal, deliverDisclosure, recordCoffee, sendProspectProposal,
} from '@/services/workspace'

const ADRIAN = 'user-001'
const PELL = 'prsp-011'

async function sent() {
  await recordCoffee(ADRIAN, PELL, 'Coffee.')
  await advanceProspect(ADRIAN, PELL, 'reply')
  const p = await createProspectProposal(ADRIAN, PELL)
  await approveProspectProposal(ADRIAN, p.id, 1, p.versions[0]?.fingerprint ?? '', 'Growth fits her answers.')
  await deliverDisclosure(ADRIAN, PELL, 'form_crs')
  return sendProspectProposal(ADRIAN, p.id)
}

describe('Mark, on prospect work', () => {
  afterEach(() => sessionStorage.clear())

  it('the Archive filters by party and names her, with the presenter\'s path', async () => {
    await sent()
    await advanceProspect(ADRIAN, PELL, 'acceptance')
    sessionStorage.setItem('ws-viewer', 'cco-001')
    renderRoutes(routes, '/archive?partyId=prsp-011')
    const table = await screen.findByRole('table', { name: 'Archive' })
    expect(screen.getByLabelText('Client or prospect')).toHaveValue('prsp-011')
    expect(table).toHaveTextContent('Delivered Form CRS (client relationship summary) to Dr. Amanda Pell')
    expect(table).toHaveTextContent('Message to Dr. Amanda Pell')
    expect(table).toHaveTextContent('Dr. Amanda Pell accepted v1 of the Pell proposal')
    expect(table).toHaveTextContent('via a scripted clock jump')
  })

  it('Supervision shows the proposal as she received it, with where it came from', async () => {
    const act = await sent()
    sessionStorage.setItem('ws-viewer', 'cco-001')
    renderRoutes(routes, `/supervision/correspondence/${act.messageId ?? ''}`)
    const main = await screen.findByRole('main')
    expect(await within(main).findByRole('note', { name: 'Visibility: PROSPECT CAN SEE' })).toHaveTextContent('Dr. Amanda Pell')
    expect(main).toHaveTextContent('Dear Dr. Pell,')
    expect(main).toHaveTextContent('The approved v1 of the prospect proposal')
    expect(main).toHaveTextContent('delivered with Form ADV Part 2A (firm brochure)')
    const provenance = within(main).getByRole('heading', { name: 'Provenance' }).closest('section')
    if (!provenance) throw new Error('The Provenance heading sits outside its pane')
    expect(within(provenance).getByRole('note', { name: "Visibility: Firm only · prospect can't see" })).toBeInTheDocument()
  })
})
