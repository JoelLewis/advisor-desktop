import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { PreviewTradesStep } from '../PreviewTradesStep'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { previewRebalance } from '@/services/oms'
import type { RebalancePreview } from '@/services/oms'
import { formatCurrency } from '@/lib/utils'
import { convertCurrency, convertToBase } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'

/**
 * §9.3 · currencies-and-fx — render-level coverage for the fix at `PreviewTradesStep.tsx:38, 65,
 * 67`. The handler-level test (`rebalance-currency-invariants.test.ts`) proves `oms.ts` tags the
 * preview correctly; this proves the *component* actually reads that tag rather than still
 * hardcoding `'USD'` at the call site. Global Constraint 3: a green suite is not evidence without
 * a mutation, and Step 5's own checklist says a display test is required or a `'USD'` regression
 * at these call sites is invisible.
 */
function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function Harness({ previews }: { previews: RebalancePreview[] }) {
  const { formatWithConversion, isReady } = useFormatCurrency()
  if (!isReady) return <div data-testid="fx-loading" />
  return (
    <PreviewTradesStep
      previews={previews}
      accounts={[{ id: 'acc-043', name: 'Mueller EUR Balanced Account' }]}
      formatWithConversion={formatWithConversion}
      totalTrades={previews.reduce((sum, p) => sum + p.trades.length, 0)}
      // Mirrors RebalancePage.tsx's own fix — the batch total is converted to USD (per preview's
      // own currency) before summing, since the footer's `formatWithConversion(total, 'USD', …)`
      // assumes its input already IS USD.
      totalTaxImpact={previews.reduce((sum, p) => sum + convertToBase(p.estimatedTaxImpact, p.currency, FX_RATES_USD_BASE), 0)}
      complianceMutation={{ isPending: false }}
      handleReviewCompliance={() => {}}
      setStep={() => {}}
    />
  )
}

describe('PreviewTradesStep renders each trade at its own account currency, not USD', () => {
  it("acc-043 (EUR): the buy notional renders at its correctly converted USD figure, not the raw EUR number read as dollars", async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-043'], taxAware: true })
    expect(preview).toBeDefined()
    const buy = preview!.trades.find((t) => t.side === 'buy')
    const sell = preview!.trades.find((t) => t.side === 'sell')
    expect(buy).toBeDefined()
    expect(sell).toBeDefined()
    // Ground truth for the scenario cited in the brief: a six-figure EUR buy must NOT render as
    // the same number of dollars. The figure itself is read from the handler rather than
    // re-typed here — §9.6 capped it once (909,760 -> 766,862, when the round-4 sell cap gained
    // its buy-side mirror) and §9.7 moved it again (acc-043 can now buy the us_equity,
    // alternatives and real-estate sleeves it holds nothing of, so each individual buy is
    // smaller). What this test exists to pin is the *rendering*, and a hand-typed notional makes
    // it fail for reasons that have nothing to do with the component. The magnitude bound below
    // keeps it honest: the two formatted strings must still be distinguishable.
    expect(buy!.estimatedValue).toBeGreaterThan(100_000)

    render(<Harness previews={[preview!]} />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.queryByTestId('fx-loading')).not.toBeInTheDocument())

    const correctBuyUsd = convertCurrency(buy!.estimatedValue, 'EUR', 'USD', FX_RATES_USD_BASE)
    const correctSellUsd = convertCurrency(sell!.estimatedValue, 'EUR', 'USD', FX_RATES_USD_BASE)
    const mislabeledBuyUsd = formatCurrency(buy!.estimatedValue, { compact: true, currency: 'USD' })
    const mislabeledSellUsd = formatCurrency(sell!.estimatedValue, { compact: true, currency: 'USD' })
    const expectedBuy = formatCurrency(correctBuyUsd, { compact: true, currency: 'USD' })
    const expectedSell = formatCurrency(correctSellUsd, { compact: true, currency: 'USD' })

    // The correct and mislabeled strings must actually differ, or this test can't tell them apart.
    expect(expectedBuy).not.toBe(mislabeledBuyUsd)
    expect(expectedSell).not.toBe(mislabeledSellUsd)

    // Line 65 (trade.estimatedValue) — both trade rows render the FX-converted figure.
    expect(screen.getByText(expectedBuy)).toBeInTheDocument()
    expect(screen.getByText(expectedSell)).toBeInTheDocument()
    expect(screen.queryByText(mislabeledBuyUsd)).not.toBeInTheDocument()
    expect(screen.queryByText(mislabeledSellUsd)).not.toBeInTheDocument()
  })

  it("acc-043 (EUR): tax impact (header total and the taxed row) render converted, not the raw EUR figure — lines 38 and 67", async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-043'], taxAware: true })
    expect(preview).toBeDefined()
    expect(preview!.estimatedTaxImpact).toBeGreaterThan(0)
    const taxedTrades = preview!.trades.filter((t) => t.taxImpact > 0)
    expect(taxedTrades.length).toBeGreaterThan(0)
    // §9.7 · acc-043's intl_equity overweight is now drawn down across four positions rather than
    // stopping at the first, so there are several taxed rows. The header figure (line 38) is the
    // sum of them, which is what `estimatedTaxImpact` must equal — and it is the same amount the
    // footer's batch total converts, since this harness holds a single EUR preview.
    expect(taxedTrades.reduce((sum, t) => sum + t.taxImpact, 0)).toBe(preview!.estimatedTaxImpact)

    const { container } = render(<Harness previews={[preview!]} />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.queryByTestId('fx-loading')).not.toBeInTheDocument())

    const correctUsd = convertCurrency(preview!.estimatedTaxImpact, 'EUR', 'USD', FX_RATES_USD_BASE)
    const mislabeledUsd = formatCurrency(preview!.estimatedTaxImpact, { compact: true, currency: 'USD' })
    const expected = formatCurrency(correctUsd, { compact: true, currency: 'USD' })
    expect(expected).not.toBe(mislabeledUsd)

    // Two sites render the account total: the per-account header (line 38, inline text) and the
    // footer's batch total (which, with a single EUR preview in this harness, converts to the
    // same amount). Both must show the converted figure, and the mislabeled
    // (unconverted-EUR-read-as-USD) string must appear nowhere on the page.
    // Header (line 38) — inline text inside a mixed-content span, so matched via textContent.
    expect(container.textContent).toContain(`Tax impact: ${expected}`)
    // Footer batch total — the only `<strong class="font-mono text-accent-red">` on the step.
    expect(container.querySelector('strong.font-mono.text-accent-red')?.textContent).toBe(expected)
    expect(container.textContent).not.toContain(mislabeledUsd)

    // Line 67 · the per-row taxImpact cells must be converted too. They are individual legs of
    // the sleeve draw-down now, so each is checked on its own rather than coinciding with the
    // account total.
    for (const trade of taxedTrades) {
      const rowExpected = formatCurrency(convertCurrency(trade.taxImpact, 'EUR', 'USD', FX_RATES_USD_BASE), { compact: true, currency: 'USD' })
      expect(screen.getAllByText(rowExpected).length).toBeGreaterThan(0)
    }
  })

  it('acc-001 (USD): unchanged — the fix does not alter the already-correct USD case', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-001'], taxAware: true })
    expect(preview).toBeDefined()
    expect(preview!.trades.length).toBeGreaterThan(0)
    const trade = preview!.trades[0]!

    render(<Harness previews={[preview!]} />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.queryByTestId('fx-loading')).not.toBeInTheDocument())

    // USD -> USD conversion is a no-op, so the rendered figure equals the raw notional formatted.
    const expected = formatCurrency(trade.estimatedValue, { compact: true, currency: 'USD' })
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
  })
})
