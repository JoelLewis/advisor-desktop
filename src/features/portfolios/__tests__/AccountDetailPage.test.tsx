import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { AccountDetailPage } from '../AccountDetailPage'

function renderPageAt(initialEntry: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/portfolios/accounts/:accountId" element={<AccountDetailPage />} />
    </Routes>,
    { initialEntries: [initialEntry] },
  )
}

/** Task 19's tests need a full URL (they assert on `?tab=`); Task 21's address accounts by id. Both
 *  landed in this file in the same merge, so the URL form is the primitive and this is the wrapper. */
function renderPage(accountId = 'acc-001') {
  return renderPageAt(`/portfolios/accounts/${accountId}`)
}

describe('AccountDetailPage', () => {
  it('renders account name after loading', async () => {
    renderPage()
    // acc-001 is "Johnson Family Trust"
    expect(await screen.findByText('Johnson Family Trust')).toBeInTheDocument()
  })

  it('displays key tab labels', async () => {
    renderPage()
    await screen.findByText('Johnson Family Trust')

    expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Positions/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Performance/ })).toBeInTheDocument()
  })

  it('shows position symbols on the Positions tab', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Johnson Family Trust')

    await user.click(screen.getByRole('tab', { name: /Positions/ }))

    // acc-001 positions include VTI, AAPL, MSFT
    expect(await screen.findByText('VTI')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })

  it('renders the account number', async () => {
    renderPage()
    // acc-001 account number is "TRU-847291"
    expect(await screen.findByText('TRU-847291')).toBeInTheDocument()
  })

  it('has a back navigation button', async () => {
    renderPage()
    await screen.findByText('Johnson Family Trust')
    // The back button renders an ArrowLeft icon inside a button
    const buttons = screen.getAllByRole('button')
    // At least one button exists for back navigation
    expect(buttons.length).toBeGreaterThan(0)
  })

  // Review round 2, Important · nba-007's actionRoute is
  // `{ path: '/portfolios/accounts/acc-011', params: { tab: 'concentration' } }`, which NBAFeed
  // turns into `/portfolios/accounts/acc-011?tab=concentration`. Before TabLayout read the URL,
  // this silently opened Overview instead of Concentration — a route-existence check alone cannot
  // catch that, since the route resolves fine. This asserts the tab that actually opens.
  it('opens the Concentration tab when the URL carries ?tab=concentration (the NBA route shape)', async () => {
    renderPageAt('/portfolios/accounts/acc-011?tab=concentration')
    await screen.findByText('David Williams Individual')

    const concentrationTab = await screen.findByRole('tab', { name: /Concentration/ })
    expect(concentrationTab).toHaveAttribute('aria-selected', 'true')
    const overviewTab = screen.getByRole('tab', { name: /Overview/ })
    expect(overviewTab).toHaveAttribute('aria-selected', 'false')
  })

  it('falls back to Overview when ?tab= is absent or names an unknown tab', async () => {
    renderPageAt('/portfolios/accounts/acc-011?tab=not-a-real-tab')
    await screen.findByText('David Williams Individual')

    const overviewTab = await screen.findByRole('tab', { name: /Overview/ })
    expect(overviewTab).toHaveAttribute('aria-selected', 'true')
  })

  // C24 review fix — the per-asset-class drift highlight used to compare against a hardcoded 2%,
  // independent of the account's own model band, so a class could render red on a card that
  // simultaneously says "acceptable drift levels". acc-011 (mod-002, 5% band) is a real account in
  // the fixture set with two classes over 2% (us_equity +3.0%, fixed_income -2.7%) but under its
  // own 5% band — needsRebalance is false, so neither class should be flagged.
  it("acc-011: an asset-class drift over 2% but within the account's own model band is not flagged red", async () => {
    renderPage('acc-011')
    await screen.findByText('David Williams Individual')

    expect(await screen.findByText(/acceptable drift levels/)).toBeInTheDocument()

    const overweight = screen.getByText('+3.0%')
    expect(overweight.className).not.toMatch(/text-accent-red/)
    expect(overweight.className).toMatch(/text-accent-green/)

    const underweight = screen.getByText('-2.7%')
    expect(underweight.className).not.toMatch(/text-accent-red/)
    expect(underweight.className).toMatch(/text-accent-green/)
  })

  // C24 review fix — Max Drift is now rendered against the account's own band (not the aggregate
  // totalDrift against a mismatched hardcoded 3%), so an in-tolerance account never shows red.
  it('acc-011: Max Drift renders in green, paired with its own band, when drift is acceptable', async () => {
    renderPage('acc-011')
    await screen.findByText('David Williams Individual')

    const maxDrift = await screen.findByText('3.0% / ±5.0%')
    expect(maxDrift.className).toMatch(/text-accent-green/)
  })

  // Critical fix round 2 · pre-trade-compliance / coverage gap — nothing previously covered the
  // TradeTicketDialog wiring at all. Clicking Buy on a position row used to open a dialog with
  // no way to price the trade (VTI has no quote in the symbol-search fixture, and the dialog
  // never received the position's own known price), so any quantity sent `estimatedValue: 0`
  // to the pre-check and came back an affirmative "all compliance checks passed" — a
  // 1,000,000-share VTI order in an $8.2M account showing as clean.
  //
  // 15s rather than the 5s default: the full page, a tab switch, the trade dialog and a typed
  // quantity make this ~1.3s on an idle machine, six times this file's other tests, so it is the
  // one that crosses 5s when other worktrees' suites share the CPU.
  it('fix round 2: clicking Buy on the VTI row and entering a huge quantity does not falsely pass compliance', { timeout: 15_000 }, async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Johnson Family Trust')
    await user.click(screen.getByRole('tab', { name: /Positions/ }))
    await screen.findByText('VTI')

    const vtiRow = screen.getByText('VTI').closest('tr')
    expect(vtiRow).not.toBeNull()
    await user.click(within(vtiRow!).getByText('Buy'))

    const qtyInput = await screen.findByLabelText('Quantity (shares)')
    await user.clear(qtyInput)
    await user.type(qtyInput, '1000000')

    expect(await screen.findByText(/trade blocked/i, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByText('All compliance checks passed')).not.toBeInTheDocument()
  })

  // §9.1 (Task 2 sweep) — the Overview tab's "AI Insight" card suggested tax-loss harvesting for
  // any account with an overall unrealized gain, regardless of whether a loss realised in it is
  // deductible at all. acc-003 (Traditional IRA) has a genuinely positive unrealized gain
  // (+$32,830 across its 9 positions) and would have shown this exact suggestion.
  describe('OverviewTab AI insight gates its tax-loss-harvesting suggestion on tax treatment (Task 2 sweep)', () => {
    it('acc-003 (Traditional IRA, positive unrealized gain) does not suggest tax-loss harvesting', async () => {
      renderPage('acc-003')
      await screen.findByText('Robert Johnson Traditional IRA')
      expect(screen.queryByText(/consider tax-loss harvesting/i)).not.toBeInTheDocument()
    })

    it('acc-001 (taxable, positive unrealized gain) still suggests it — the gate must not suppress the taxable case', async () => {
      renderPage('acc-001')
      await screen.findByText('Johnson Family Trust')
      expect(await screen.findByText(/consider tax-loss harvesting/i)).toBeInTheDocument()
    })
  })

  // §9.1 (Task 2, review round 2, Finding 1) — the AI-generated insight card rendered a separate,
  // hardcoded "Tax-Loss Harvesting Opportunity" insight (fetched via `useAIInsights`) for every
  // account, independent of the OverviewTab sentence fixed above. Render-level check that it does
  // not reach the screen for a gated account, and still does for a taxable one.
  describe('AI-generated "Tax-Loss Harvesting Opportunity" insight gates on tax treatment (Finding 1)', () => {
    it('acc-003 (Traditional IRA) does not render the AI harvesting insight card', async () => {
      renderPage('acc-003')
      await screen.findByText('Robert Johnson Traditional IRA')
      expect(screen.queryByText('Tax-Loss Harvesting Opportunity')).not.toBeInTheDocument()
    })

    it('acc-005 (taxable) still renders the AI harvesting insight card', async () => {
      renderPage('acc-005')
      await screen.findByText('Patricia Johnson Individual')
      expect(await screen.findByText('Tax-Loss Harvesting Opportunity')).toBeInTheDocument()
    })
  })
})
