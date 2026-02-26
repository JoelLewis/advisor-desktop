import { useParams, useNavigate } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { FamilyTree } from '@/components/ui/FamilyTree'
import { AllocationChart } from '@/components/ui/AllocationChart'
import { GoalProgressCard } from '@/components/ui/GoalProgressCard'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { TabLayout } from '@/components/ui/TabLayout'
import { useHousehold } from '@/hooks/use-households'
import { useAccounts } from '@/hooks/use-accounts'
import { useHeldAway } from '@/hooks/use-held-away'
import { useHouseholdPlan } from '@/hooks/use-planning'
import { useHouseholdPositions, useHouseholdDrift, useHouseholdAllocation } from '@/hooks/use-portfolio'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types/account'
import type { Position } from '@/types/portfolio'
import type { HeldAwayAsset } from '@/types/held-away'
import type { ColumnDef } from '@tanstack/react-table'

const ASSET_CLASS_LABELS: Record<string, string> = {
  us_equity: 'US Equity', intl_equity: 'Intl Equity', emerging_markets: 'EM',
  fixed_income: 'Fixed Income', alternatives: 'Alts', real_estate: 'Real Estate',
  commodities: 'Commodities', cash: 'Cash', digital_assets: 'Digital Assets',
  private_equity: 'Private Equity',
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  individual: 'Individual', joint: 'Joint', traditional_ira: 'Traditional IRA',
  roth_ira: 'Roth IRA', sep_ira: 'SEP IRA', '401k': '401(k)',
  roth_401k: 'Roth 401(k)', '529': '529 Plan', trust_revocable: 'Revocable Trust',
  trust_irrevocable: 'Irrevocable Trust', ugma_utma: 'UGMA/UTMA', entity: 'Entity',
}

const accountColumns: ColumnDef<Account, unknown>[] = [
  {
    accessorKey: 'name', header: 'Account',
    cell: ({ row }) => (
      <div>
        <p className="text-body-strong">{row.original.name}</p>
        <p className="font-mono text-caption text-text-tertiary">{row.original.accountNumber}</p>
      </div>
    ), size: 280,
  },
  {
    accessorKey: 'type', header: 'Type',
    cell: ({ row }) => <span className="text-caption">{ACCOUNT_TYPE_LABELS[row.original.type]}</span>,
    size: 140,
  },
  {
    accessorKey: 'totalValue', header: 'Value',
    cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.totalValue, true)}</span>,
    size: 120,
  },
  {
    accessorKey: 'taxTreatment', header: 'Tax Treatment',
    cell: ({ row }) => (
      <Badge variant={row.original.taxTreatment === 'tax_free' ? 'green' : row.original.taxTreatment === 'tax_deferred' ? 'yellow' : 'default'}>
        {row.original.taxTreatment.replace('_', ' ')}
      </Badge>
    ),
    size: 120,
  },
  {
    accessorKey: 'isUMA', header: 'UMA',
    cell: ({ row }) => row.original.isUMA ? <Badge variant="purple">UMA</Badge> : null,
    size: 80,
  },
]

const heldAwayColumns: ColumnDef<HeldAwayAsset, unknown>[] = [
  {
    accessorKey: 'institutionName', header: 'Institution',
    cell: ({ row }) => (
      <div>
        <p className="text-body-strong">{row.original.institutionName}</p>
        <p className="text-caption text-text-tertiary">{row.original.accountType}</p>
      </div>
    ), size: 240,
  },
  {
    accessorKey: 'estimatedValue', header: 'Est. Value',
    cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.estimatedValue, true)}</span>,
    size: 120,
  },
  {
    accessorKey: 'consolidationOpportunity', header: 'Consolidation',
    cell: ({ row }) => row.original.consolidationOpportunity
      ? <Badge variant="green">Opportunity</Badge>
      : <span className="text-caption text-text-tertiary">N/A</span>,
    size: 120,
  },
  {
    accessorKey: 'lastUpdated', header: 'Last Updated',
    cell: ({ row }) => <span className="font-mono text-caption text-text-tertiary">{row.original.lastUpdated}</span>,
    size: 120,
  },
]

export function HouseholdDetailPage() {
  const { householdId } = useParams()
  const navigate = useNavigate()
  const id = householdId ?? ''
  const { data: household, isLoading } = useHousehold(id)
  const { data: accounts } = useAccounts(householdId ? { householdId } : undefined)
  const { data: heldAway } = useHeldAway(id)
  const { data: householdPlan } = useHouseholdPlan(id)
  const { data: hhPositions } = useHouseholdPositions(id)
  const { data: hhDrift } = useHouseholdDrift(id)
  const { data: hhAllocation } = useHouseholdAllocation(id)

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-96" /></div>
  }

  if (!household) {
    return <div className="py-12 text-center text-text-tertiary">Household not found</div>
  }

  // Use real household allocation from PMS, fall back to static data
  const consolidationAllocation = hhAllocation ?? [
    { assetClass: 'us_equity', weight: 0.44 },
    { assetClass: 'intl_equity', weight: 0.11 },
    { assetClass: 'fixed_income', weight: 0.27 },
    { assetClass: 'alternatives', weight: 0.08 },
    { assetClass: 'real_estate', weight: 0.05 },
    { assetClass: 'cash', weight: 0.05 },
  ]

  // Household position columns (with account attribution)
  const hhPositionColumns: ColumnDef<Position, unknown>[] = [
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
      accessorKey: 'accountId', header: 'Account',
      cell: ({ row }) => {
        const acc = accounts?.find((a) => a.id === row.original.accountId)
        return <span className="text-caption text-text-secondary">{acc?.name ?? row.original.accountId}</span>
      },
      size: 180,
    },
    {
      accessorKey: 'assetClass', header: 'Asset Class',
      cell: ({ row }) => <span className="text-caption">{ASSET_CLASS_LABELS[row.original.assetClass] ?? row.original.assetClass}</span>,
      size: 100,
    },
    {
      accessorKey: 'marketValue', header: 'Mkt Value',
      cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.marketValue, true)}</span>,
      size: 100,
    },
    {
      accessorKey: 'gainLoss', header: 'Gain/Loss',
      cell: ({ row }) => (
        <span className={cn('font-mono', row.original.gainLoss >= 0 ? 'text-accent-green' : 'text-accent-red')}>
          {formatCurrency(row.original.gainLoss, true)}
        </span>
      ),
      size: 110,
    },
  ]

  // Drift summary across all accounts
  const driftedAccountCount = hhDrift?.filter((d) => d.needsRebalance).length ?? 0
  const driftedAccountIds = hhDrift?.filter((d) => d.needsRebalance).map((d) => d.accountId) ?? []

  const tabs = [
    {
      id: 'overview', label: 'Overview',
      content: (
        <div className="space-y-6">
          {/* Family tree */}
          <Card>
            <CardHeader>Family</CardHeader>
            <CardContent>
              <FamilyTree
                members={household.members}
                onMemberClick={(clientId) => navigate(`/clients/${clientId}`)}
              />
            </CardContent>
          </Card>

          {/* Financial summary row */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-3">
                <p className="text-caption text-text-secondary">Total AUM</p>
                <p className="mt-1 font-mono text-section-header">{formatCurrency(household.totalAUM, true)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-caption text-text-secondary">Managed</p>
                <p className="mt-1 font-mono text-section-header">{formatCurrency(household.managedAUM, true)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-caption text-text-secondary">Held Away</p>
                <p className="mt-1 font-mono text-section-header">{formatCurrency(household.heldAwayAUM, true)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Allocation + Goals */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>Consolidated Allocation</CardHeader>
              <CardContent>
                <AllocationChart data={consolidationAllocation} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>Financial Goals</CardHeader>
              <CardContent className="space-y-3">
                {householdPlan?.goals.map((goal) => (
                  <GoalProgressCard key={goal.id} goal={goal} compact />
                )) ?? (
                  <p className="py-8 text-center text-caption text-text-tertiary">No plan on file</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      id: 'accounts', label: 'Accounts', count: accounts?.length,
      content: (
        <Card>
          <DataTable
            data={accounts ?? []}
            columns={accountColumns}
            onRowClick={(acc) => navigate(`/portfolios/accounts/${acc.id}`)}
            emptyMessage="No accounts"
          />
        </Card>
      ),
    },
    {
      id: 'portfolio', label: 'Portfolio',
      content: (
        <div className="space-y-6">
          {/* Allocation chart from real data */}
          <Card>
            <CardHeader>Consolidated Allocation</CardHeader>
            <CardContent>
              <AllocationChart data={consolidationAllocation} size="lg" />
            </CardContent>
          </Card>

          {/* Drift summary */}
          <Card>
            <CardHeader action={
              driftedAccountCount > 0 ? (
                <button
                  onClick={() => navigate(`/portfolios/rebalance?accounts=${driftedAccountIds.join(',')}`)}
                  className="rounded bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90"
                >
                  Rebalance Household
                </button>
              ) : null
            }>
              Drift Summary
            </CardHeader>
            <CardContent>
              {hhDrift ? (
                <div className="space-y-2">
                  {hhDrift.map((drift) => {
                    const acc = accounts?.find((a) => a.id === drift.accountId)
                    return (
                      <div
                        key={drift.accountId}
                        className={cn(
                          'flex items-center justify-between rounded-md border px-4 py-3',
                          drift.needsRebalance ? 'border-accent-red/30 bg-accent-red/5' : 'border-border-primary',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {drift.needsRebalance && <AlertTriangle className="h-4 w-4 text-accent-red" />}
                          <div>
                            <p className="text-body-strong">{acc?.name ?? drift.accountId}</p>
                            <p className="text-caption text-text-tertiary">
                              {drift.assetClassDrifts.filter((d) => d.drift > 0.02).length} asset classes over threshold
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          'font-mono text-section-header',
                          drift.needsRebalance ? 'text-accent-red' : 'text-accent-green',
                        )}>
                          {(drift.totalDrift * 100).toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <Skeleton className="h-32" />
              )}
            </CardContent>
          </Card>

          {/* Positions with account attribution */}
          <Card>
            <CardHeader action={
              <span className="text-caption text-text-secondary">{hhPositions?.length ?? 0} positions</span>
            }>
              All Positions
            </CardHeader>
            <DataTable
              data={hhPositions ?? []}
              columns={hhPositionColumns}
              onRowClick={(pos) => navigate(`/portfolios/accounts/${pos.accountId}`)}
              compact
              emptyMessage="No positions"
            />
          </Card>
        </div>
      ),
    },
    {
      id: 'held-away', label: 'Held Away', count: heldAway?.length,
      content: (
        <Card>
          <DataTable
            data={heldAway ?? []}
            columns={heldAwayColumns}
            emptyMessage="No held-away assets"
          />
        </Card>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Household header */}
      <div className="flex items-center gap-4 rounded-lg border border-border-primary bg-surface-primary p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-blue/10">
          <Home className="h-6 w-6 text-accent-blue" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-page-title">{household.name}</h1>
            <Badge variant="blue">{household.segment}</Badge>
          </div>
          <p className="text-caption text-text-secondary">
            {household.members.length} members · {household.accountIds.length} accounts
          </p>
        </div>
        <div className="text-right">
          <p className="text-caption text-text-secondary">Total AUM</p>
          <p className="font-mono text-page-title">{formatCurrency(household.totalAUM, true)}</p>
        </div>
      </div>

      <TabLayout tabs={tabs} />
    </div>
  )
}
