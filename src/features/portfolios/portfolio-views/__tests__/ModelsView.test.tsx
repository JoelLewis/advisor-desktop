import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { ModelsView } from '../ModelsView'
import { formatCurrency } from '@/lib/utils'
import { convertCurrency } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import type { Account } from '@/types/account'
import type { ModelAssignment } from '@/types/portfolio'

/**
 * §9.3 · currencies-and-fx — render-level coverage for `ModelsView.tsx:24`'s `totalAUM`. A pure
 * `deriveBookAUM`-vs-naive-sum comparison (`rebalance-currency-invariants.test.ts`) proves the
 * *primitive* behaves correctly, but does not exercise this component at all — a regression that
 * reverted `ModelsView.tsx` to the naive `modelAccounts.reduce((sum, a) => sum + a.totalValue, 0)`
 * would pass every existing test in the suite (verified: it did, until this file was added).
 */
function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const HKD_ACCOUNT: Account = {
  id: 'acc-hkd-test',
  accountNumber: 'TEST-HKD-1',
  name: 'Test HKD Account',
  type: 'individual',
  status: 'active',
  taxTreatment: 'taxable',
  clientId: 'cli-test',
  householdId: 'hh-test',
  totalValue: 780_000,
  cashBalance: 10_000,
  isUMA: false,
  modelId: 'mod-test',
  custodian: 'HSBC',
  openDate: '2020-01-01',
  lastRebalance: null,
  costBasisMethod: 'specific_id',
  baseCurrency: 'HKD',
}

const MODEL: ModelAssignment = {
  id: 'mod-test',
  name: 'Test Model',
  benchmark: 'Model policy blend (Test Model)',
  benchmarkKind: 'model_policy',
  description: 'A model with a non-USD account, for currency coverage only',
  assetClasses: [],
}

describe('ModelsView renders model AUM via deriveBookAUM, not a naive totalValue sum', () => {
  it('a model containing a HKD account reports the converted total, not the raw HKD number read as dollars', async () => {
    render(
      <ModelsView
        models={[MODEL]}
        accountsByModel={new Map([[MODEL.id, [HKD_ACCOUNT]]])}
        driftMap={new Map()}
        onRebalanceModel={() => {}}
      />,
      { wrapper: createWrapper() },
    )

    const correctUsd = convertCurrency(HKD_ACCOUNT.totalValue, 'HKD', 'USD', FX_RATES_USD_BASE)
    const expected = formatCurrency(correctUsd, { compact: true, currency: 'USD' })
    const mislabeled = formatCurrency(HKD_ACCOUNT.totalValue, { compact: true, currency: 'USD' })
    expect(expected).not.toBe(mislabeled)

    await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument())
    expect(screen.queryByText(mislabeled)).not.toBeInTheDocument()
  })
})
