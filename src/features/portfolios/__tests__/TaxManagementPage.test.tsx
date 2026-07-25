import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'
import { TaxManagementPage } from '../TaxManagementPage'

function renderPage(accountId: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/portfolios/accounts/:accountId/tax" element={<TaxManagementPage />} />
    </Routes>,
    { initialEntries: [`/portfolios/accounts/${accountId}/tax`] },
  )
}

// Fix-round-1 review, Important #1: `computeCostBasisImpact`, `isHarvestable`'s call-site wiring,
// the AvgCost gating and RATE_DISCLOSURE all previously had zero test coverage — the reviewer
// reverted the entire fix, left TaxManagementPage syntactically broken, and the suite still
// reported the identical 31-failure baseline. These render the real page against real fixture
// data (via MSW) to close that gap at the level nothing else was exercising. The last test also
// covers Important #3 (the FX-outage refetch loop).
describe('TaxManagementPage', () => {
  it('acc-044 (CHF): the harvest scanner uses the account\'s real baseCurrency at the call site, not a hardcoded USD', async () => {
    const user = userEvent.setup()
    renderPage('acc-044')
    await screen.findByText('Mueller CHF Conservative Account')

    await user.click(screen.getByRole('button', { name: 'Harvest scanner' }))

    // 6 of acc-044's 6 loss lots clear a US$1,000 threshold once CHF is converted to USD before
    // comparing (lot-pos-234-2 is CHF -980, i.e. ~-US$1,114 — genuinely harvestable). If the call
    // site regressed to a hardcoded 'USD' (or any non-CHF currency), `isHarvestable` would compare
    // the raw CHF figure as if it were already USD and reproduce the old currency-blind bug,
    // dropping this to 5.
    expect(await screen.findByText('6 opportunities')).toBeInTheDocument()

    // The rate disclosure renders alongside real opportunities, not just in isolation.
    expect(screen.getByText(/37% short-term, 23\.8% long-term/)).toBeInTheDocument()
  })

  it('acc-001 (specific_id): AvgCost is not offered as a cost-basis method', async () => {
    renderPage('acc-001')
    await screen.findByText('Johnson Family Trust')

    const select = screen.getByRole('combobox')
    expect(within(select).queryByRole('option', { name: 'AvgCost' })).not.toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'FIFO' })).toBeInTheDocument()
  })

  it('acc-004 (average_cost): AvgCost is offered as a cost-basis method', async () => {
    renderPage('acc-004')
    await screen.findByText('Patricia Johnson Roth IRA')

    const select = screen.getByRole('combobox')
    expect(within(select).getByRole('option', { name: 'AvgCost' })).toBeInTheDocument()
  })

  // Fix-round-1 review, Important #3: an earlier version of this fix gated the page's own
  // `isLoading` on `!fxReady`, and `useCurrencyConverter`'s `isReady` never becomes true once
  // React Query's retries are exhausted — an FX outage left the page on its loading skeleton
  // forever, before the isError branch ever got a chance to run. Worse: since the page tree
  // (including every per-lot `CurrencyValue`, each with its own FX observer) mounted and
  // unmounted with `isLoading`, and mounting a new observer on an errored query triggers React
  // Query's refetch-on-mount, that gate was a *self-sustaining refetch loop* — confirmed here by
  // forcing a real 500 from `/api/fx/rates` and asserting the page still settles instead of
  // spinning. FX readiness now only gates the harvest computation, never the page mount.
  it('renders the page (not stuck on a skeleton or a refetch loop) and explains itself when FX rates fail to load', async () => {
    server.use(
      http.get('/api/fx/rates', () => HttpResponse.json({ code: 'FX_DOWN', message: 'boom' }, { status: 500 })),
    )
    const user = userEvent.setup()
    renderPage('acc-001')

    // The account itself loaded fine — its own data is independent of FX — so the page must
    // render, not sit on the skeleton because a *different* query failed.
    expect(await screen.findByText('Johnson Family Trust')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Harvest scanner' }))
    expect(await screen.findByText(/Exchange rates are unavailable/)).toBeInTheDocument()
  })
})
