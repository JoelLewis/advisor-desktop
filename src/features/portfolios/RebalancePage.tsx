import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2, Shield } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccounts } from '@/hooks/use-accounts'
import { useDriftSummary } from '@/hooks/use-portfolio'
import { useRebalancePreview, useExecuteRebalance, useTradeComplianceCheck } from '@/hooks/use-orders'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { RebalancePreview } from '@/services/oms'
import type { TradeComplianceResult, TradeComplianceCheck } from '@/types/compliance'

type WizardStep = 'select' | 'preview' | 'review' | 'execute'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'select', label: 'Select Accounts' },
  { id: 'preview', label: 'Preview Trades' },
  { id: 'review', label: 'Compliance Review' },
  { id: 'execute', label: 'Execute' },
]

export function RebalancePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselected = searchParams.get('accounts')?.split(',').filter(Boolean) ?? []

  const { data: accounts } = useAccounts({})
  const { data: driftSummary } = useDriftSummary()
  const previewMutation = useRebalancePreview()
  const executeMutation = useExecuteRebalance()
  const complianceMutation = useTradeComplianceCheck()

  const [step, setStep] = useState<WizardStep>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preselected))
  const [taxAware, setTaxAware] = useState(true)
  const [driftThreshold, setDriftThreshold] = useState(3.0)
  const [previews, setPreviews] = useState<RebalancePreview[]>([])
  const [complianceResults, setComplianceResults] = useState<TradeComplianceResult[]>([])

  // Auto-advance to preview if accounts were pre-selected
  useEffect(() => {
    if (preselected.length > 0 && accounts && driftSummary) {
      handlePreview()
    }
    // Only run on initial mount with preselected accounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, driftSummary])

  const driftMap = new Map(driftSummary?.map((d) => [d.accountId, d]) ?? [])
  const driftedAccounts = accounts?.filter((a) => driftMap.get(a.id)?.needsRebalance) ?? []

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handlePreview() {
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

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-caption font-medium',
              i < stepIndex ? 'bg-accent-green text-white' :
              i === stepIndex ? 'bg-accent-blue text-white' :
              'bg-surface-tertiary text-text-tertiary',
            )}>
              {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-caption', i === stepIndex ? 'font-medium text-text-primary' : 'text-text-tertiary')}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-border-primary" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 'select' && (
        <div className="space-y-4">
          <Card>
            <CardHeader action={
              <div className="flex items-center gap-4">
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
              Accounts Exceeding Drift Threshold
            </CardHeader>
            <CardContent>
              {!accounts ? (
                <Skeleton className="h-40" />
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
                          <span className="font-mono text-body">{formatCurrency(acc.totalValue, true)}</span>
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
                    {preview.trades.length} trades &middot; Tax impact: {formatCurrency(preview.estimatedTaxImpact, true)}
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
                          <td className="py-2 text-right font-mono">{formatCurrency(trade.estimatedValue, true)}</td>
                          <td className={cn('py-2 text-right font-mono', trade.taxImpact > 0 ? 'text-accent-red' : 'text-text-secondary')}>
                            {trade.taxImpact > 0 ? formatCurrency(trade.taxImpact, true) : '\u2014'}
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
              <span>Tax impact: <strong className="font-mono text-accent-red">{formatCurrency(totalTaxImpact, true)}</strong></span>
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
            const statusBadge = result.overallStatus === 'pass' ? 'green' as const
              : result.overallStatus === 'warning' ? 'yellow' as const
              : 'red' as const
            return (
              <Card key={result.accountId}>
                <CardHeader action={
                  <Badge variant={statusBadge}>{result.overallStatus}</Badge>
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

          {/* Summary banner */}
          {hasComplianceFailure && (
            <div className="flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/5 p-4 text-body text-accent-red">
              <XCircle className="h-5 w-5 shrink-0" />
              <span>One or more compliance checks failed. Resolve failures before executing.</span>
            </div>
          )}

          {!hasComplianceFailure && allComplianceChecks.some((c) => c.status === 'warning') && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-body text-amber-700">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>Compliance warnings detected. Review before proceeding.</span>
            </div>
          )}

          {!hasComplianceFailure && !allComplianceChecks.some((c) => c.status === 'warning') && (
            <div className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/5 p-4 text-body text-accent-green">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>All compliance checks passed. Ready to execute.</span>
            </div>
          )}

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

const CATEGORY_LABELS: Record<TradeComplianceCheck['category'], string> = {
  restricted_securities: 'Restricted',
  concentration_limit: 'Concentration',
  cash_minimum: 'Cash Reserve',
  wash_sale: 'Wash Sale',
  position_limit: 'Position Limit',
}

function ComplianceCheckRow({ check }: { check: TradeComplianceCheck }) {
  const icons = {
    pass: <CheckCircle2 className="h-4 w-4 text-accent-green" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    fail: <XCircle className="h-4 w-4 text-accent-red" />,
  }
  const variants = { pass: 'green' as const, warning: 'yellow' as const, fail: 'red' as const }

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-md border p-3',
      check.status === 'fail' ? 'border-accent-red/30 bg-accent-red/5' :
      check.status === 'warning' ? 'border-amber-200 bg-amber-50/50' :
      'border-border-primary',
    )}>
      {icons[check.status]}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-body-strong">{check.rule}</span>
          <Badge variant={variants[check.status]}>{check.status}</Badge>
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
              <span>Cash: <span className="font-mono font-medium">{formatCurrency(check.details.cashBalance)}</span></span>
            )}
            {check.details.minimumCash !== undefined && (
              <span>Min: <span className="font-mono font-medium">{formatCurrency(check.details.minimumCash)}</span></span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
