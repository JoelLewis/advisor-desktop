import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, AlertTriangle, ArrowRight, Plus } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { TabLayout } from '@/components/ui/TabLayout'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { AllocationChart } from '@/components/ui/AllocationChart'
import { Skeleton } from '@/components/ui/Skeleton'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { ShareButton } from '@/components/ui/ShareButton'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { ConcentrationView } from './ConcentrationView'
import { TradeTicketDialog } from './TradeTicketDialog'
import { useAccount } from '@/hooks/use-accounts'
import { usePositions, useDrift, usePerformance, useBenchmark, useRiskMetrics, useFactorExposures, useStressScenarios } from '@/hooks/use-portfolio'
import { useAccountOrders } from '@/hooks/use-orders'
import { useAIInsights } from '@/hooks/use-ai'
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Position } from '@/types/portfolio'
import type { BenchmarkComparison } from '@/types/performance'
import type { Order } from '@/services/oms'
import type { ColumnDef } from '@tanstack/react-table'

const ASSET_CLASS_LABELS: Record<string, string> = {
  us_equity: 'US Equity', intl_equity: 'Intl Equity', emerging_markets: 'EM',
  fixed_income: 'Fixed Income', alternatives: 'Alts', real_estate: 'Real Estate',
  commodities: 'Commodities', cash: 'Cash', digital_assets: 'Digital Assets',
  private_equity: 'Private Equity',
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual', joint: 'Joint', traditional_ira: 'Traditional IRA',
  roth_ira: 'Roth IRA', sep_ira: 'SEP IRA', '401k': '401(k)',
  roth_401k: 'Roth 401(k)', '529': '529 Plan', trust_revocable: 'Revocable Trust',
  trust_irrevocable: 'Irrevocable Trust', ugma_utma: 'UGMA/UTMA', entity: 'Entity',
}

const COST_BASIS_LABELS: Record<string, string> = {
  specific_id: 'Specific Identification',
  fifo: 'FIFO (First In, First Out)',
  average_cost: 'Average Cost',
}

function makePositionColumns(onTrade?: (symbol: string, side: 'buy' | 'sell') => void): ColumnDef<Position, unknown>[] {
  const cols: ColumnDef<Position, unknown>[] = [
    {
      accessorKey: 'symbol', header: 'Symbol',
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-body-strong">{row.original.symbol}</p>
          <p className="text-caption text-text-tertiary">{row.original.name}</p>
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: 'assetClass', header: 'Asset Class',
      cell: ({ row }) => <span className="text-caption">{ASSET_CLASS_LABELS[row.original.assetClass] ?? row.original.assetClass}</span>,
      size: 110,
    },
    {
      accessorKey: 'quantity', header: 'Qty',
      cell: ({ row }) => <span className="font-mono">{row.original.quantity.toLocaleString()}</span>,
      size: 80,
    },
    {
      accessorKey: 'price', header: 'Price',
      cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.price)}</span>,
      size: 100,
    },
    {
      accessorKey: 'marketValue', header: 'Mkt Value',
      cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.marketValue, true)}</span>,
      size: 100,
    },
    {
      accessorKey: 'weight', header: 'Weight',
      cell: ({ row }) => <span className="font-mono">{(row.original.weight * 100).toFixed(1)}%</span>,
      size: 70,
    },
    {
      accessorKey: 'gainLoss', header: 'Gain/Loss',
      cell: ({ row }) => (
        <div className={cn('font-mono', row.original.gainLoss >= 0 ? 'text-accent-green' : 'text-accent-red')}>
          <p>{formatCurrency(row.original.gainLoss, true)}</p>
          <p className="text-caption">{formatPercent(row.original.gainLossPercent * 100)}</p>
        </div>
      ),
      size: 110,
    },
  ]

  if (onTrade) {
    cols.push({
      id: 'trade',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => onTrade(row.original.symbol, 'buy')}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-accent-green transition-colors hover:bg-accent-green/10"
          >
            Buy
          </button>
          <button
            onClick={() => onTrade(row.original.symbol, 'sell')}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-accent-red transition-colors hover:bg-accent-red/10"
          >
            Sell
          </button>
        </div>
      ),
      size: 90,
    })
  }

  return cols
}

const benchmarkColumns: ColumnDef<BenchmarkComparison, unknown>[] = [
  { accessorKey: 'period', header: 'Period', cell: ({ row }) => <span className="font-mono uppercase">{row.original.period}</span>, size: 80 },
  { accessorKey: 'portfolioReturn', header: 'Portfolio', cell: ({ row }) => <span className="font-mono">{formatPercent(row.original.portfolioReturn * 100)}</span>, size: 100 },
  { accessorKey: 'benchmarkReturn', header: 'Benchmark', cell: ({ row }) => <span className="font-mono">{formatPercent(row.original.benchmarkReturn * 100)}</span>, size: 100 },
  {
    accessorKey: 'alpha', header: 'Alpha',
    cell: ({ row }) => (
      <span className={cn('font-mono', row.original.alpha >= 0 ? 'text-accent-green' : 'text-accent-red')}>
        {formatPercent(row.original.alpha * 100)}
      </span>
    ),
    size: 80,
  },
  { accessorKey: 'trackingError', header: 'TE', cell: ({ row }) => <span className="font-mono text-text-secondary">{(row.original.trackingError * 100).toFixed(2)}%</span>, size: 80 },
]

const orderColumns: ColumnDef<Order, unknown>[] = [
  {
    accessorKey: 'symbol', header: 'Symbol',
    cell: ({ row }) => <span className="font-mono text-body-strong">{row.original.symbol}</span>,
    size: 80,
  },
  {
    accessorKey: 'side', header: 'Side',
    cell: ({ row }) => (
      <Badge variant={row.original.side === 'buy' ? 'green' : 'red'}>{row.original.side}</Badge>
    ),
    size: 70,
  },
  {
    accessorKey: 'quantity', header: 'Qty',
    cell: ({ row }) => <span className="font-mono">{row.original.quantity.toLocaleString()}</span>,
    size: 70,
  },
  {
    accessorKey: 'orderType', header: 'Type',
    cell: ({ row }) => <span className="text-caption">{row.original.orderType}{row.original.limitPrice ? ` @ ${formatCurrency(row.original.limitPrice)}` : ''}</span>,
    size: 120,
  },
  {
    accessorKey: 'status', header: 'Status',
    cell: ({ row }) => {
      const v = { pending: 'yellow' as const, submitted: 'blue' as const, filled: 'green' as const, cancelled: 'default' as const }
      return <Badge variant={v[row.original.status]}>{row.original.status}</Badge>
    },
    size: 100,
  },
  {
    accessorKey: 'filledPrice', header: 'Fill Price',
    cell: ({ row }) => <span className="font-mono">{row.original.filledPrice ? formatCurrency(row.original.filledPrice) : '—'}</span>,
    size: 100,
  },
  {
    accessorKey: 'submittedAt', header: 'Submitted',
    cell: ({ row }) => <span className="font-mono text-caption text-text-secondary">{formatDate(row.original.submittedAt)}</span>,
    size: 110,
  },
]

const FACTOR_COLORS = { positive: '#2563EB', negative: '#DC2626', benchmark: '#94A3B8' }

export function AccountDetailPage() {
  const { accountId } = useParams()
  const navigate = useNavigate()
  const id = accountId ?? ''
  const { data: account, isLoading } = useAccount(id)
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false)
  const [tradePrefill, setTradePrefill] = useState<{ symbol?: string; side?: 'buy' | 'sell' }>({})
  const { data: positions } = usePositions(id)
  const { data: drift } = useDrift(id)
  const { data: performance } = usePerformance(id)
  const { data: benchmark } = useBenchmark(id)
  const { data: risk } = useRiskMetrics(id)
  const { data: factors } = useFactorExposures(id)
  const { data: stress } = useStressScenarios(id)
  const { data: orders } = useAccountOrders(id)
  const { data: insights } = useAIInsights('account_detail', id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!account) {
    return <div className="py-12 text-center text-text-tertiary">Account not found</div>
  }

  // Derive allocation from positions
  const allocation = positions
    ? Object.entries(
        positions.reduce<Record<string, number>>((acc, p) => {
          acc[p.assetClass] = (acc[p.assetClass] ?? 0) + p.weight
          return acc
        }, {}),
      ).map(([assetClass, weight]) => ({ assetClass, weight }))
    : []

  const totalGainLoss = positions?.reduce((sum, p) => sum + p.gainLoss, 0) ?? 0

  function handlePositionTrade(symbol: string, side: 'buy' | 'sell') {
    setTradePrefill({ symbol, side })
    setTradeDialogOpen(true)
  }

  const tabs = [
    {
      id: 'overview', label: 'Overview',
      content: (
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Allocation + Key Stats */}
          <div className="col-span-2 space-y-6">
            <Card>
              <CardHeader>Asset Allocation</CardHeader>
              <CardContent className="flex items-start gap-8">
                <AllocationChart data={allocation} size="lg" />
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-caption text-text-secondary">Total Value</p>
                      <p className="font-mono text-section-header">{formatCurrency(account.totalValue, true)}</p>
                    </div>
                    <div>
                      <p className="text-caption text-text-secondary">Cash Balance</p>
                      <p className="font-mono text-section-header">{formatCurrency(account.cashBalance, true)}</p>
                    </div>
                    <div>
                      <p className="text-caption text-text-secondary">Unrealized G/L</p>
                      <p className={cn('font-mono text-section-header', totalGainLoss >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                        {formatCurrency(totalGainLoss, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-text-secondary">Positions</p>
                      <p className="font-mono text-section-header">{positions?.length ?? 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* UMA Sleeves */}
            {account.isUMA && account.sleeves && (
              <Card>
                <CardHeader>UMA Sleeves</CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {account.sleeves.map((sleeve) => (
                      <div key={sleeve.id} className="flex items-center justify-between rounded-md border border-border-primary px-4 py-3">
                        <div>
                          <p className="text-body-strong">{sleeve.name}</p>
                          <p className="text-caption text-text-secondary">{sleeve.strategy} — {sleeve.manager}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono">{formatCurrency(sleeve.value, true)}</p>
                          <div className="flex items-center gap-2 text-caption">
                            <span className="text-text-secondary">Target {(sleeve.targetAllocation * 100).toFixed(0)}%</span>
                            <span className={cn(
                              'font-mono',
                              Math.abs(sleeve.actualAllocation - sleeve.targetAllocation) > 0.02 ? 'text-accent-red' : 'text-accent-green',
                            )}>
                              Actual {(sleeve.actualAllocation * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Insights */}
            {insights && insights.length > 0 && (
              <AIInsightStack insights={insights} />
            )}
          </div>

          {/* Right: Account Info + Drift */}
          <div className="space-y-6">
            <Card>
              <CardHeader>Account Info</CardHeader>
              <CardContent className="space-y-2 text-body">
                <InfoRow label="Type" value={ACCOUNT_TYPE_LABELS[account.type] ?? account.type} />
                <InfoRow label="Tax" value={account.taxTreatment.replace('_', ' ')} />
                <InfoRow label="Custodian" value={account.custodian} />
                <InfoRow label="Opened" value={formatDate(account.openDate)} />
                <InfoRow label="Last Rebalance" value={account.lastRebalance ? formatDate(account.lastRebalance) : 'Never'} />
                <InfoRow label="Model" value={account.modelId} />
                <InfoRow label="Cost Basis" value={COST_BASIS_LABELS[account.costBasisMethod] ?? account.costBasisMethod} />
              </CardContent>
            </Card>

            {drift && (
              <Card className={drift.needsRebalance ? 'border-l-[3px] border-l-accent-red' : ''}>
                <CardHeader
                  action={
                    <ActionMenu
                      context={{
                        entityType: 'account',
                        entityId: id,
                        entityName: account.name,
                        actionDescription: drift.needsRebalance ? 'Rebalance account — drift above threshold' : 'Analyze drift for account',
                      }}
                      variant="compact"
                    />
                  }
                >
                  Drift Analysis
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-caption text-text-secondary">Total Drift</span>
                    <span className={cn('font-mono text-section-header', drift.needsRebalance ? 'text-accent-red' : 'text-accent-green')}>
                      {(drift.totalDrift * 100).toFixed(1)}%
                    </span>
                  </div>
                  {drift.needsRebalance && (
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-caption text-accent-red">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Rebalance recommended</span>
                      </div>
                      <button
                        onClick={() => navigate(`/portfolios/rebalance?accounts=${id}`)}
                        className="rounded bg-accent-blue px-2.5 py-1 text-caption font-medium text-white hover:bg-accent-blue/90"
                      >
                        Rebalance Now
                      </button>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {drift.assetClassDrifts.map((d) => (
                      <div key={d.assetClass} className="flex items-center justify-between text-caption">
                        <span className="text-text-secondary">{ASSET_CLASS_LABELS[d.assetClass] ?? d.assetClass}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-text-tertiary">{(d.target * 100).toFixed(0)}% / {(d.actual * 100).toFixed(0)}%</span>
                          <span className={cn('font-mono font-medium', d.drift > 0.02 ? 'text-accent-red' : 'text-accent-green')}>
                            {(d.drift * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI insight */}
            <Card className="border-l-[3px] border-l-accent-purple">
              <CardContent className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-purple" />
                <div className="flex-1">
                  <p className="text-body-strong text-accent-purple">AI Insight</p>
                  <p className="mt-1 text-caption text-text-secondary">
                    This account has {drift?.needsRebalance ? 'drifted beyond threshold and should be rebalanced' : 'acceptable drift levels'}.
                    {totalGainLoss > 0 && ` Unrealized gains of ${formatCurrency(totalGainLoss, true)} — consider tax-loss harvesting opportunities in underperforming positions.`}
                    {risk && ` Sharpe ratio of ${risk.sharpe.toFixed(2)} indicates ${risk.sharpe > 1.2 ? 'strong' : 'moderate'} risk-adjusted returns.`}
                  </p>
                  <div className="mt-2">
                    <ActionMenu
                      context={{
                        entityType: 'account',
                        entityId: id,
                        entityName: account.name,
                        actionDescription: 'Analyze AI insight and recommend next steps for this account',
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      id: 'positions', label: 'Positions', count: positions?.length,
      content: (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setTradePrefill({})
                setTradeDialogOpen(true)
              }}
              className="flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90"
            >
              <Plus className="h-3.5 w-3.5" /> New Trade
            </button>
          </div>
          <Card>
            <DataTable data={positions ?? []} columns={makePositionColumns(handlePositionTrade)} compact />
          </Card>
        </div>
      ),
    },
    {
      id: 'performance', label: 'Performance',
      content: (
        <div className="space-y-6">
          <Card>
            <CardHeader>Growth of $100</CardHeader>
            <CardContent>
              {performance && (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={performance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} domain={['auto', 'auto']} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="value" stroke="var(--accent-blue)" strokeWidth={2} dot={false} name="Portfolio" />
                    <Line type="monotone" dataKey="benchmark" stroke="var(--text-tertiary)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Benchmark" />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {benchmark && (
            <Card>
              <CardHeader>Benchmark Comparison</CardHeader>
              <DataTable data={benchmark} columns={benchmarkColumns} compact />
            </Card>
          )}

          <Link
            to={`/portfolios/accounts/${id}/attribution`}
            className="flex items-center gap-2 rounded-md border border-accent-blue px-4 py-2.5 text-body font-medium text-accent-blue transition-colors hover:bg-accent-blue/5"
          >
            View Brinson Attribution Analysis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ),
    },
    {
      id: 'risk', label: 'Risk',
      content: (
        <div className="space-y-6">
          {risk && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent>
                  <p className="text-caption text-text-secondary">Beta</p>
                  <p className="font-mono text-section-header">{risk.beta.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-caption text-text-secondary">Sharpe Ratio</p>
                  <p className="font-mono text-section-header">{risk.sharpe.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-caption text-text-secondary">Sortino Ratio</p>
                  <p className="font-mono text-section-header">{risk.sortino.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-caption text-text-secondary">Max Drawdown</p>
                  <p className="font-mono text-section-header text-accent-red">{(risk.maxDrawdown * 100).toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-caption text-text-secondary">Std Deviation</p>
                  <p className="font-mono text-section-header">{(risk.standardDeviation * 100).toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-caption text-text-secondary">VaR (95%)</p>
                  <p className="font-mono text-section-header text-accent-red">{formatCurrency(risk.var95, true)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {factors && (
            <Card>
              <CardHeader>Factor Exposure</CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={factors} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                    <YAxis type="category" dataKey="factor" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} width={80} />
                    <RechartsTooltip />
                    <Bar dataKey="exposure" name="Portfolio" radius={[0, 4, 4, 0]}>
                      {factors.map((f, i) => (
                        <Cell key={i} fill={f.exposure >= 0 ? FACTOR_COLORS.positive : FACTOR_COLORS.negative} />
                      ))}
                    </Bar>
                    <Bar dataKey="benchmark" name="Benchmark" fill={FACTOR_COLORS.benchmark} radius={[0, 4, 4, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {stress && (
            <Card>
              <CardHeader>Stress Scenarios</CardHeader>
              <CardContent className="space-y-4">
                {stress.map((scenario) => (
                  <div key={scenario.id} className="rounded-md border border-border-primary p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-strong">{scenario.name}</p>
                        <p className="text-caption text-text-secondary">{scenario.description}</p>
                      </div>
                      <p className="font-mono text-section-header text-accent-red">
                        {(scenario.portfolioImpact * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="mt-3 space-y-1">
                      {scenario.positionImpacts.map((pi) => (
                        <div key={pi.positionId} className="flex items-center justify-between text-caption">
                          <span className="font-mono text-text-secondary">{pi.symbol}</span>
                          <span className={cn('font-mono', pi.impactPercent >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                            {formatPercent(pi.impactPercent * 100)} ({formatCurrency(pi.impact, true)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: 'concentration', label: 'Concentration',
      content: <ConcentrationView accountId={id} />,
    },
    {
      id: 'orders', label: 'Orders', count: orders?.length,
      content: (
        <Card>
          <DataTable data={orders ?? []} columns={orderColumns} compact emptyMessage="No orders" />
        </Card>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Trade Ticket Dialog */}
      <TradeTicketDialog
        open={tradeDialogOpen}
        onClose={() => setTradeDialogOpen(false)}
        accountId={id}
        accountName={account.name}
        prefill={tradePrefill}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded p-1.5 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-page-title">{account.name}</h1>
          <p className="font-mono text-caption text-text-tertiary">{account.accountNumber}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={account.taxTreatment === 'tax_free' ? 'green' : account.taxTreatment === 'tax_deferred' ? 'yellow' : 'default'}>
            {account.taxTreatment.replace('_', ' ')}
          </Badge>
          {account.isUMA && <Badge variant="purple">UMA</Badge>}
          <Badge variant={account.status === 'active' ? 'green' : 'default'}>{account.status}</Badge>
          <ShareButton card={{
            variant: 'account_summary',
            entityId: account.id,
            entityName: account.name,
            metrics: [{ label: 'Value', value: formatCurrency(account.totalValue, true) }],
          }} />
        </div>
      </div>

      <TabLayout tabs={tabs} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="text-caption font-medium">{value}</span>
    </div>
  )
}
