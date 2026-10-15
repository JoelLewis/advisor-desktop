import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { advanceProspect, approveProspectProposal, createProspectProposal, deliverDisclosure, recordCoffee } from '@/services/workspace'

const ADRIAN = 'user-001'
const PELL = 'prsp-011'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

async function through() {
  await deliverDisclosure(ADRIAN, PELL, 'form_crs')
  await recordCoffee(ADRIAN, PELL, 'Coffee.')
  await advanceProspect(ADRIAN, PELL, 'reply')
  const p = await createProspectProposal(ADRIAN, PELL)
  await approveProspectProposal(ADRIAN, p.id, 1, p.versions[0]?.fingerprint ?? '', 'Growth fits her answers.')
}

describe('the prospect page', () => {
  afterEach(() => sessionStorage.clear())

  it('states her stage, disclosures, profile, transfer and versions, firm only', async () => {
    await through()
    renderRoutes(routes, '/prospects/prsp-011?from=th-pell')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dr. Amanda Pell' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(within(main).getByRole('note', { name: `Visibility: Larkfield team · Dr. Pell can't see this` })).toBeInTheDocument()
    expect(within(main).getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-pell')
    expect(within(main).getByRole('list', { name: 'Stage history' })).toHaveTextContent('Discovery')
    expect(within(main).getByRole('table', { name: 'Disclosures delivered' })).toHaveTextContent('REC-0001')
    expect(main).toHaveTextContent('Firm policy: before or at the first recommendation')
    expect(within(main).getByRole('table', { name: 'Disclosures delivered' })).toHaveTextContent(/ET/)
    expect(main).toHaveTextContent('Score 66 · Moderate Aggressive band (56–75) · Growth')
    expect(within(main).getByRole('table', { name: 'Transfer summary' })).toHaveTextContent('Stryker Corp. (SYK)')
    expect(within(main).getByRole('table', { name: 'Versions · Pell proposal' })).toHaveTextContent('Approved')
    expect(main).toHaveTextContent('Prices as of 25 Feb 2026 close.')
  })

  it('is not found for her and for Robert', async () => {
    for (const viewer of [PELL, 'cli-001']) {
      viewAsOnLoad(viewer)
      const { unmount } = renderRoutes(routes, '/prospects/prsp-011')
      expect(await screen.findByRole('heading', { level: 1, name: 'Prospect not found' })).toBeInTheDocument()
      unmount()
    }
  })

  it('both her threads open it from Full views', async () => {
    renderRoutes(routes, '/t/th-pell-work')
    const views = await screen.findByRole('region', { name: 'Full views' })
    expect(await within(views).findByRole('link', { name: /Dr\. Amanda Pell/ })).toHaveAttribute('href', '/prospects/prsp-011?from=th-pell-work')
  })
})
