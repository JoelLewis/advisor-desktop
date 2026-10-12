import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'
import { TaxManagementPage } from '../TaxManagementPage'
import { previewRebalance } from '@/services/oms'
import { generateTaxLotsWithSaleRisk } from '@/mocks/handlers/custodian'
import { estimatedTaxBenefit } from '@/lib/tax-rules'
import { formatCurrency } from '@/lib/utils'

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
    expect(screen.getByText(/40\.8% short-term, 23\.8% long-term/)).toBeInTheDocument()
  })

  it('acc-001 (specific_id): AvgCost is not offered as a cost-basis method', async () => {
    renderPage('acc-001')
    await screen.findByText('Johnson Family Trust')

    const select = screen.getByRole('combobox')
    expect(within(select).queryByRole('option', { name: 'AvgCost' })).not.toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'FIFO' })).toBeInTheDocument()
  })

  // Was acc-004 until Task 18: every `average_cost` account in the book was a Roth IRA or a 529,
  // and D35 moved those to `not_applicable` — a tax-free account elects no lot-selection method at
  // all. acc-042 is the one genuinely taxable average-cost account left, so it is what this
  // assertion has to be made against.
  it('acc-042 (average_cost): AvgCost is offered as a cost-basis method', async () => {
    renderPage('acc-042')
    await screen.findByText('Chen-Wong SG Growth Account')

    const select = screen.getByRole('combobox')
    expect(within(select).getByRole('option', { name: 'AvgCost' })).toBeInTheDocument()
  })

  // §9.1 (Task 2) restates this test's premise. It previously asserted that AvgCost specifically
  // was withheld from the combobox — correct as far as it went, but it still rendered a
  // cost-basis-method *selector* for a Roth IRA, implying an election that has no tax consequence
  // in an account where no disposition is ever taxable. Task 2 gates the whole cost-basis
  // simulator off for tax-deferred/tax-free accounts (see `TaxManagementPage`'s `disclosure`
  // branch), so the combobox this test queried no longer renders for acc-004 at all — a stronger
  // form of the same fact the original assertion was reaching for.
  it('acc-004 (Roth IRA): the cost-basis method simulator does not render at all, not merely without AvgCost', async () => {
    renderPage('acc-004')
    await screen.findByText('Patricia Johnson Roth IRA')

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('Cost Basis Method')).not.toBeInTheDocument()
  })

  // Fix-round-1 review, Important #3: an earlier version of this fix gated the page's own
  // `isLoading` on `!fxReady`. `useCurrencyConverter`'s `isReady` never becomes true once React
  // Query's retries are exhausted, so on a permanent FX outage `isLoading` stayed `true` forever
  // and the page never rendered anything at all — not the skeleton yielding to an error, just the
  // skeleton, permanently (see the corrected account of this in TaxManagementPage.tsx; a
  // fix-round-2 review found the original commit message and a code comment here had
  // mischaracterized this as a refetch loop, which is a real but *different* hazard that never
  // actually shipped). This forces a real 500 from `/api/fx/rates` and asserts the page still
  // settles instead of hanging. Uses acc-044 (CHF), which genuinely needs FX for its harvest
  // computation — see the fix-round-3 tests below for acc-001 (USD), which does not.
  it('renders the page (not stuck on a skeleton) and explains itself when FX rates fail to load', async () => {
    server.use(
      http.get('/api/fx/rates', () => HttpResponse.json({ code: 'FX_DOWN', message: 'boom' }, { status: 500 })),
    )
    const user = userEvent.setup()
    renderPage('acc-044')

    // The account itself loaded fine — its own data is independent of FX — so the page must
    // render, not sit on the skeleton because a *different* query failed.
    expect(await screen.findByText('Mueller CHF Conservative Account')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Harvest scanner' }))
    // acc-044 needs FX for its own display too, so the page-level banner from fix-round-2's
    // Important #1 also renders "Exchange rates are unavailable..." — match on wording unique to
    // the scanner's own copy so this assertion isn't ambiguous between the two.
    expect(await screen.findByText(/can.t be compared against the US\$1,000 threshold/)).toBeInTheDocument()
  })

  // Fix-round-3 review: `harvestOpportunities` gated on the *global* `fxReady`, but
  // `isHarvestable`'s conversion (via `convertToBase`, always targeting USD) short-circuits for
  // any USD-native account — `convertCurrency` returns the amount unchanged when `from === to`.
  // All but four fixture accounts are USD-native (see tax-invariants.test.ts for the exact
  // count), so an FX outage that has nothing to do with them was suppressing a fully-known
  // number across nearly the whole book: the harvestable-losses card went to "— / Exchange
  // rates unavailable" and the scanner tab claimed opportunities
  // "can't be compared against the threshold," both false for an account whose own currency
  // already *is* the threshold's currency.
  describe('the harvest gate is scoped to accounts that actually need FX (fix-round-3 review)', () => {
    it('acc-001 (USD-native): the "Harvestable losses" card shows the real figure while FX is down', async () => {
      server.use(
        http.get('/api/fx/rates', () => HttpResponse.json({ code: 'FX_DOWN', message: 'boom' }, { status: 500 })),
      )
      renderPage('acc-001')
      await screen.findByText('Johnson Family Trust')

      // acc-001 has 5 real harvestable lots totalling $54,440 (compact: "$54K") — independent of
      // FX, since every lot is already in USD.
      const harvestCard = await screen.findByText('Harvestable losses')
      const cardEl = harvestCard.closest('div')!
      expect(within(cardEl).getByText('$54K')).toBeInTheDocument()
      expect(within(cardEl).getByText('5 lots')).toBeInTheDocument()
      expect(within(cardEl).queryByText('Exchange rates unavailable')).not.toBeInTheDocument()
      expect(within(cardEl).queryByText('—')).not.toBeInTheDocument()
    })

    it('acc-001 (USD-native): the scanner tab lists real opportunities, not an "unavailable" message, while FX is down', async () => {
      server.use(
        http.get('/api/fx/rates', () => HttpResponse.json({ code: 'FX_DOWN', message: 'boom' }, { status: 500 })),
      )
      const user = userEvent.setup()
      renderPage('acc-001')
      await screen.findByText('Johnson Family Trust')

      await user.click(screen.getByRole('button', { name: 'Harvest scanner' }))
      expect(await screen.findByText('5 opportunities')).toBeInTheDocument()
      expect(screen.queryByText(/Exchange rates are unavailable/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Loading exchange rates/)).not.toBeInTheDocument()
    })

    // The mirror check: acc-044 (CHF) genuinely does need FX, and must still fail open rather
    // than silently reproducing the currency-blind bug — confirming the scoping didn't
    // overcorrect into "never gate anything."
    it('acc-044 (CHF, needs FX): the "Harvestable losses" card still reads unavailable, not a wrong number', async () => {
      server.use(
        http.get('/api/fx/rates', () => HttpResponse.json({ code: 'FX_DOWN', message: 'boom' }, { status: 500 })),
      )
      renderPage('acc-044')
      await screen.findByText('Mueller CHF Conservative Account')

      const harvestCard = await screen.findByText('Harvestable losses')
      const cardEl = harvestCard.closest('div')!
      expect(await within(cardEl).findByText('Exchange rates unavailable')).toBeInTheDocument()
    })
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

// §9.1 · `TaxManagementPage` had no `account.taxTreatment` gating anywhere: a Traditional IRA
// (acc-003) or a Roth IRA (acc-004) was shown harvest opportunities and dollar "estimated tax
// benefit" figures for losses that produce no current-year deduction at all (IRS Pub 590-A). Same
// defect class as Task 17's dashboard fix; the per-account surface was never in that task's scope.
describe('TaxManagementPage gates on tax treatment', () => {
  it('acc-003 (Traditional IRA, tax-deferred) is told harvesting does not apply, and shows no benefit figure', async () => {
    renderPage('acc-003')
    expect(await screen.findByText(/not applicable in a tax-deferred account/i)).toBeInTheDocument()
    // The direction that matters: no dollar benefit is claimed anywhere on the page.
    expect(screen.queryByTestId('estimated-tax-benefit')).not.toBeInTheDocument()
    expect(screen.queryByText(/estimated tax benefit/i)).not.toBeInTheDocument()
    // The harvest scanner tab itself is not reachable — not merely empty behind it.
    expect(screen.queryByRole('button', { name: /harvest scanner/i })).not.toBeInTheDocument()
  })

  it('acc-004 (Roth IRA, tax-free) is likewise gated', async () => {
    renderPage('acc-004')
    expect(await screen.findByText(/not applicable in a tax-free account/i)).toBeInTheDocument()
    expect(screen.queryByTestId('estimated-tax-benefit')).not.toBeInTheDocument()
  })

  it('acc-005 (individual, taxable) still shows harvest opportunities and a benefit figure', async () => {
    renderPage('acc-005')
    // The gate must not suppress the taxable case — this is the test that fails if you gate
    // everything, which is the cheap and wrong way to make the two tests above pass.
    expect(await screen.findByTestId('estimated-tax-benefit')).toBeInTheDocument()
    expect(screen.queryByText(/not applicable in a tax-/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /harvest scanner/i })).toBeInTheDocument()
  })

  // acc-006 is an irrevocable trust: `taxTreatment: 'trust_taxable'`. It files its own return and
  // pays its own tax, so a loss realised in it is exactly as deductible as one in a taxable
  // individual account — `oms.ts`'s pre-existing rebalance tax estimator and `ai.ts`'s
  // `HARVEST_ELIGIBLE_TREATMENTS` (the Task 17 dashboard fix) both already draw this line the same
  // way. A predicate that only matched `'taxable'` would gate acc-006 too — passing the acc-003
  // and acc-004 tests above for the wrong reason, by suppressing a real benefit alongside the two
  // fake ones, silently.
  it('acc-006 (irrevocable trust, trust_taxable) is not gated — the trust pays its own tax', async () => {
    renderPage('acc-006')
    expect(await screen.findByTestId('estimated-tax-benefit')).toBeInTheDocument()
    expect(screen.queryByText(/not applicable in a tax-/i)).not.toBeInTheDocument()
  })

  // 529 plans carry `taxTreatment: 'tax_free'` in the fixtures (acc-014, acc-032) — the same value
  // a Roth IRA carries. Confirms the gate covers them without a 529-specific branch.
  it('acc-014 (529 plan, tax-free) is gated the same way a Roth IRA is', async () => {
    renderPage('acc-014')
    expect(await screen.findByText(/not applicable in a tax-free account/i)).toBeInTheDocument()
    expect(screen.queryByTestId('estimated-tax-benefit')).not.toBeInTheDocument()
  })

  it('acc-003: the tax lot table still renders — a record of what is held, not a claim about a benefit', async () => {
    renderPage('acc-003')
    await screen.findByText(/not applicable in a tax-deferred account/i)
    expect(screen.getByText(/Tax Lots \(/i)).toBeInTheDocument()
  })

  it('acc-003: the cost-basis method simulator does not render', async () => {
    renderPage('acc-003')
    await screen.findByText(/not applicable in a tax-deferred account/i)
    expect(screen.queryByText('Cost Basis Method')).not.toBeInTheDocument()
  })

  // An open household loss window restricts **buying INTC back**, not selling it: selling a
  // long-held lot at a loss is the harvest, and the rebalance preview books it as one with no
  // wash-sale flag. The scanner previously badged that same lot "Restricted" in a "Wash Sale Risk"
  // column, so the two surfaces disagreed about one sale.
  it('acc-002 INTC: the scanner and the rebalance preview agree the loss sale is not a wash sale', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const intcSell = preview!.trades.find((t) => t.symbol === 'INTC' && t.side === 'sell')!
    expect(intcSell.realisedShortTerm + intcSell.realisedLongTerm).toBeLessThan(0)
    expect(intcSell.washSaleRisk).toBe(false)

    const user = userEvent.setup()
    renderPage('acc-002')
    await screen.findByText('Robert Johnson Individual')
    await user.click(screen.getByRole('button', { name: 'Harvest scanner' }))

    const intcCell = await screen.findByText('INTC')
    const intcRow = intcCell.closest('tr')!
    expect(within(intcRow).queryByText('Restricted')).not.toBeInTheDocument()
    expect(within(intcRow).getByText('Repurchase blocked through Mar 23, 2026')).toBeInTheDocument()
    expect(screen.queryByText('Wash Sale Risk')).not.toBeInTheDocument()
  })

  // §1091 takes only the washed shares' part of a loss (Treas. Reg. §1.1091-1(c)): deferred into a
  // taxable replacement's basis, or permanently disallowed when the replacement was bought in an
  // IRA or Roth (Rev. Rul. 2008-5). No fixture has a washing lot, so this marks a quarter of
  // acc-001's largest harvestable lot as washed by each kind of replacement at the endpoint:
  //   allowed now  = gainLoss × (q − q/4 − q/4)/q = gainLoss / 2
  //   deferred     = gainLoss / 4,  disallowed = gainLoss / 4
  it('acc-001: the "Harvestable losses" card counts only the allowed part of a washing lot, and names the rest', async () => {
    const lots = generateTaxLotsWithSaleRisk('acc-001', 8_200_000)
    const harvestable = lots.filter((l) => l.gainLoss < -1_000)
    expect(harvestable).toHaveLength(5)
    const washing = [...harvestable].sort((a, b) => a.gainLoss - b.gainLoss)[0]!
    const quarter = washing.quantity / 4
    server.use(
      http.get('/api/custodian/accounts/acc-001/tax-lots', () =>
        HttpResponse.json(lots.map((l) => (l.id === washing.id
          ? { ...l, saleWash: { deferredShares: quarter, disallowedShares: quarter } }
          : l)))),
    )
    renderPage('acc-001')
    await screen.findByText('Johnson Family Trust')

    const kept = harvestable.filter((l) => l.id !== washing.id)
    const usd = (n: number) => formatCurrency(n, { compact: true, currency: 'USD' })
    const cardEl = (await screen.findByText('Harvestable losses')).closest('div')!
    const allowed = kept.reduce((s, l) => s - l.gainLoss, 0) - washing.gainLoss / 2
    expect(within(cardEl).getByText(usd(allowed))).toBeInTheDocument()
    expect(within(cardEl).getByText('5 lots')).toBeInTheDocument()
    expect(within(cardEl).getByText(`Excludes ${usd(-washing.gainLoss / 4)} deferred by a wash sale`)).toBeInTheDocument()
    expect(within(cardEl).getByText(`Excludes ${usd(-washing.gainLoss / 4)} permanently disallowed: replacement bought in an IRA or Roth`)).toBeInTheDocument()
    const benefit = kept.reduce((s, l) => s + estimatedTaxBenefit(l), 0)
      + estimatedTaxBenefit({ gainLoss: washing.gainLoss / 2, holdingPeriod: washing.holdingPeriod })
    expect(within(cardEl).getByTestId('estimated-tax-benefit').textContent).toBe(usd(benefit))
  })
})
