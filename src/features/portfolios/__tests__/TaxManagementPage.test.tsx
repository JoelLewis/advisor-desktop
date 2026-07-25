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
  // `isLoading` on `!fxReady`. `useCurrencyConverter`'s `isReady` never becomes true once React
  // Query's retries are exhausted, so on a permanent FX outage `isLoading` stayed `true` forever
  // and the page never rendered anything at all — not the skeleton yielding to an error, just the
  // skeleton, permanently (see the corrected account of this in TaxManagementPage.tsx; a
  // fix-round-2 review found the original commit message and a code comment here had
  // mischaracterized this as a refetch loop, which is a real but *different* hazard that never
  // actually shipped). This forces a real 500 from `/api/fx/rates` and asserts the page still
  // settles instead of hanging.
  it('renders the page (not stuck on a skeleton) and explains itself when FX rates fail to load', async () => {
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

  // Fix-round-2 review, Important #1: `formatWithConversion` falls through to the raw value when
  // FX isn't ready, so an unconverted CHF figure quietly renders wearing a "$". Self-consistent
  // and therefore invisible without an explicit notice.
  describe('page-level FX-unavailable notice (fix-round-2 review, Important #1)', () => {
    it('acc-044 (CHF base, USD reporting): a banner discloses that figures are shown unconverted', async () => {
      server.use(
        http.get('/api/fx/rates', () => HttpResponse.json({ code: 'FX_DOWN', message: 'boom' }, { status: 500 })),
      )
      renderPage('acc-044')
      await screen.findByText('Mueller CHF Conservative Account')

      expect(await screen.findByText(/Exchange rates are unavailable/)).toBeInTheDocument()
      expect(screen.getByText(/shown in CHF/)).toBeInTheDocument()
      expect(screen.getByText(/not converted to USD/)).toBeInTheDocument()
    })

    it('acc-001 (USD base, USD reporting): no banner — an FX outage cannot mislabel a currency that was never converted', async () => {
      server.use(
        http.get('/api/fx/rates', () => HttpResponse.json({ code: 'FX_DOWN', message: 'boom' }, { status: 500 })),
      )
      renderPage('acc-001')
      await screen.findByText('Johnson Family Trust')

      expect(screen.queryByText(/Exchange rates are unavailable/)).not.toBeInTheDocument()
    })
  })

  // Fix-round-2 review, Important #2: failing open to `[]` is correct, but the summary card
  // rendered that as "$0.00 / 0 lots" — a confidently wrong zero standing in for "unknown," on
  // the page's default (lots) view, one click away from the tab that actually explains why.
  it('acc-044: the "Harvestable losses" card reads as unknown, not zero, while FX is unavailable', async () => {
    server.use(
      http.get('/api/fx/rates', () => HttpResponse.json({ code: 'FX_DOWN', message: 'boom' }, { status: 500 })),
    )
    renderPage('acc-044')
    await screen.findByText('Mueller CHF Conservative Account')

    await screen.findByText('Exchange rates unavailable')
    // Scoped to the card itself — "$0.00" legitimately appears elsewhere on this page (e.g. the
    // cost-basis impact table), so the assertion must be about *this* card, not the whole page.
    const harvestCard = screen.getByText('Harvestable losses').closest('div')!
    expect(within(harvestCard).getByText('—')).toBeInTheDocument()
    expect(within(harvestCard).getByText('Exchange rates unavailable')).toBeInTheDocument()
    expect(within(harvestCard).queryByText(/\$/)).not.toBeInTheDocument()
    expect(within(harvestCard).queryByText(/lots?$/)).not.toBeInTheDocument()
  })

  // Fix-round-2 review, Minor M2: `useCurrencyConverter` exposes `isReady` and `isError`
  // specifically so a caller can tell "still loading" apart from "never going to load" — the
  // harvest scanner's only caller had collapsed both into a single `fxUnavailable` boolean.
  // Holds the FX request open (never resolving) to force the transient "loading" state and
  // confirms it reads differently from the permanent "error" state exercised above.
  it('shows a "loading" message, not the "unavailable" one, while FX is still in flight', async () => {
    server.use(
      http.get('/api/fx/rates', () => new Promise(() => {})), // never resolves
    )
    const user = userEvent.setup()
    renderPage('acc-044')
    await screen.findByText('Mueller CHF Conservative Account')

    await user.click(screen.getByRole('button', { name: 'Harvest scanner' }))
    expect(await screen.findByText(/Loading exchange rates/)).toBeInTheDocument()
    // "Try again shortly" only appears in the harvest scanner's *error*-state copy — unlike the
    // page-level banner text, which (correctly) also renders during this transient loading
    // window, so it isn't a safe thing to assert absent here.
    expect(screen.queryByText(/Try again shortly/)).not.toBeInTheDocument()
  })
})
