import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertTriangle, RefreshCw, GitBranch, ArrowRightLeft, ChevronDown, ChevronRight, Users, Layers } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { DenseMetricsBar } from '@/components/ui/DenseMetricsBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useAccounts } from '@/hooks/use-accounts'
import { useHouseholds } from '@/hooks/use-households'
import { useModels, useDriftSummary } from '@/hooks/use-portfolio'
import { useAIInsights } from '@/hooks/use-ai'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types/account'
import type { CurrencyCode } from '@/types/currency'
import type { DriftStatus, ModelAssignment } from '@/types/portfolio'
import type { ColumnDef } from '@tanstack/react-table'

type PortfolioView = 'accounts' | 'households' | 'models'

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  individual: 'Individual', joint: 'Joint', traditional_ira: 'Trad IRA',
  roth_ira: 'Roth IRA', sep_ira: 'SEP IRA', '401k': '401(k)',
  roth_401k: 'Roth 401(k)', '529': '529', trust_revocable: 'Rev Trust',
  trust_irrevocable: 'Irrev Trust', ugma_utma: 'UGMA/UTMA', entity: 'Entity',
}

const VIEW_OPTIONS: { id: PortfolioView; label: string }[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'households', label: 'Households' },
  { id: 'models', label: 'Models' },
]

function makeDriftColumns(
  driftMap: Map<string, DriftStatus>,
  selectedIds: Set<string>,
  onToggleSelect: (id: string) => void,
  onRebalance: (accountId: string) => void,
  fmtConvert: (value: number, from: CurrencyCode, opts?: { compact?: boolean }) => string,
): ColumnDef<Account, unknown>[] {
  return [
    {
      id: 'select',
      header: () => null,
      cell: ({ row }) => {
        const drift = driftMap.get(row.original.id)
        if (!drift?.needsRebalance) return null
        return (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleSelect(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-border-secondary accent-accent-blue"
          />
        )
      },
      size: 40,
    },
    {
      accessorKey: 'name', header: 'Account',
      cell: ({ row }) => (
        <div>
          <p className="text-body-strong">{row.original.name}</p>
          <p className="font-mono text-caption text-text-tertiary">{row.original.accountNumber}</p>
        </div>
      ),
      size: 260,
    },
    {
      accessorKey: 'type', header: 'Type',
      cell: ({ row }) => <span className="text-caption">{ACCOUNT_TYPE_LABELS[row.original.type]}</span>,
      size: 100,
    },
    {
      accessorKey: 'totalValue', header: 'Value',
      cell: ({ row }) => (
        <span className="font-mono">
          {fmtConvert(row.original.totalValue, row.original.baseCurrency ?? 'USD', { compact: true })}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: 'taxTreatment', header: 'Tax',
      cell: ({ row }) => (
        <Badge variant={row.original.taxTreatment === 'tax_free' ? 'green' : row.original.taxTreatment === 'tax_deferred' ? 'yellow' : 'default'}>
          {row.original.taxTreatment.replace('_', ' ')}
        </Badge>
      ),
      size: 100,
    },
    {
      accessorKey: 'isUMA', header: 'UMA',
      cell: ({ row }) => row.original.isUMA ? <Badge variant="purple">UMA</Badge> : null,
      size: 70,
    },
    {
      accessorKey: 'custodian', header: 'Custodian',
      cell: ({ row }) => <span className="text-caption text-text-secondary">{row.original.custodian}</span>,
      size: 90,
    },
    {
      id: 'drift',
      header: 'Drift',
      cell: ({ row }) => {
        const drift = driftMap.get(row.original.id)
        if (!drift) return <span className="text-caption text-text-tertiary">--</span>
        const val = drift.totalDrift * 100
        return (
          <div className="flex items-center gap-1.5">
            {drift.needsRebalance && <AlertTriangle className="h-3.5 w-3.5 text-accent-red" />}
            <span className={`font-mono text-caption ${drift.needsRebalance ? 'text-accent-red' : val > 1.5 ? 'text-amber-600' : 'text-accent-green'}`}>
              {val.toFixed(1)}%
            </span>
          </div>
        )
      },
      size: 80,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const drift = driftMap.get(row.original.id)
        if (!drift?.needsRebalance) return null
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onRebalance(row.original.id) }}
            className="rounded bg-accent-blue px-2.5 py-1 text-caption font-medium text-white hover:bg-accent-blue/90"
          >
            Rebalance
          </button>
        )
      },
      size: 100,
    },
    {
      accessorKey: 'lastRebalance', header: 'Last Rebal',
      cell: ({ row }) => (
        <span className="font-mono text-caption text-text-secondary">
          {row.original.lastRebalance ? new Date(row.original.lastRebalance).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '\u2014'}
        </span>
      ),
      size: 90,
    },
  ]
}

// ── Household View ──

type HouseholdGroup = {
  id: string
  name: string
  accounts: Account[]
  totalAUM: number
  avgDrift: number
  driftedCount: number
}

function HouseholdView({
  groups,
  driftMap,
  onNavigateAccount,
  onRebalanceHousehold,
}: {
  groups: HouseholdGroup[]
  driftMap: Map<string, DriftStatus>
  onNavigateAccount: (accountId: string) => void
  onRebalanceHousehold: (accountIds: string[]) => void
}) {
  const { formatWithConversion: fmtConvert } = useFormatCurrency()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isExpanded = expandedIds.has(group.id)
        return (
          <div key={group.id} className="rounded-lg border border-border-primary bg-surface-primary">
            <button
              onClick={() => toggleExpand(group.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-tertiary/50"
            >
              <div className="flex items-center gap-3">
                {isExpanded
                  ? <ChevronDown className="h-4 w-4 text-text-tertiary" />
                  : <ChevronRight className="h-4 w-4 text-text-tertiary" />
                }
                <Users className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-body-strong">{group.name}</p>
                  <p className="text-caption text-text-tertiary">{group.accounts.length} account{group.accounts.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="font-mono text-body">{fmtConvert(group.totalAUM, 'USD', { compact: true })}</p>
                  <p className="text-caption text-text-tertiary">Total AUM</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'font-mono text-caption',
                    group.avgDrift * 100 > 3 ? 'text-accent-red' : group.avgDrift * 100 > 1.5 ? 'text-amber-600' : 'text-accent-green',
                  )}>
                    {(group.avgDrift * 100).toFixed(1)}%
                  </p>
                  <p className="text-caption text-text-tertiary">Avg drift</p>
                </div>
                {group.driftedCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRebalanceHousehold(group.accounts.map((a) => a.id))
                    }}
                    className="flex items-center gap-1.5 rounded bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Rebalance Household
                  </button>
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-border-primary">
                {group.accounts.map((acc) => {
                  const drift = driftMap.get(acc.id)
                  const driftVal = drift ? drift.totalDrift * 100 : 0
                  return (
                    <button
                      key={acc.id}
                      onClick={() => onNavigateAccount(acc.id)}
                      className="flex w-full items-center justify-between border-b border-border-primary px-4 py-2.5 pl-12 text-left last:border-b-0 hover:bg-surface-tertiary/50"
                    >
                      <div>
                        <p className="text-body">{acc.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-caption text-text-tertiary">{acc.accountNumber}</span>
                          <Badge variant={acc.taxTreatment === 'tax_free' ? 'green' : acc.taxTreatment === 'tax_deferred' ? 'yellow' : 'default'}>
                            {acc.taxTreatment.replace('_', ' ')}
                          </Badge>
                          <span className="text-caption text-text-tertiary">{ACCOUNT_TYPE_LABELS[acc.type]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="font-mono text-body">
                          {fmtConvert(acc.totalValue, acc.baseCurrency ?? 'USD', { compact: true })}
                        </span>
                        {drift && (
                          <div className="flex items-center gap-1.5">
                            {drift.needsRebalance && <AlertTriangle className="h-3.5 w-3.5 text-accent-red" />}
                            <span className={cn(
                              'font-mono text-caption',
                              drift.needsRebalance ? 'text-accent-red' : driftVal > 1.5 ? 'text-amber-600' : 'text-accent-green',
                            )}>
                              {driftVal.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {groups.length === 0 && (
        <p className="py-8 text-center text-caption text-text-tertiary">No households found</p>
      )}
    </div>
  )
}

// ── Models View ──

function ModelsView({
  models,
  accountsByModel,
  driftMap,
  onRebalanceModel,
}: {
  models: ModelAssignment[]
  accountsByModel: Map<string, Account[]>
  driftMap: Map<string, DriftStatus>
  onRebalanceModel: (modelId: string) => void
}) {
  const { formatWithConversion: fmtConvert } = useFormatCurrency()
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {models.map((model) => {
        const modelAccounts = accountsByModel.get(model.id) ?? []
        const totalAUM = modelAccounts.reduce((sum, a) => sum + a.totalValue, 0)
        const driftedCount = modelAccounts.filter((a) => driftMap.get(a.id)?.needsRebalance).length
        const avgDrift = modelAccounts.length > 0
          ? modelAccounts.reduce((sum, a) => sum + (driftMap.get(a.id)?.totalDrift ?? 0), 0) / modelAccounts.length
          : 0

        return (
          <Card key={model.id}>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-accent-blue" />
                    <h3 className="text-body-strong">{model.name}</h3>
                  </div>
                  <p className="mt-0.5 text-caption text-text-secondary">{model.description}</p>
                </div>
                {driftedCount > 0 && (
                  <button
                    onClick={() => onRebalanceModel(model.id)}
                    className="flex shrink-0 items-center gap-1.5 rounded bg-accent-blue px-2.5 py-1 text-caption font-medium text-white hover:bg-accent-blue/90"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Rebalance Model
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-caption">
                <span>Benchmark: <span className="font-mono font-medium text-text-primary">{model.benchmark}</span></span>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-md border border-border-primary bg-surface-secondary p-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-tertiary">Accounts</p>
                  <p className="font-mono text-body-strong">{modelAccounts.length}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-tertiary">Total AUM</p>
                  <p className="font-mono text-body-strong">{fmtConvert(totalAUM, 'USD', { compact: true })}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-tertiary">Avg Drift</p>
                  <p className={cn(
                    'font-mono text-body-strong',
                    avgDrift * 100 > 3 ? 'text-accent-red' : avgDrift * 100 > 1.5 ? 'text-amber-600' : 'text-accent-green',
                  )}>
                    {(avgDrift * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              {driftedCount > 0 && (
                <p className="text-caption text-accent-red">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  {driftedCount} account{driftedCount !== 1 ? 's' : ''} drifted
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {model.assetClasses.map((ac) => (
                  <span key={ac.assetClass} className="rounded bg-surface-tertiary px-2 py-0.5 text-[11px] text-text-secondary">
                    {ac.assetClass.replace(/_/g, ' ')} {(ac.targetWeight * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
      {models.length === 0 && (
        <p className="col-span-2 py-8 text-center text-caption text-text-tertiary">No models found</p>
      )}
    </div>
  )
}

// ── Main Page ──

export function PortfolioPage() {
  const navigate = useNavigate()
  const { data: accounts, isLoading } = useAccounts({})
  const { data: models } = useModels()
  const { data: driftSummary } = useDriftSummary()
  const { data: households } = useHouseholds()
  const { data: insights } = useAIInsights('portfolios')
  const { formatWithConversion, reportingCurrency } = useFormatCurrency()
  const [view, setView] = useState<PortfolioView>('accounts')
  const [showDriftedOnly, setShowDriftedOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const driftMap = useMemo(() => {
    const map = new Map<string, DriftStatus>()
    if (driftSummary) {
      for (const d of driftSummary) {
        map.set(d.accountId, d)
      }
    }
    return map
  }, [driftSummary])

  const householdNameMap = useMemo(() => {
    const map = new Map<string, string>()
    if (households?.items) {
      for (const hh of households.items) {
        map.set(hh.id, hh.name)
      }
    }
    return map
  }, [households])

  const householdGroups = useMemo<HouseholdGroup[]>(() => {
    if (!accounts) return []
    const groups = new Map<string, { accounts: Account[]; totalAUM: number }>()
    for (const acc of accounts) {
      const existing = groups.get(acc.householdId)
      if (existing) {
        existing.accounts.push(acc)
        existing.totalAUM += acc.totalValue
      } else {
        groups.set(acc.householdId, { accounts: [acc], totalAUM: acc.totalValue })
      }
    }
    const result: HouseholdGroup[] = []
    for (const [hhId, group] of groups) {
      const drifts = group.accounts.map((a) => driftMap.get(a.id)?.totalDrift ?? 0)
      const avgDrift = drifts.length > 0 ? drifts.reduce((s, d) => s + d, 0) / drifts.length : 0
      const driftedCount = group.accounts.filter((a) => driftMap.get(a.id)?.needsRebalance).length
      result.push({
        id: hhId,
        name: householdNameMap.get(hhId) ?? `Household ${hhId}`,
        accounts: group.accounts,
        totalAUM: group.totalAUM,
        avgDrift,
        driftedCount,
      })
    }
    return result.sort((a, b) => b.totalAUM - a.totalAUM)
  }, [accounts, driftMap, householdNameMap])

  const accountsByModel = useMemo(() => {
    const map = new Map<string, Account[]>()
    if (accounts) {
      for (const acc of accounts) {
        const existing = map.get(acc.modelId)
        if (existing) {
          existing.push(acc)
        } else {
          map.set(acc.modelId, [acc])
        }
      }
    }
    return map
  }, [accounts])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[52px] w-full rounded-lg" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const allAccounts = accounts ?? []
  const totalAUM = allAccounts.reduce((sum, a) => sum + a.totalValue, 0)
  const umaCount = allAccounts.filter((a) => a.isUMA).length
  const modelCount = models?.length ?? 0
  const driftedCount = driftSummary?.filter((d) => d.needsRebalance).length ?? 0

  const displayedAccounts = showDriftedOnly
    ? allAccounts.filter((a) => driftMap.get(a.id)?.needsRebalance)
    : allAccounts

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleRebalanceSingle(accountId: string) {
    navigate(`/portfolios/rebalance?accounts=${accountId}`)
  }

  function handleBatchRebalance() {
    const ids = [...selectedIds].join(',')
    navigate(`/portfolios/rebalance?accounts=${ids}`)
  }

  function handleRebalanceHousehold(accountIds: string[]) {
    navigate(`/portfolios/rebalance?accounts=${accountIds.join(',')}`)
  }

  function handleRebalanceModel(modelId: string) {
    navigate(`/portfolios/rebalance?model=${modelId}`)
  }

  const columns = makeDriftColumns(driftMap, selectedIds, toggleSelect, handleRebalanceSingle, formatWithConversion)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title">Portfolios</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/portfolios/trading"
            data-annotation="portfolio-rebalance"
            className="flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Trade
          </Link>
          <Link
            to="/portfolios/models"
            className="flex items-center gap-1.5 rounded-md border border-border-primary px-3 py-1.5 text-caption text-text-secondary hover:bg-surface-tertiary"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Model Governance
          </Link>
        </div>
      </div>

      <DenseMetricsBar metrics={[
        { label: `Total AUM${reportingCurrency !== 'USD' ? ` (${reportingCurrency})` : ''}`, value: formatWithConversion(totalAUM, 'USD', { compact: true }) },
        { label: 'Accounts', value: String(allAccounts.length) },
        { label: 'UMA Accounts', value: String(umaCount) },
        { label: 'Models', value: String(modelCount) },
        { label: 'Drifted', value: String(driftedCount), change: driftedCount > 0 ? { value: `${driftedCount} need rebalance`, direction: 'down' as const } : undefined },
      ]} />

      {insights && insights.length > 0 && (
        <AIInsightStack insights={insights} />
      )}

      {/* View segmented control */}
      <div className="flex items-center gap-4" data-annotation="portfolio-view-toggle">
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />
        <span className="text-caption text-text-tertiary">
          {view === 'accounts' && `${displayedAccounts.length} accounts`}
          {view === 'households' && `${householdGroups.length} households`}
          {view === 'models' && `${models?.length ?? 0} models`}
        </span>
      </div>

      {/* Accounts view */}
      {view === 'accounts' && (
        <Card>
          <CardHeader action={
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBatchRebalance}
                  className="flex items-center gap-1.5 rounded bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Rebalance {selectedIds.size} account{selectedIds.size > 1 ? 's' : ''}
                </button>
              )}
              <label className="flex items-center gap-2 text-caption text-text-secondary" data-annotation="portfolio-drift">
                <input
                  type="checkbox"
                  checked={showDriftedOnly}
                  onChange={(e) => setShowDriftedOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border-secondary accent-accent-red"
                />
                Drifted only {driftedCount > 0 && <Badge variant="red">{driftedCount}</Badge>}
              </label>
            </div>
          }>
            All Accounts
          </CardHeader>
          <DataTable
            data={displayedAccounts}
            columns={columns}
            onRowClick={(acc) => navigate(`/portfolios/accounts/${acc.id}`)}
            compact
          />
        </Card>
      )}

      {/* Households view */}
      {view === 'households' && (
        <HouseholdView
          groups={householdGroups}
          driftMap={driftMap}
          onNavigateAccount={(id) => navigate(`/portfolios/accounts/${id}`)}
          onRebalanceHousehold={handleRebalanceHousehold}
        />
      )}

      {/* Models view */}
      {view === 'models' && models && (
        <ModelsView
          models={models}
          accountsByModel={accountsByModel}
          driftMap={driftMap}
          onRebalanceModel={handleRebalanceModel}
        />
      )}
    </div>
  )
}
