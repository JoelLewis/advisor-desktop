import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { RebalancePage } from '../../RebalancePage'
import { formatCurrency } from '@/lib/utils'
import { convertCurrency } from '@/lib/currency'
import { previewRebalance } from '@/services/oms'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'

/**
 * §9.3 · currencies-and-fx — full-page integration coverage for `RebalancePage.tsx:175`'s batch
 * `totalTaxImpact`. `PreviewTradesStep.test.tsx` proves the *pattern* (convert each preview
 * before summing) is correct in isolation, but that harness hand-computes the total itself — it
 * cannot catch a regression in `RebalancePage.tsx`'s own aggregation, because it never calls that
 * code. This renders the real page (via the `?accounts=` preselection path, which auto-advances
 * past account selection — see `RebalancePage.tsx`'s "Auto-advance" effect) so the mutation
 * (reverting `totalTaxImpact` to a naive `previews.reduce`) has something to break.
 *
 * Confirmed live: with acc-001 (USD) and acc-043 (EUR) both selected, only acc-043 clears the
 * 10%-default drift threshold and proposes trades (acc-001 proposes none), so the page's batch
 * total is entirely acc-043's own EUR tax impact — still enough to distinguish a converted total
 * from a naive one, since EUR is not at FX parity in the fixtures.
 */
describe('RebalancePage: batch tax-impact total converts before summing (real page, not a hand-fed harness)', () => {
  it('acc-001 + acc-043 preselected: the footer total is the FX-converted figure, not the raw EUR number read as USD', async () => {
    const { container } = renderWithProviders(<RebalancePage />, { initialEntries: ['/portfolios/rebalance?accounts=acc-001,acc-043'] })

    // Auto-advances from 'select' to 'preview' once accounts/drift data load (RebalancePage's own
    // effect) — wait for the preview step's content rather than driving any UI interaction.
    await waitFor(() => expect(screen.getByText('Mueller EUR Balanced Account')).toBeInTheDocument(), { timeout: 5000 })

    // acc-043's tax impact is read from the same handler call the page makes (its own state
    // defaults: `driftThreshold` 10.0 -> 0.10, `taxAware` true) rather than re-typed here. It was
    // hardcoded at €16,398 — the tax on selling SIE.DE — and §9.7's tax-aware candidate selection
    // legitimately moved it to the lower-embedded-gain VWRL.AS. What this test exists to pin is
    // RebalancePage's *aggregation* (convert each preview's own-currency figure before summing);
    // a hand-typed EUR figure makes it fail for reasons that have nothing to do with that.
    // acc-001 contributes nothing at the 10% default threshold, so this is the whole batch total.
    const [, eurPreview] = await previewRebalance({ accountIds: ['acc-001', 'acc-043'], taxAware: true, driftThreshold: 0.10 })
    const rawEurTaxImpact = eurPreview!.estimatedTaxImpact
    // Vacuity guard: a zero tax impact would make every string below identical and this test
    // would pass while proving nothing.
    expect(rawEurTaxImpact).toBeGreaterThan(0)
    const correctUsd = convertCurrency(rawEurTaxImpact, 'EUR', 'USD', FX_RATES_USD_BASE)
    const expected = formatCurrency(correctUsd, { compact: true, currency: 'USD' })
    const mislabeled = formatCurrency(rawEurTaxImpact, { compact: true, currency: 'USD' })
    expect(expected).not.toBe(mislabeled)

    // The footer's batch total is the only `<strong class="font-mono text-accent-red">` on the
    // preview step (`PreviewTradesStep.tsx`'s per-row taxImpact cells use that class on a `<td>`,
    // not a `<strong>`), so this selector is unambiguous.
    await waitFor(() => {
      const totalEl = container.querySelector('strong.font-mono.text-accent-red')
      expect(totalEl).not.toBeNull()
      expect(totalEl!.textContent).toBe(expected)
    })
    expect(container.querySelector('strong.font-mono.text-accent-red')!.textContent).not.toBe(mislabeled)
  })
})
