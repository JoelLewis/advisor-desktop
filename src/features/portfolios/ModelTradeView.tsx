import { useState, useMemo } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { useAccounts } from '@/hooks/use-accounts'
import { useModelGovernance } from '@/hooks/use-portfolio'
import { useModelTradePreview, useExecuteModelTrades } from '@/hooks/use-trading'
import { formatCurrency, cn } from '@/lib/utils'
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
  const { data: models } = useModelGovernance()
  const { data: allAccounts } = useAccounts({})
  const previewMutation = useModelTradePreview()
  const executeMutation = useExecuteModelTrades()

  const [step, setStep] = useState(0)
  const [selectedModel, setSelectedModel] = useState<ModelGovernanceDetail | null>(null)
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
  const [previews, setPreviews] = useState<ModelTradePreview[]>([])
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set())
  const [ordersCreated, setOrdersCreated] = useState(0)

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
  const totalValue = previews.reduce((sum, p) => sum + p.trades.reduce((ts, t) => ts + t.estimatedValue, 0), 0)
  const totalTaxImpact = previews.reduce((sum, p) => sum + p.estimatedTaxImpact, 0)

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
      cell: ({ getValue }) => <span className="font-mono text-mono-sm">{formatCurrency(getValue<number>())}</span>,
    },
    {
      id: 'drift',
      header: 'Drift %',
      cell: ({ row }) => {
        // Deterministic mock drift based on account ID
        const drift = ((row.original.id.charCodeAt(row.original.id.length - 1) % 5) + 1.2).toFixed(1)
        return <span className="font-mono text-mono-sm text-accent-red">{drift}%</span>
      },
    },
  ]

  const STEP_LABELS = ['Select Model', 'Select Accounts', 'Preview Trades', 'Complete']

  return (
    <div className="space-y-6">
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
                        <span className="ml-1 font-mono text-mono-sm font-semibold">{formatCurrency(model.totalAUM, true)}</span>
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
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-caption text-text-secondary">Total Trades</p>
                <p className="mt-1 text-page-title text-text-primary">{totalTrades}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-caption text-text-secondary">Total Value</p>
                <p className="mt-1 font-mono text-page-title text-text-primary">{formatCurrency(totalValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-caption text-text-secondary">Est. Tax Impact</p>
                <p className="mt-1 font-mono text-page-title text-accent-red">{formatCurrency(totalTaxImpact)}</p>
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
                        Drift: {preview.currentDrift}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-caption text-text-secondary">
                      {preview.trades.length} trades
                    </span>
                    <span className="font-mono text-mono-sm text-text-secondary">
                      Tax: {formatCurrency(preview.estimatedTaxImpact)}
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
                          <tr key={`${preview.accountId}-${trade.symbol}`} className="border-t border-border-primary">
                            <td className="py-2 font-mono text-mono-sm font-medium">{trade.symbol}</td>
                            <td className="py-2">
                              <Badge variant={trade.side === 'buy' ? 'green' : 'red'}>
                                {trade.side.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-2 font-mono text-mono-sm">{trade.quantity}</td>
                            <td className="py-2 font-mono text-mono-sm">{formatCurrency(trade.estimatedValue)}</td>
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
