import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const orders = () => screen.getByRole('table', { name: 'Orders' })

describe('the Blotter view', () => {
  afterEach(() => sessionStorage.clear())

  it('lists the order management tickets with their status, price and value', async () => {
    renderRoutes(routes, '/blotter')
    expect(await screen.findByRole('heading', { level: 1, name: 'Blotter' })).toBeInTheDocument()
    expect(within(orders()).getByRole('row', { name: /ord-003/ })).toHaveTextContent('WORKING')
    expect(within(orders()).getByRole('row', { name: /ord-003/ })).toHaveTextContent('785.00 USD limit')
    expect(within(orders()).getByRole('row', { name: /ord-003/ })).toHaveTextContent('24 Feb 16:31 ET')
    expect(within(orders()).getByRole('row', { name: /ord-003/ })).not.toHaveTextContent('pre-market')
    expect(within(orders()).getByRole('row', { name: /ord-001/ })).not.toHaveTextContent('pre-market')
    expect(within(orders()).getByRole('row', { name: /ord-014/ })).toHaveTextContent('47,600')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('REC is the binding act')
  })

  it('filters by status through the URL', async () => {
    const { router } = renderRoutes(routes, '/blotter')
    await screen.findByRole('heading', { level: 1, name: 'Blotter' })
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Canceled')
    await waitFor(() => expect(router.state.location.search).toBe('?status=canceled'))
    await waitFor(() => expect(within(orders()).getAllByRole('row').slice(1).map((r) => r.textContent)).toEqual([expect.stringContaining('ord-009')]))
  })

  it("shows the session's fills with their proposal, version, fill and the release's REC id", async () => {
    const releaseAct = release(approvedV1())
    renderRoutes(routes, '/blotter?accountId=acc-002&status=filled')
    await screen.findByRole('heading', { level: 1, name: 'Blotter' })
    const rows = within(orders()).getAllByRole('row').slice(1).filter((r) => r.textContent?.includes('Johnson rebalance v1'))
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row).toHaveTextContent('FILLED')
      expect(row, 'staged before the open on the event clock').toHaveTextContent('· pre-market')
      expect(row).toHaveTextContent(releaseAct.id)
      expect(within(row).getByRole('link', { name: 'Johnson rebalance v1' })).toHaveAttribute('href', '/t/th-johnson-review')
    }
  })

  it('is one step from the thread that released the orders', async () => {
    release(approvedV1())
    renderRoutes(routes, '/t/th-johnson-review')
    const links = await screen.findAllByRole('link', { name: 'Open in the blotter' })
    for (const link of links) expect(link).toHaveAttribute('href', '/blotter?accountId=acc-002&from=th-johnson-review')
  })

  it('takes an order to a team thread about its account', async () => {
    renderRoutes(routes, '/blotter')
    await screen.findByRole('heading', { level: 1, name: 'Blotter' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Share ord-001 to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Orders · Johnson Family Trust' })).toBeInTheDocument()
  })

  it('is not found for Robert', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/blotter')
    expect(await screen.findByRole('heading', { level: 1, name: 'Blotter not found' })).toBeInTheDocument()
  })
})
