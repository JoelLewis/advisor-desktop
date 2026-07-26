import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { ComplianceReviewStep } from '../ComplianceReviewStep'
import { formatCurrency } from '@/lib/utils'
import { convertCurrency } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import type { TradeComplianceResult } from '@/types/compliance'

/**
 * §9.3 sweep — this site was not in the brief's file list; it was found by reading every
 * `formatWithConversion` call site in the rebalance wizard (the mandated sweep method), not by
 * grepping for a known helper name. `check.details.cashBalance`/`minimumCash` come from
 * `mocks/handlers/compliance.ts`'s `postTradeCash`/`minimumCash`, both derived from the account's
 * own native-currency `cashBalance`/`totalValue` — the same defect class as the rest of Task 4,
 * one step further into the same wizard (Compliance Review, step 3 of 4).
 */
function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// Realistic magnitudes for acc-043 (EUR, cashBalance €438,840) — a post-trade cash check that
// warns because the projected balance sits below the 2% minimum.
const CASH_BALANCE = 50_000
const MINIMUM_CASH = 64_000

const RESULT: TradeComplianceResult = {
  accountId: 'acc-043',
  overallStatus: 'warning',
  checks: [
    {
      rule: 'Cash reserve minimum (2%)',
      category: 'cash_minimum',
      status: 'warning',
      message: 'Post-trade cash would be below the 2% minimum reserve.',
      details: { cashBalance: CASH_BALANCE, minimumCash: MINIMUM_CASH },
    },
  ],
}

describe('ComplianceReviewStep renders compliance cash figures at the account currency, not USD', () => {
  it('acc-043 (EUR): cash and minimum-cash details render converted, not the raw EUR numbers read as dollars', async () => {
    render(
      <ComplianceReviewStep
        complianceResults={[RESULT]}
        accounts={[{ id: 'acc-043', name: 'Mueller EUR Balanced Account', baseCurrency: 'EUR' }]}
        allComplianceChecks={RESULT.checks}
        hasComplianceFailure={false}
        executeMutation={{ isPending: false }}
        handleExecute={() => {}}
        setStep={() => {}}
      />,
      { wrapper: createWrapper() },
    )

    // The mocked display settings default `compactNumbers` to true (settings.ts), and the
    // component passes no `compact` override at these call sites, so `formatWithConversion` falls
    // back to that default — reproduce it here rather than assuming full precision.
    const expectedCash = formatCurrency(convertCurrency(CASH_BALANCE, 'EUR', 'USD', FX_RATES_USD_BASE), { compact: true, currency: 'USD' })
    const expectedMin = formatCurrency(convertCurrency(MINIMUM_CASH, 'EUR', 'USD', FX_RATES_USD_BASE), { compact: true, currency: 'USD' })
    const mislabeledCash = formatCurrency(CASH_BALANCE, { compact: true, currency: 'USD' })
    const mislabeledMin = formatCurrency(MINIMUM_CASH, { compact: true, currency: 'USD' })
    expect(expectedCash).not.toBe(mislabeledCash)
    expect(expectedMin).not.toBe(mislabeledMin)

    // FX loads asynchronously (react-query), so the correct figures appear after a tick.
    await waitFor(() => expect(screen.getByText(expectedCash)).toBeInTheDocument())
    expect(screen.getByText(expectedMin)).toBeInTheDocument()
    expect(screen.queryByText(mislabeledCash)).not.toBeInTheDocument()
    expect(screen.queryByText(mislabeledMin)).not.toBeInTheDocument()
  })

  it('acc-001 (USD, implicit) is unaffected — no baseCurrency means USD, unchanged behavior', async () => {
    const usdResult: TradeComplianceResult = { ...RESULT, accountId: 'acc-001' }
    render(
      <ComplianceReviewStep
        complianceResults={[usdResult]}
        accounts={[{ id: 'acc-001', name: 'Johnson Family Trust' }]}
        allComplianceChecks={usdResult.checks}
        hasComplianceFailure={false}
        executeMutation={{ isPending: false }}
        handleExecute={() => {}}
        setStep={() => {}}
      />,
      { wrapper: createWrapper() },
    )
    const expected = formatCurrency(CASH_BALANCE, { compact: true, currency: 'USD' })
    await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument())
  })
})
