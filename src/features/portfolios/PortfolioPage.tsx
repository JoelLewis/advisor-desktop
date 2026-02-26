import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertTriangle, RefreshCw, GitBranch } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { useAccounts } from '@/hooks/use-accounts'
import { useModels, useDriftSummary } from '@/hooks/use-portfolio'
import { useAIInsights } from '@/hooks/use-ai'
import { formatCurrency } from '@/lib/utils'
import type { Account, AccountType } from '@/types/account'
import type { DriftStatus } from '@/types/portfolio'
import type { ColumnDef } from '@tanstack/react-table'

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  individual: 'Individual', joint: 'Joint', traditional_ira: 'Trad IRA',
  roth_ira: 'Roth IRA', sep_ira: 'SEP IRA', '401k': '401(k)',
  roth_401k: 'Roth 401(k)', '529': '529', trust_revocable: 'Rev Trust',
  trust_irrevocable: 'Irrev Trust', ugma_utma: 'UGMA/UTMA', entity: 'Entity',
}

function makeDriftColumns(
  driftMap: Map<string, DriftStatus>,
  selectedIds: Set<string>,
  onToggleSelect: (id: string) => void,
  onRebalance: (accountId: string) => void,
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
      cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.totalValue, true)}</span>,
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

export function PortfolioPage() {
  const navigate = useNavigate()
  const { data: accounts, isLoading } = useAccounts({})
  const { data: models } = useModels()
  const { data: driftSummary } = useDriftSummary()
  const { data: insights } = useAIInsights('portfolios')
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
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

  const columns = makeDriftColumns(driftMap, selectedIds, toggleSelect, handleRebalanceSingle)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title">Portfolios</h1>
        <Link
          to="/portfolios/models"
          className="flex items-center gap-1.5 rounded-md border border-border-primary px-3 py-1.5 text-caption text-text-secondary hover:bg-surface-tertiary"
        >
          <GitBranch className="h-3.5 w-3.5" />
          Model Governance
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total AUM" value={formatCurrency(totalAUM, true)} />
        <MetricCard label="Accounts" value={String(allAccounts.length)} />
        <MetricCard label="UMA Accounts" value={String(umaCount)} />
        <MetricCard label="Models" value={String(modelCount)} />
      </div>

      {insights && insights.length > 0 && (
        <AIInsightStack insights={insights} />
      )}

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
            <label className="flex items-center gap-2 text-caption text-text-secondary">
              <input
                type="checkbox"
                checked={showDriftedOnly}
                onChange={(e) => setShowDriftedOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border-secondary accent-accent-red"
              />
              Drifted only {driftedCount > 0 && <Badge variant="red">{driftedCount}</Badge>}
            </label>
            <span className="text-caption text-text-secondary">{displayedAccounts.length} accounts</span>
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
    </div>
  )
}
