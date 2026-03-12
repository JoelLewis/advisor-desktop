import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { TabLayout } from '@/components/ui/TabLayout'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { QueryErrorBanner } from '@/components/ui/QueryErrorBanner'
import { ShareButton } from '@/components/ui/ShareButton'
import { WorkflowLaunchButton } from '@/components/ui/WorkflowLaunchButton'
import { ConcentrationView } from './ConcentrationView'
import { TradeTicketDialog } from './TradeTicketDialog'
import { OverviewTab } from './account-detail/OverviewTab'
import { PerformanceTab } from './account-detail/PerformanceTab'
import { RiskTab } from './account-detail/RiskTab'
import { makePositionColumns, orderColumns } from './account-detail/columns'
import { useAccount } from '@/hooks/use-accounts'
import { usePositions, useDrift, usePerformance, useBenchmark, useRiskMetrics, useFactorExposures, useStressScenarios } from '@/hooks/use-portfolio'
import { useAccountOrders } from '@/hooks/use-orders'
import { useAIInsights } from '@/hooks/use-ai'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { taxTreatmentBadgeVariant } from '@/lib/labels'

export function AccountDetailPage() {
  const { accountId } = useParams()
  const navigate = useNavigate()
  const id = accountId ?? ''
  const { data: account, isLoading, isError, error, refetch } = useAccount(id)
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false)
  const [tradePrefill, setTradePrefill] = useState<{ symbol?: string; side?: 'buy' | 'sell'; assetClass?: 'equity' | 'option' | 'mutual_fund' | 'fixed_income' | 'digital_asset' }>({})
  const { data: positions } = usePositions(id)
  const { data: drift } = useDrift(id)
  const { data: performance } = usePerformance(id)
  const { data: benchmark } = useBenchmark(id)
  const { data: risk } = useRiskMetrics(id)
  const { data: factors } = useFactorExposures(id)
  const { data: stress } = useStressScenarios(id)
  const { data: orders } = useAccountOrders(id)
  const { data: insights } = useAIInsights('account_detail', id)
  const { formatWithConversion } = useFormatCurrency()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (isError) {
    return <QueryErrorBanner error={error} onRetry={refetch} message="Failed to load account" />
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

  function handlePositionTrade(symbol: string, side: 'buy' | 'sell', positionAssetClass?: string) {
    const acMap: Record<string, 'equity' | 'option' | 'mutual_fund' | 'fixed_income' | 'digital_asset'> = {
      us_equity: 'equity', intl_equity: 'equity', emerging_markets: 'equity',
      fixed_income: 'fixed_income',
      digital_assets: 'digital_asset',
    }
    const tradableAc = positionAssetClass ? acMap[positionAssetClass] : undefined
    setTradePrefill({ symbol, side, assetClass: tradableAc })
    setTradeDialogOpen(true)
  }

  const tabs = [
    {
      id: 'overview', label: 'Overview',
      content: (
        <OverviewTab
          account={account}
          positions={positions}
          allocation={allocation}
          totalGainLoss={totalGainLoss}
          drift={drift}
          risk={risk}
          insights={insights}
          id={id}
          navigate={navigate}
          formatWithConversion={formatWithConversion}
        />
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
            <DataTable data={positions ?? []} columns={makePositionColumns(handlePositionTrade, account.baseCurrency)} compact />
          </Card>
        </div>
      ),
    },
    {
      id: 'performance', label: 'Performance',
      content: <PerformanceTab performance={performance} benchmark={benchmark} id={id} />,
    },
    {
      id: 'risk', label: 'Risk',
      content: <RiskTab risk={risk} factors={factors} stress={stress} account={account} formatWithConversion={formatWithConversion} />,
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
          <Badge variant={taxTreatmentBadgeVariant(account.taxTreatment)}>
            {account.taxTreatment.replace('_', ' ')}
          </Badge>
          {account.isUMA && <Badge variant="purple">UMA</Badge>}
          <Badge variant={account.status === 'active' ? 'green' : 'default'}>{account.status}</Badge>
          <WorkflowLaunchButton />
          <ShareButton card={{
            variant: 'account_summary',
            entityId: account.id,
            entityName: account.name,
            metrics: [{ label: 'Value', value: formatWithConversion(account.totalValue, account.baseCurrency ?? 'USD', { compact: true }) }],
          }} />
        </div>
      </div>

      <TabLayout tabs={tabs} />
    </div>
  )
}
