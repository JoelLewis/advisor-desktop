import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { RefreshCw, GitBranch, ArrowRightLeft } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { DenseMetricsBar } from '@/components/ui/DenseMetricsBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { QueryErrorBanner } from '@/components/ui/QueryErrorBanner'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useAccounts } from '@/hooks/use-accounts'
import { useHouseholds } from '@/hooks/use-households'
import { useModels, useDriftSummary } from '@/hooks/use-portfolio'
import { useAIInsights } from '@/hooks/use-ai'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import type { Account } from '@/types/account'
import type { DriftStatus } from '@/types/portfolio'
import { HouseholdView } from './portfolio-views/HouseholdView'
import type { HouseholdGroup } from './portfolio-views/HouseholdView'
import { ModelsView } from './portfolio-views/ModelsView'
import { makeDriftColumns } from './portfolio-views/columns'

type PortfolioView = 'accounts' | 'households' | 'models'

const VIEW_OPTIONS: { id: PortfolioView; label: string }[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'households', label: 'Households' },
  { id: 'models', label: 'Models' },
]

export function PortfolioPage() {
  const navigate = useNavigate()
  const { data: accounts, isLoading, isError, error, refetch } = useAccounts({})
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

  if (isError) {
    return <QueryErrorBanner error={error} onRetry={refetch} message="Failed to load accounts" />
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
