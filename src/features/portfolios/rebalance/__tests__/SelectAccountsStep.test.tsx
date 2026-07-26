import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { SelectAccountsStep } from '../SelectAccountsStep'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { formatCurrency } from '@/lib/utils'
import { convertCurrency } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import type { ModelAssignment } from '@/types/portfolio'

/**
 * §9.3 · currencies-and-fx — render-level coverage for `SelectAccountsStep.tsx`'s two rows
 * (accounts-mode list and the model-mode drilldown) plus the model-card aggregate AUM. The Step 5
 * checklist is explicit that a passing aggregate-only test would hide a row-level regression, so
 * this exercises both.
 */

// acc-043's real fixture shape (accounts.ts): EUR, $3.2M native.
const EUR_ACCOUNT = {
  id: 'acc-043',
  name: 'Mueller EUR Balanced Account',
  accountNumber: 'UBS-EU-40567',
  totalValue: 3_200_000,
  modelId: 'mod-003',
  householdId: 'hh-013',
  clientId: 'cli-021',
  baseCurrency: 'EUR' as const,
}

const MODEL: ModelAssignment = {
  id: 'mod-003',
  name: 'Balanced',
  benchmark: '60/40 Blend',
  benchmarkKind: 'model_policy',
  description: 'Balanced allocation model',
  assetClasses: [],
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function Harness({ selectionMode, selectedModelId }: { selectionMode: 'accounts' | 'model'; selectedModelId: string | null }) {
  const { formatWithConversion, isReady } = useFormatCurrency()
  if (!isReady) return <div data-testid="fx-loading" />
  return (
    <SelectAccountsStep
      accounts={[EUR_ACCOUNT]}
      driftedAccounts={[EUR_ACCOUNT]}
      driftMap={new Map()}
      selectedIds={new Set()}
      toggleSelect={() => {}}
      selectionMode={selectionMode}
      setSelectionMode={() => {}}
      selectedModelId={selectedModelId}
      handleSelectModel={() => {}}
      driftThreshold={5}
      setDriftThreshold={() => {}}
      taxAware={true}
      setTaxAware={() => {}}
      handlePreview={() => {}}
      previewMutation={{ isPending: false }}
      formatWithConversion={formatWithConversion}
      models={[MODEL]}
      driftedAccountsByModel={new Map([[MODEL.id, [EUR_ACCOUNT.id]]])}
    />
  )
}

describe('SelectAccountsStep renders each account row at its own currency, not USD', () => {
  it("acc-043 (EUR) row in accounts-selection mode: totalValue renders converted, not the raw EUR number read as dollars — line 153", async () => {
    render(<Harness selectionMode="accounts" selectedModelId={null} />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.queryByTestId('fx-loading')).not.toBeInTheDocument())

    const correctUsd = convertCurrency(EUR_ACCOUNT.totalValue, 'EUR', 'USD', FX_RATES_USD_BASE)
    const expected = formatCurrency(correctUsd, { compact: true, currency: 'USD' })
    const mislabeled = formatCurrency(EUR_ACCOUNT.totalValue, { compact: true, currency: 'USD' })
    expect(expected).not.toBe(mislabeled)

    expect(screen.getByText(expected)).toBeInTheDocument()
    expect(screen.queryByText(mislabeled)).not.toBeInTheDocument()
  })

  it("acc-043 (EUR) row inside the selected model's drilldown list: same fix, second render site", async () => {
    render(<Harness selectionMode="model" selectedModelId="mod-003" />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.queryByTestId('fx-loading')).not.toBeInTheDocument())

    const correctUsd = convertCurrency(EUR_ACCOUNT.totalValue, 'EUR', 'USD', FX_RATES_USD_BASE)
    const expected = formatCurrency(correctUsd, { compact: true, currency: 'USD' })
    const mislabeled = formatCurrency(EUR_ACCOUNT.totalValue, { compact: true, currency: 'USD' })

    // The model card's own AUM total (single EUR account) also converts to this same figure, so
    // it is expected to appear more than once — assert at least one occurrence and that the
    // mislabeled string never appears anywhere on the page.
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
    expect(screen.queryByText(mislabeled)).not.toBeInTheDocument()
  })

  it("the model card's AUM total is deriveBookAUM's converted figure, not a naive totalValue sum", async () => {
    render(<Harness selectionMode="model" selectedModelId={null} />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.queryByTestId('fx-loading')).not.toBeInTheDocument())

    const correctUsd = convertCurrency(EUR_ACCOUNT.totalValue, 'EUR', 'USD', FX_RATES_USD_BASE)
    const expected = formatCurrency(correctUsd, { compact: true, currency: 'USD' })
    const mislabeled = formatCurrency(EUR_ACCOUNT.totalValue, { compact: true, currency: 'USD' })
    expect(expected).not.toBe(mislabeled)

    expect(screen.getByText(expected)).toBeInTheDocument()
    expect(screen.queryByText(mislabeled)).not.toBeInTheDocument()
  })
})
