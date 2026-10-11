import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { routes, routerFuture, providerFuture } from '@/app/routes'
import { createTestQueryClient } from '@/test/render'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path], future: routerFuture })
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} future={providerFuture} />
    </QueryClientProvider>,
  )
}

async function renderKitReady() {
  const view = renderAt('/kit')
  await waitFor(() => expect(view.container.querySelector('[data-kit-ready="true"]')).not.toBeNull(), { timeout: 4000 })
  return view
}

describe('routes', () => {
  it.each(['/', '/no-such-page'])('%s renders exactly one h1', async (path) => {
    renderAt(path)
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
  it('/kit renders exactly one h1 once ready', async () => {
    await renderKitReady()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
  it('the kit is not ready while loading', () => {
    const { container } = renderAt('/kit')
    expect(container.querySelector('[data-kit-ready="true"]')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Loading the account from the engine…')
  })
  it('the kit becomes ready on acc-002 data', async () => {
    await renderKitReady()
    const readings = screen.getByRole('heading', { name: 'Readings' }).closest('section')
    expect(readings).not.toBeNull()
    expect(within(readings as HTMLElement).getByText('Robert Johnson Individual')).toBeTruthy()
  })
  it('shows all three visibility bands', async () => {
    await renderKitReady()
    for (const w of ['Only you', "Firm only · client can't see", 'CLIENT CAN SEE']) {
      expect(screen.getAllByText(w).length).toBeGreaterThanOrEqual(2)
    }
  })
  it('records: the approval is a real engine record, the preview awaits a signature', async () => {
    await renderKitReady()
    const records = screen.getByRole('heading', { name: 'Records' }).closest('section') as HTMLElement
    const r = within(records)
    expect(r.getByText('AWAITING YOUR SIGNATURE')).toBeInTheDocument()
    expect(r.getByText('APPROVED')).toBeInTheDocument()
    expect(r.getAllByText('Mark Davis').length).toBeGreaterThanOrEqual(1)
    expect(r.getByText('sr-002')).toBeInTheDocument()
    expect(r.getAllByText('2026-02-21 14:10 UTC').length).toBeGreaterThanOrEqual(2)
    expect(r.getByRole('article', { name: 'Potential wash sale cleared — Johnson INTC/SMH' })).toBeInTheDocument()
    expect(records).not.toHaveTextContent('Advisor of record')
    expect(records).not.toHaveTextContent('REC-EXAMPLE')
  })
  it('the cash line has no share count or price', async () => {
    await renderKitReady()
    const holdings = screen.getByRole('table', { name: 'Holdings' })
    const cash = within(holdings).getByRole('cell', { name: 'CASH' }).closest('tr') as HTMLElement
    const cells = within(cash).getAllByRole('cell')
    expect(cells[1]).toHaveTextContent('—')
    expect(cells[2]).toHaveTextContent('—')
    expect(cash).toHaveTextContent('225,504')
    expect(cash).not.toHaveTextContent('225,504.00')
  })
  it('the footnote the tax figure points to is on the page', async () => {
    await renderKitReady()
    const fig = screen.getByRole('group', { name: /^\$/ })
    expect(fig).toHaveAccessibleDescription(/^Source: Rebalance preview · estimated tax/)
    expect(screen.getByText(/^Source: Rebalance preview · estimated tax for Robert Johnson Individual/)).toBeInTheDocument()
  })
  it('the max drift reading and its gauge agree on status, and every gauge shares one scale', async () => {
    const { container } = await renderKitReady()
    const readings = screen.getByRole('heading', { name: 'Readings' }).closest('section') as HTMLElement
    const label = within(readings).getByText(/^Max drift · /).textContent!.replace('Max drift · ', '')
    const readingStatus = readings.querySelector('[data-status]')!.getAttribute('data-status')
    const gauge = within(screen.getByRole('heading', { name: 'Drift against model' }).closest('section') as HTMLElement)
      .getByText(label, { selector: '[data-part="label"]' }).parentElement as HTMLElement
    expect(gauge.querySelector('[data-status]')!.getAttribute('data-status')).toBe(readingStatus)
    const widths = [...container.querySelectorAll('svg[role="img"] > rect:not([data-part])')]
      .filter((r) => r.closest('svg')!.getAttribute('width') === '200').map((r) => r.getAttribute('width'))
    expect(widths.length).toBeGreaterThan(1)
    expect(new Set(widths).size).toBe(1)
  })
  it('sets every loss in the result columns heavier', async () => {
    await renderKitReady()
    const losses = screen.getAllByText(/^−/, { selector: 'td span' })
    expect(losses.length).toBeGreaterThan(0)
    for (const loss of losses) expect(loss).toHaveClass('font-semibold')
  })
  it('the key legend shows the gallery\'s own jump key', async () => {
    await renderKitReady()
    const legend = screen.getByRole('contentinfo')
    expect(within(legend).getByText('t')).toBeInTheDocument()
    expect(within(legend).getByText('Cycle theme')).toBeInTheDocument()
  })
})
