import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2, Shield, Layers } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccounts } from '@/hooks/use-accounts'
import { useDriftSummary, useModels } from '@/hooks/use-portfolio'
import { useRebalancePreview, useExecuteRebalance, useTradeComplianceCheck } from '@/hooks/use-orders'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import type { RebalancePreview } from '@/services/oms'
import type { TradeComplianceResult, TradeComplianceCheck } from '@/types/compliance'
import type { ModelAssignment } from '@/types/portfolio'

type WizardStep = 'select' | 'preview' | 'review' | 'execute'
type SelectionMode = 'accounts' | 'model'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'select', label: 'Select Accounts' },
  { id: 'preview', label: 'Preview Trades' },
  { id: 'review', label: 'Compliance Review' },
  { id: 'execute', label: 'Execute' },
]

const COMPLIANCE_STATUS_BADGE: Record<string, 'green' | 'yellow' | 'red'> = {
  pass: 'green',
  warning: 'yellow',
  fail: 'red',
}

const SELECTION_MODE_OPTIONS: { id: SelectionMode; label: string }[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'model', label: 'Model' },
]

export function RebalancePage() {
  const { formatWithConversion } = useFormatCurrency()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedAccounts = searchParams.get('accounts')?.split(',').filter(Boolean) ?? []
  const preselectedModel = searchParams.get('model')

  const { data: accounts } = useAccounts({})
  const { data: driftSummary } = useDriftSummary()
  const { data: models } = useModels()
  const previewMutation = useRebalancePreview()
  const executeMutation = useExecuteRebalance()
  const complianceMutation = useTradeComplianceCheck()

  const [step, setStep] = useState<WizardStep>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preselectedAccounts))
  const [taxAware, setTaxAware] = useState(true)
  const [driftThreshold, setDriftThreshold] = useState(3.0)
  const [previews, setPreviews] = useState<RebalancePreview[]>([])
  const [complianceResults, setComplianceResults] = useState<TradeComplianceResult[]>([])
  const autoAdvancedRef = useRef(false)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(preselectedModel ? 'model' : 'accounts')
  const [selectedModelId, setSelectedModelId] = useState<string | null>(preselectedModel)

  const driftMap = useMemo(() => new Map(driftSummary?.map((d) => [d.accountId, d]) ?? []), [driftSummary])
  const driftedAccounts = useMemo(() => accounts?.filter((a) => driftMap.get(a.id)?.needsRebalance) ?? [], [accounts, driftMap])

  // Build model -> drifted account mapping
  const driftedAccountsByModel = useMemo(() => {
    const map = new Map<string, string[]>()
    if (driftedAccounts.length > 0) {
      for (const acc of driftedAccounts) {
        const existing = map.get(acc.modelId)
        if (existing) {
          existing.push(acc.id)
        } else {
          map.set(acc.modelId, [acc.id])
        }
      }
    }
    return map
  }, [driftedAccounts])

  // Auto-select model accounts when preselectedModel is present
  useEffect(() => {
    if (preselectedModel && accounts && driftSummary) {
      const modelDriftedIds = driftedAccountsByModel.get(preselectedModel) ?? []
      if (modelDriftedIds.length > 0) {
        setSelectedIds(new Set(modelDriftedIds))
      }
    }
  }, [preselectedModel, accounts, driftSummary, driftedAccountsByModel])

  const handlePreview = useCallback(() => {
    if (selectedIds.size === 0) return
    previewMutation.mutate(
      { accountIds: [...selectedIds], driftThreshold: driftThreshold / 100, taxAware },
      {
        onSuccess: (data) => {
          setPreviews(data)
          setStep('preview')
        },
      },
    )
  }, [selectedIds, driftThreshold, taxAware, previewMutation])

  // Auto-advance to preview if accounts were pre-selected (not model mode)
  useEffect(() => {
    if (autoAdvancedRef.current) return
    if (preselectedAccounts.length > 0 && !preselectedModel && accounts && driftSummary) {
      autoAdvancedRef.current = true
      handlePreview()
    }
  }, [preselectedAccounts, preselectedModel, accounts, driftSummary, handlePreview])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectModel(modelId: string) {
    if (selectedModelId === modelId) {
      // Deselect model
      setSelectedModelId(null)
      setSelectedIds(new Set())
    } else {
      setSelectedModelId(modelId)
      const modelDriftedIds = driftedAccountsByModel.get(modelId) ?? []
      setSelectedIds(new Set(modelDriftedIds))
    }
  }

  function handleReviewCompliance() {
    const complianceRequests = previews.map((p) => ({
      accountId: p.accountId,
      trades: p.trades.map((t) => ({
        symbol: t.symbol,
        side: t.side,
        quantity: t.quantity,
        estimatedValue: t.estimatedValue,
      })),
    }))
    complianceMutation.mutate(complianceRequests, {
      onSuccess: (data) => {
        setComplianceResults(data)
        setStep('review')
      },
    })
  }

  function handleExecute() {
    executeMutation.mutate(
      { accountIds: [...selectedIds], taxAware },
      { onSuccess: () => setStep('execute') },
    )
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const allComplianceChecks = complianceResults.flatMap((r) => r.checks)
  const hasComplianceFailure = allComplianceChecks.some((c) => c.status === 'fail')
  const totalTrades = previews.reduce((sum, p) => sum + p.trades.length, 0)
  const totalTaxImpact = previews.reduce((sum, p) => sum + p.estimatedTaxImpact, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded p-1.5 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-page-title">Rebalance Wizard</h1>
          <p className="text-caption text-text-secondary">{selectedIds.size} account{selectedIds.size !== 1 ? 's' : ''} selected</p>
        </div>
      </div>

      <StepIndicator steps={STEPS.map((s) => s.label)} currentIndex={stepIndex} />

      {/* Step content */}
      {step === 'select' && (
        <div className="space-y-4">
          <Card>
            <CardHeader action={
              <div className="flex items-center gap-4">
                {/* Selection mode toggle */}
                <div className="flex items-center gap-2 text-caption text-text-secondary">
                  <span>Select by:</span>
                  <div className="inline-flex rounded-lg border border-border-primary">
                    {SELECTION_MODE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSelectionMode(opt.id)
                          if (opt.id === 'accounts') {
                            setSelectedModelId(null)
                          }
                        }}
                        className={cn(
                          'px-2.5 py-1 text-caption font-medium transition-colors first:rounded-l-[7px] last:rounded-r-[7px]',
                          selectionMode === opt.id
                            ? 'bg-accent-blue text-white'
                            : 'text-text-secondary hover:bg-surface-tertiary',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-caption text-text-secondary">
                  Drift threshold
                  <input
                    type="number"
                    value={driftThreshold}
                    onChange={(e) => setDriftThreshold(Number(e.target.value))}
                    className="w-16 rounded border border-border-secondary px-2 py-1 text-caption font-mono"
                    min={0.5}
                    max={10}
                    step={0.5}
                  />
                  %
                </label>
                <label className="flex items-center gap-2 text-caption text-text-secondary">
                  <input
                    type="checkbox"
                    checked={taxAware}
                    onChange={(e) => setTaxAware(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-accent-blue"
                  />
                  Tax-aware
                </label>
              </div>
            }>
              {selectionMode === 'accounts' ? 'Accounts Exceeding Drift Threshold' : 'Select Model to Rebalance'}
            </CardHeader>
            <CardContent>
              {!accounts ? (
                <Skeleton className="h-40" />
              ) : selectionMode === 'model' ? (
                <ModelSelectionView
                  models={models ?? []}
                  driftedAccountsByModel={driftedAccountsByModel}
                  accounts={accounts}
                  driftMap={driftMap}
                  selectedModelId={selectedModelId}
                  selectedIds={selectedIds}
                  onSelectModel={handleSelectModel}
                  onToggleAccount={toggleSelect}
                />
              ) : (
                <div className="space-y-2">
                  {driftedAccounts.map((acc) => {
                    const drift = driftMap.get(acc.id)
                    return (
                      <label
                        key={acc.id}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-md border px-4 py-3',
                          selectedIds.has(acc.id) ? 'border-accent-blue bg-accent-blue/5' : 'border-border-primary hover:bg-surface-tertiary',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(acc.id)}
                            onChange={() => toggleSelect(acc.id)}
                            className="h-4 w-4 rounded accent-accent-blue"
                          />
                          <div>
                            <p className="text-body-strong">{acc.name}</p>
                            <p className="font-mono text-caption text-text-tertiary">{acc.accountNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className="font-mono text-body">{formatWithConversion(acc.totalValue, 'USD', { compact: true })}</span>
                          <span className="font-mono text-caption text-accent-red">
                            {drift ? `${(drift.totalDrift * 100).toFixed(1)}% drift` : ''}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                  {driftedAccounts.length === 0 && (
                    <p className="py-8 text-center text-caption text-text-tertiary">
                      No accounts exceed the {driftThreshold}% drift threshold
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <button
              onClick={handlePreview}
              disabled={selectedIds.size === 0 || previewMutation.isPending}
              className="flex items-center gap-2 rounded bg-accent-blue px-4 py-2 text-body font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50"
            >
              {previewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Preview Trades
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          {previews.map((preview) => {
            const acc = accounts?.find((a) => a.id === preview.accountId)
            return (
              <Card key={preview.accountId}>
                <CardHeader action={
                  <span className="font-mono text-caption text-text-secondary">
                    {preview.trades.length} trades &middot; Tax impact: {formatWithConversion(preview.estimatedTaxImpact, 'USD', { compact: true })}
                  </span>
                }>
                  {acc?.name ?? preview.accountId}
                </CardHeader>
                <CardContent>
                  <table className="w-full text-caption">
                    <thead>
                      <tr className="border-b border-border-primary text-left text-text-secondary">
                        <th className="pb-2">Symbol</th>
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Side</th>
                        <th className="pb-2 text-right">Qty</th>
                        <th className="pb-2 text-right">Est. Value</th>
                        <th className="pb-2 text-right">Tax Impact</th>
                        <th className="pb-2">Wash Sale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.trades.map((trade) => (
                        <tr key={trade.symbol} className="border-b border-border-primary last:border-0">
                          <td className="py-2 font-mono font-medium">{trade.symbol}</td>
                          <td className="py-2 text-text-secondary">{trade.name}</td>
                          <td className="py-2">
                            <Badge variant={trade.side === 'buy' ? 'green' : 'red'}>{trade.side}</Badge>
                          </td>
                          <td className="py-2 text-right font-mono">{trade.quantity.toLocaleString()}</td>
                          <td className="py-2 text-right font-mono">{formatWithConversion(trade.estimatedValue, 'USD', { compact: true })}</td>
                          <td className={cn('py-2 text-right font-mono', trade.taxImpact > 0 ? 'text-accent-red' : 'text-text-secondary')}>
                            {trade.taxImpact > 0 ? formatWithConversion(trade.taxImpact, 'USD', { compact: true }) : '\u2014'}
                          </td>
                          <td className="py-2">
                            {trade.washSaleRisk && (
                              <Badge variant="yellow">Risk</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )
          })}

          <div className="flex items-center justify-between rounded-lg border border-border-primary bg-surface-tertiary p-4">
            <div className="flex items-center gap-6 text-body">
              <span><strong>{totalTrades}</strong> total trades</span>
              <span>Tax impact: <strong className="font-mono text-accent-red">{formatWithConversion(totalTaxImpact, 'USD', { compact: true })}</strong></span>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('select')} className="rounded border border-border-secondary px-4 py-2 text-body text-text-secondary hover:bg-surface-tertiary">
              Back
            </button>
            <button
              onClick={handleReviewCompliance}
              disabled={complianceMutation.isPending}
              className="flex items-center gap-2 rounded bg-accent-blue px-4 py-2 text-body font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50"
            >
              {complianceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Shield className="h-4 w-4" />
              Review Compliance
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          {/* Per-account compliance results */}
          {complianceResults.map((result) => {
            const acc = accounts?.find((a) => a.id === result.accountId)
            return (
              <Card key={result.accountId}>
                <CardHeader action={
                  <Badge variant={COMPLIANCE_STATUS_BADGE[result.overallStatus]}>{result.overallStatus}</Badge>
                }>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-text-tertiary" />
                    {acc?.name ?? result.accountId}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.checks.map((check, i) => (
                    <ComplianceCheckRow key={i} check={check} />
                  ))}
                </CardContent>
              </Card>
            )
          })}

          {complianceResults.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-caption text-text-tertiary">No compliance checks to display</p>
              </CardContent>
            </Card>
          )}

          <ComplianceSummaryBanner checks={allComplianceChecks} />

          <div className="flex justify-between">
            <button onClick={() => setStep('preview')} className="rounded border border-border-secondary px-4 py-2 text-body text-text-secondary hover:bg-surface-tertiary">
              Back
            </button>
            <button
              onClick={handleExecute}
              disabled={hasComplianceFailure || executeMutation.isPending}
              className="flex items-center gap-2 rounded bg-accent-green px-4 py-2 text-body font-medium text-white hover:bg-accent-green/90 disabled:opacity-50"
            >
              {executeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <RefreshCw className="h-4 w-4" />
              Execute Rebalance
            </button>
          </div>
        </div>
      )}

      {step === 'execute' && (
        <div className="space-y-4">
          <Card className="border-l-[3px] border-l-accent-green">
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-accent-green" />
              <h2 className="mt-4 text-section-header">Rebalance Orders Submitted</h2>
              <p className="mt-2 text-body text-text-secondary">
                {selectedIds.size} account{selectedIds.size !== 1 ? 's' : ''} rebalanced with {totalTrades} total trades.
              </p>
              {executeMutation.data && (
                <div className="mx-auto mt-4 max-w-md space-y-2">
                  {executeMutation.data.map((result) => {
                    const acc = accounts?.find((a) => a.id === result.accountId)
                    return (
                      <div key={result.accountId} className="flex items-center justify-between rounded border border-border-primary px-4 py-2 text-caption">
                        <span>{acc?.name ?? result.accountId}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="green">{result.status}</Badge>
                          <span className="text-text-secondary">{result.ordersCreated} orders</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <button
                onClick={() => navigate('/portfolios')}
                className="mt-6 rounded bg-accent-blue px-4 py-2 text-body font-medium text-white hover:bg-accent-blue/90"
              >
                Return to Portfolios
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Model Selection View ──

function ModelSelectionView({
  models,
  driftedAccountsByModel,
  accounts,
  driftMap,
  selectedModelId,
  selectedIds,
  onSelectModel,
  onToggleAccount,
}: {
  models: ModelAssignment[]
  driftedAccountsByModel: Map<string, string[]>
  accounts: { id: string; name: string; accountNumber: string; totalValue: number; modelId: string }[]
  driftMap: Map<string, { totalDrift: number; needsRebalance: boolean }>
  selectedModelId: string | null
  selectedIds: Set<string>
  onSelectModel: (modelId: string) => void
  onToggleAccount: (accountId: string) => void
}) {
  const { formatWithConversion } = useFormatCurrency()
  // Only show models that have drifted accounts
  const modelsWithDrift = models.filter((m) => (driftedAccountsByModel.get(m.id)?.length ?? 0) > 0)
  const modelsWithoutDrift = models.filter((m) => (driftedAccountsByModel.get(m.id)?.length ?? 0) === 0)

  const selectedModelAccounts = selectedModelId
    ? accounts.filter((a) => a.modelId === selectedModelId && driftMap.get(a.id)?.needsRebalance)
    : []

  return (
    <div className="space-y-4">
      {/* Model cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {modelsWithDrift.map((model) => {
          const driftedCount = driftedAccountsByModel.get(model.id)?.length ?? 0
          const modelAccounts = accounts.filter((a) => a.modelId === model.id)
          const totalAUM = modelAccounts.reduce((sum, a) => sum + a.totalValue, 0)
          const isSelected = selectedModelId === model.id

          return (
            <button
              key={model.id}
              onClick={() => onSelectModel(model.id)}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                isSelected
                  ? 'border-accent-blue bg-accent-blue/5 ring-1 ring-accent-blue'
                  : 'border-border-primary hover:bg-surface-tertiary',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent-blue" />
                  <span className="text-body-strong">{model.name}</span>
                </div>
                {isSelected && (
                  <Badge variant="blue">Selected</Badge>
                )}
              </div>
              <p className="mt-1 text-caption text-text-secondary">{model.description}</p>
              <div className="mt-2 flex gap-4 text-caption">
                <span className="text-text-secondary">{modelAccounts.length} accounts</span>
                <span className="font-mono text-text-secondary">{formatWithConversion(totalAUM, 'USD', { compact: true })}</span>
                <span className="text-accent-red">
                  <AlertTriangle className="mr-0.5 inline h-3 w-3" />
                  {driftedCount} drifted
                </span>
              </div>
            </button>
          )
        })}
        {modelsWithoutDrift.map((model) => {
          const modelAccounts = accounts.filter((a) => a.modelId === model.id)
          const totalAUM = modelAccounts.reduce((sum, a) => sum + a.totalValue, 0)

          return (
            <div
              key={model.id}
              className="rounded-lg border border-border-primary p-4 opacity-50"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-text-tertiary" />
                <span className="text-body-strong text-text-secondary">{model.name}</span>
              </div>
              <p className="mt-1 text-caption text-text-tertiary">{model.description}</p>
              <div className="mt-2 flex gap-4 text-caption">
                <span className="text-text-tertiary">{modelAccounts.length} accounts</span>
                <span className="font-mono text-text-tertiary">{formatWithConversion(totalAUM, 'USD', { compact: true })}</span>
                <span className="text-accent-green">No drift</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Individual account selection under selected model */}
      {selectedModelId && selectedModelAccounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-caption font-medium text-text-secondary">
            Drifted accounts in {models.find((m) => m.id === selectedModelId)?.name} - deselect individual accounts if needed:
          </p>
          {selectedModelAccounts.map((acc) => {
            const drift = driftMap.get(acc.id)
            return (
              <label
                key={acc.id}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-md border px-4 py-3',
                  selectedIds.has(acc.id) ? 'border-accent-blue bg-accent-blue/5' : 'border-border-primary hover:bg-surface-tertiary',
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(acc.id)}
                    onChange={() => onToggleAccount(acc.id)}
                    className="h-4 w-4 rounded accent-accent-blue"
                  />
                  <div>
                    <p className="text-body-strong">{acc.name}</p>
                    <p className="font-mono text-caption text-text-tertiary">{acc.accountNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-mono text-body">{formatWithConversion(acc.totalValue, 'USD', { compact: true })}</span>
                  <span className="font-mono text-caption text-accent-red">
                    {drift ? `${(drift.totalDrift * 100).toFixed(1)}% drift` : ''}
                  </span>
                </div>
              </label>
            )
          })}
        </div>
      )}

      {models.length === 0 && (
        <p className="py-8 text-center text-caption text-text-tertiary">No models available</p>
      )}
    </div>
  )
}

// ── Helper Components ──

const CATEGORY_LABELS: Record<TradeComplianceCheck['category'], string> = {
  restricted_securities: 'Restricted',
  concentration_limit: 'Concentration',
  cash_minimum: 'Cash Reserve',
  wash_sale: 'Wash Sale',
  position_limit: 'Position Limit',
}

function StepIndicator({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        let circleClass = 'bg-surface-tertiary text-text-tertiary'
        if (i < currentIndex) circleClass = 'bg-accent-green text-white'
        else if (i === currentIndex) circleClass = 'bg-accent-blue text-white'

        return (
          <div key={label} className="flex items-center gap-2">
            <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-caption font-medium', circleClass)}>
              {i < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-caption', i === currentIndex ? 'font-medium text-text-primary' : 'text-text-tertiary')}>
              {label}
            </span>
            {i < steps.length - 1 && <div className="mx-2 h-px w-8 bg-border-primary" />}
          </div>
        )
      })}
    </div>
  )
}

function ComplianceSummaryBanner({ checks }: { checks: TradeComplianceCheck[] }) {
  const hasFailure = checks.some((c) => c.status === 'fail')
  const hasWarning = checks.some((c) => c.status === 'warning')

  if (hasFailure) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/5 p-4 text-body text-accent-red">
        <XCircle className="h-5 w-5 shrink-0" />
        <span>One or more compliance checks failed. Resolve failures before executing.</span>
      </div>
    )
  }

  if (hasWarning) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-body text-amber-700">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span>Compliance warnings detected. Review before proceeding.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/5 p-4 text-body text-accent-green">
      <CheckCircle2 className="h-5 w-5 shrink-0" />
      <span>All compliance checks passed. Ready to execute.</span>
    </div>
  )
}

const CHECK_BORDER_STYLES: Record<string, string> = {
  fail: 'border-accent-red/30 bg-accent-red/5',
  warning: 'border-amber-200 bg-amber-50/50',
  pass: 'border-border-primary',
}

const CHECK_ICONS: Record<string, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warning: AlertTriangle,
  fail: XCircle,
}

const CHECK_ICON_COLORS: Record<string, string> = {
  pass: 'text-accent-green',
  warning: 'text-amber-500',
  fail: 'text-accent-red',
}

function ComplianceCheckRow({ check }: { check: TradeComplianceCheck }) {
  const { formatWithConversion } = useFormatCurrency()
  const StatusIcon = CHECK_ICONS[check.status] ?? AlertTriangle

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-md border p-3',
      CHECK_BORDER_STYLES[check.status],
    )}>
      <StatusIcon className={cn('h-4 w-4', CHECK_ICON_COLORS[check.status])} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-body-strong">{check.rule}</span>
          <Badge variant={COMPLIANCE_STATUS_BADGE[check.status]}>{check.status}</Badge>
          <Badge variant="default">{CATEGORY_LABELS[check.category]}</Badge>
        </div>
        <p className="mt-0.5 text-caption text-text-secondary">{check.message}</p>
        {check.details && (
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-tertiary">
            {check.details.symbol && <span>Symbol: <span className="font-mono font-medium">{check.details.symbol}</span></span>}
            {check.details.currentWeight !== undefined && (
              <span>Current: <span className="font-mono font-medium">{(check.details.currentWeight * 100).toFixed(1)}%</span></span>
            )}
            {check.details.postTradeWeight !== undefined && (
              <span>Post-trade: <span className="font-mono font-medium">{(check.details.postTradeWeight * 100).toFixed(1)}%</span></span>
            )}
            {check.details.limit !== undefined && (
              <span>Limit: <span className="font-mono font-medium">{(check.details.limit * 100).toFixed(0)}%</span></span>
            )}
            {check.details.cashBalance !== undefined && (
              <span>Cash: <span className="font-mono font-medium">{formatWithConversion(check.details.cashBalance, 'USD')}</span></span>
            )}
            {check.details.minimumCash !== undefined && (
              <span>Min: <span className="font-mono font-medium">{formatWithConversion(check.details.minimumCash, 'USD')}</span></span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
