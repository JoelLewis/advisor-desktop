import { useState, useMemo } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { useAccounts } from '@/hooks/use-accounts'
import { useModelGovernance, useDriftSummary } from '@/hooks/use-portfolio'
import { useModelTradePreview, useExecuteModelTrades } from '@/hooks/use-trading'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { convertToBase } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { cn } from '@/lib/utils'
import type { Account } from '@/types/account'
import type { ModelGovernanceDetail } from '@/types/portfolio'
import type { ModelTradePreview } from '@/types/trading'

const RISK_BADGE: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'default'> = {
  conservative: 'green',
  moderate_conservative: 'blue',
  moderate: 'default',
  moderate_aggressive: 'yellow',
  aggressive: 'red',
}

function formatRiskLabel(riskProfile: string): string {
  return riskProfile
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function ModelTradeView() {
  const { formatWithConversion } = useFormatCurrency()
  const { data: models } = useModelGovernance()
  const { data: allAccounts } = useAccounts({})
  const { data: driftSummary } = useDriftSummary()
  const previewMutation = useModelTradePreview()
  const executeMutation = useExecuteModelTrades()

  const [step, setStep] = useState(0)
  const [selectedModel, setSelectedModel] = useState<ModelGovernanceDetail | null>(null)
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
  const [previews, setPreviews] = useState<ModelTradePreview[]>([])
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set())
  const [ordersCreated, setOrdersCreated] = useState(0)

  const driftMap = useMemo(
    () => new Map((driftSummary ?? []).map((d) => [d.accountId, d])),
    [driftSummary],
  )

  // Filter accounts by selected model
  const modelAccounts = useMemo(() => {
    if (!allAccounts || !selectedModel) return []
    return allAccounts.filter((a) => a.modelId === selectedModel.id)
  }, [allAccounts, selectedModel])

  function handleNextToAccounts() {
    if (!selectedModel) return
    // Pre-select all model accounts
    const ids = new Set(modelAccounts.map((a) => a.id))
    setSelectedAccountIds(ids)
    setStep(1)
  }

  // Step 2 handlers
  function toggleAccountSelection(id: string) {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedAccountIds.size === modelAccounts.length) {
      setSelectedAccountIds(new Set())
    } else {
      setSelectedAccountIds(new Set(modelAccounts.map((a) => a.id)))
    }
  }

  function handlePreview() {
    if (!selectedModel || selectedAccountIds.size === 0) return
    previewMutation.mutate(
      { modelId: selectedModel.id, accountIds: Array.from(selectedAccountIds) },
      {
        onSuccess: (data) => {
          setPreviews(data)
          setExpandedPreviews(new Set(data.map((p) => p.accountId)))
          setStep(2)
        },
      },
    )
  }

  // Step 3 handlers
  function togglePreviewExpand(accountId: string) {
    setExpandedPreviews((prev) => {
      const next = new Set(prev)
      if (next.has(accountId)) next.delete(accountId)
      else next.add(accountId)
      return next
    })
  }

  function handleExecute() {
    if (!selectedModel) return
    executeMutation.mutate(
      { modelId: selectedModel.id, accountIds: Array.from(selectedAccountIds) },
      {
        onSuccess: (data) => {
          setOrdersCreated(data.ordersCreated)
          setStep(3)
        },
      },
    )
  }

  // Step 4 — reset
  function handleReset() {
    setStep(0)
    setSelectedModel(null)
    setSelectedAccountIds(new Set())
    setPreviews([])
    setExpandedPreviews(new Set())
    setOrdersCreated(0)
  }

  const totalTrades = previews.reduce((sum, p) => sum + p.trades.length, 0)
  // §9.3 — each preview's notionals are denominated in that account's own currency, so a batch
  // spanning acc-001 (USD) and acc-041 (HKD) cannot be summed before converting. Both totals are
  // rendered by `formatWithConversion(total, 'USD', …)` below, which assumes its input already IS
  // USD — the same conversion boundary RebalancePage applies to its own batch total.
  const totalValue = previews.reduce(
    (sum, p) => sum + p.trades.reduce((ts, t) => ts + convertToBase(t.estimatedValue, t.currency, FX_RATES_USD_BASE), 0),
    0,
  )
  const totalTaxImpact = previews.reduce(
    (sum, p) => sum + convertToBase(p.estimatedTaxImpact, p.currency, FX_RATES_USD_BASE),
    0,
  )

  // Account columns for step 2
  const accountColumns: ColumnDef<Account, unknown>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedAccountIds.size === modelAccounts.length && modelAccounts.length > 0}
          onChange={toggleSelectAll}
          className="h-4 w-4 rounded border-border-secondary"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedAccountIds.has(row.original.id)}
          onChange={() => toggleAccountSelection(row.original.id)}
          className="h-4 w-4 rounded border-border-secondary"
        />
      ),
      size: 40,
      enableSorting: false,
    },
    { accessorKey: 'name', header: 'Account Name' },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => <span className="capitalize">{String(getValue<string>()).replace(/_/g, ' ')}</span>,
    },
    {
      accessorKey: 'totalValue',
      header: 'Value',
      // §9.3 — `totalValue` is native currency, so the row must say which one. `CurrencyValue`
      // defaults `from` to USD, which rendered acc-041's HK$12,500,000 as "$12.5M" against a true
      // $1,598,465.47 — a 7.82x overstatement, on the row an advisor picks accounts from. Every
      // peer renderer of this same field already passes it (`columns.tsx:54`,
      // `ClientDetailPage:66`, `HouseholdDetailPage:66`), including `SelectAccountsStep.tsx:171`,
      // the rebalance wizard's equivalent step — three lines from the drift cell beside this one.
      cell: ({ row }) => (
        <CurrencyValue
          value={row.original.totalValue}
          from={row.original.baseCurrency ?? 'USD'}
          className="font-mono text-mono-sm"
        />
      ),
    },
    {
      id: 'drift',
      header: 'Drift %',
      cell: ({ row }) => {
        // The account's real drift, from the same `/pms/drift/summary` every other drift readout
        // reads. This column used to derive a number from a character code of the account id
        // (`id.charCodeAt(id.length - 1) % 5 + 1.2`) — the same fabrication the preview handler
        // committed, on the step immediately before it. `maxAbsDrift` is the worst single
        // asset-class breach, which is what `needsRebalance` gates on; red is reserved for
        // accounts that are actually outside their model's own band rather than applied to every
        // row unconditionally.
        const drift = driftMap.get(row.original.id)
        if (!drift) return <span className="font-mono text-mono-sm text-text-tertiary">&mdash;</span>
        return (
          <span className={cn('font-mono text-mono-sm', drift.needsRebalance ? 'text-accent-red' : 'text-text-secondary')}>
            {(drift.maxAbsDrift * 100).toFixed(1)}%
          </span>
        )
      },
    },
  ]

  const STEP_LABELS = ['Select Model', 'Select Accounts', 'Preview Trades', 'Complete']

  return (
    <div className="flex flex-col gap-6">
      <ModelTradeStepIndicator steps={STEP_LABELS} currentStep={step} />

      {/* Step 1: Select Model */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-body text-text-secondary">
            Select a model portfolio to generate trades for all assigned accounts.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {models?.map((model) => (
              <div
                key={model.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedModel(model)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedModel(model) }}
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-colors hover:border-accent-blue/50',
                    selectedModel?.id === model.id && 'border-accent-blue ring-1 ring-accent-blue',
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-body-strong text-text-primary">{model.name}</h3>
                        <p className="mt-1 text-caption text-text-secondary">{model.description}</p>
                      </div>
                      <Badge variant={RISK_BADGE[model.riskProfile] ?? 'default'}>
                        {formatRiskLabel(model.riskProfile)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-6">
                      <div>
                        <span className="text-caption text-text-tertiary">Accounts</span>
                        <span className="ml-1 font-mono text-mono-sm font-semibold">{model.assignedAccounts}</span>
                      </div>
                      <div>
                        <span className="text-caption text-text-tertiary">AUM</span>
                        <span className="ml-1 font-mono text-mono-sm font-semibold">{formatWithConversion(model.totalAUM, 'USD', { compact: true })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleNextToAccounts}
              disabled={!selectedModel}
              className="rounded-md bg-accent-blue px-6 py-2 text-body font-semibold text-white transition-colors hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Accounts */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-section-header text-text-primary">
                Accounts assigned to {selectedModel?.name}
              </h2>
              <p className="mt-1 text-caption text-text-secondary">
                {selectedAccountIds.size} of {modelAccounts.length} accounts selected
              </p>
            </div>
            <button
              onClick={() => setStep(0)}
              className="text-body text-accent-blue hover:underline"
            >
              Back
            </button>
          </div>
          <Card>
            <CardContent className="p-0">
              <DataTable
                data={modelAccounts}
                columns={accountColumns}
                emptyMessage="No accounts assigned to this model"
              />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <button
              onClick={handlePreview}
              disabled={selectedAccountIds.size === 0 || previewMutation.isPending}
              className="rounded-md bg-accent-blue px-6 py-2 text-body font-semibold text-white transition-colors hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewMutation.isPending ? 'Generating...' : 'Preview Trades'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview Trades */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-section-header text-text-primary">Trade Preview</h2>
              <p className="mt-1 text-caption text-text-secondary">
                Review proposed trades before execution
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-body text-accent-blue hover:underline"
            >
              Back
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-caption text-text-secondary">Total Trades</p>
                <p className="mt-1 text-page-title text-text-primary">{totalTrades}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-caption text-text-secondary">Total Value</p>
                <p className="mt-1 font-mono text-page-title text-text-primary">{formatWithConversion(totalValue, 'USD')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-caption text-text-secondary">Est. Tax Impact</p>
                <p className="mt-1 font-mono text-page-title text-accent-red">{formatWithConversion(totalTaxImpact, 'USD')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-account collapsible sections */}
          <div className="space-y-3">
            {previews.map((preview) => (
              <Card key={preview.accountId}>
                <button
                  onClick={() => togglePreviewExpand(preview.accountId)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    {expandedPreviews.has(preview.accountId) ? (
                      <ChevronDown className="h-4 w-4 text-text-tertiary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-text-tertiary" />
                    )}
                    <div>
                      <span className="text-body-strong text-text-primary">{preview.accountName}</span>
                      <span className="ml-2 text-caption text-text-secondary">
                        {/* Percentage points already (see `ModelTradePreview.currentDrift`), shown
                            to 1dp like every other drift readout in the app. */}
                        Drift: {preview.currentDrift.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-caption text-text-secondary">
                      {preview.trades.length} trades
                    </span>
                    <span className="font-mono text-mono-sm text-text-secondary">
                      {/* §9.3 — the preview's own currency, not USD: acc-041's tax figure is HKD,
                          and reading HK$ as $ overstates it by 7.82x. */}
                      Tax: {formatWithConversion(preview.estimatedTaxImpact, preview.currency)}
                    </span>
                  </div>
                </button>
                {expandedPreviews.has(preview.accountId) && (
                  <div className="border-t border-border-primary px-4 pb-4">
                    <table className="mt-3 w-full text-body">
                      <thead>
                        <tr className="text-left text-caption font-semibold text-text-secondary">
                          <th className="pb-2">Symbol</th>
                          <th className="pb-2">Side</th>
                          <th className="pb-2">Quantity</th>
                          <th className="pb-2">Est. Value</th>
                          <th className="pb-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.trades.map((trade) => (
                          <tr key={`${preview.accountId}-${trade.assetClass}-${trade.symbol}`} className="border-t border-border-primary">
                            <td className="py-2 font-mono text-mono-sm font-medium">{trade.symbol}</td>
                            <td className="py-2">
                              <Badge variant={trade.side === 'buy' ? 'green' : 'red'}>
                                {trade.side.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-2 font-mono text-mono-sm">{trade.quantity.toLocaleString()}</td>
                            {/* §9.3 — the trade's own currency, matching the rebalance wizard's
                                PreviewTradesStep after Task 4. */}
                            <td className="py-2 font-mono text-mono-sm">{formatWithConversion(trade.estimatedValue, trade.currency)}</td>
                            <td className="py-2 text-caption text-text-secondary">{trade.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleExecute}
              disabled={executeMutation.isPending}
              className="rounded-md bg-accent-blue px-6 py-2 text-body font-semibold text-white transition-colors hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {executeMutation.isPending ? 'Executing...' : 'Execute All Trades'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 3 && (
        <div className="flex flex-col items-center justify-center py-16">
          <CheckCircle2 className="h-16 w-16 text-accent-green" />
          <h2 className="mt-4 text-page-title text-text-primary">Orders Submitted</h2>
          <p className="mt-2 text-body text-text-secondary">
            {ordersCreated} orders created across {selectedAccountIds.size} accounts
          </p>
          <button
            onClick={handleReset}
            className="mt-6 rounded-md bg-accent-blue px-6 py-2 text-body font-semibold text-white hover:bg-accent-blue/90"
          >
            Back to Trading
          </button>
        </div>
      )}
    </div>
  )
}

function ModelTradeStepIndicator({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, idx) => {
        let circleClass = 'bg-surface-tertiary text-text-tertiary'
        if (idx < currentStep) circleClass = 'bg-accent-green text-white'
        else if (idx === currentStep) circleClass = 'bg-accent-blue text-white'

        return (
          <div key={label} className="flex items-center gap-2">
            <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-caption font-semibold', circleClass)}>
              {idx < currentStep ? '\u2713' : idx + 1}
            </div>
            <span className={cn('text-caption font-medium', idx === currentStep ? 'text-text-primary' : 'text-text-tertiary')}>
              {label}
            </span>
            {idx < steps.length - 1 && <div className="mx-2 h-px w-8 bg-border-primary" />}
          </div>
        )
      })}
    </div>
  )
}
