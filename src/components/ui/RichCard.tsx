import { useNavigate } from 'react-router-dom'
import { AllocationChart } from '@/components/ui/AllocationChart'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { RichCardData } from '@/types/rich-card'

type RichCardProps = {
  data: RichCardData
  isAIContext?: boolean
  className?: string
}

function getDriftColor(drift: number): 'green' | 'yellow' | 'red' {
  if (drift < 2) return 'green'
  if (drift <= 4) return 'yellow'
  return 'red'
}

const DRIFT_TEXT_CLASSES: Record<'green' | 'yellow' | 'red', string> = {
  green: 'text-accent-green',
  yellow: 'text-amber-600',
  red: 'text-accent-red',
}

const DRIFT_BG_CLASSES: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-accent-green',
  yellow: 'bg-amber-500',
  red: 'bg-accent-red',
}

function getNavigationPath(data: RichCardData): string {
  switch (data.variant) {
    case 'portfolio_overview':
    case 'account_summary':
      return `/portfolios/accounts/${data.entityId}`
    case 'rebalance_workflow':
      return data.actionRoute ?? '/portfolios/rebalance'
    case 'client_summary':
      return `/clients/${data.entityId}`
    case 'household_summary':
      return `/households/${data.entityId}`
  }
}

function PortfolioOverview({ data }: { data: RichCardData }) {
  return (
    <div className="space-y-2">
      <p className="truncate text-body-strong">{data.entityName}</p>
      {data.allocation && data.allocation.length > 0 && (
        <AllocationChart data={data.allocation} size="sm" showLegend={false} />
      )}
      <div className="flex items-center gap-2">
        {data.metrics?.map((m) => (
          <span key={m.label} className="font-mono text-caption text-text-secondary">
            {m.label}: <span className="font-medium text-text-primary">{m.value}</span>
          </span>
        ))}
        {data.driftPercent !== undefined && (
          <Badge variant={getDriftColor(data.driftPercent)}>
            {data.driftPercent.toFixed(1)}% drift
          </Badge>
        )}
      </div>
    </div>
  )
}

function RebalanceWorkflow({ data }: { data: RichCardData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-text-secondary">Rebalance</span>
        {data.driftPercent !== undefined && (
          <span className={cn('font-mono text-lg font-semibold', DRIFT_TEXT_CLASSES[getDriftColor(data.driftPercent)])}>
            {data.driftPercent.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="truncate text-body-strong">{data.entityName}</p>
      {data.accountCount !== undefined && (
        <p className="text-caption text-text-secondary">
          {data.accountCount} account{data.accountCount !== 1 ? 's' : ''}
        </p>
      )}
      <button
        className="w-full rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90"
        onClick={(e) => e.stopPropagation()}
      >
        {data.actionLabel ?? 'Start Rebalance'}
      </button>
    </div>
  )
}

function AccountSummary({ data }: { data: RichCardData }) {
  return (
    <div className="flex items-center gap-2">
      <p className="min-w-0 flex-1 truncate text-body-strong">{data.entityName}</p>
      {data.tier && <Badge variant="blue">{data.tier}</Badge>}
      {data.metrics?.map((m) => (
        <span key={m.label} className="shrink-0 font-mono text-caption font-medium text-text-primary">
          {m.value}
        </span>
      ))}
      {data.driftPercent !== undefined && (
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', DRIFT_BG_CLASSES[getDriftColor(data.driftPercent)])}
          title={`${data.driftPercent.toFixed(1)}% drift`}
        />
      )}
    </div>
  )
}

function ClientSummary({ data }: { data: RichCardData }) {
  const initials = data.entityName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-blue text-[11px] font-semibold text-white">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-strong">{data.entityName}</p>
      </div>
      {data.tier && <Badge variant="blue">{data.tier}</Badge>}
      {data.metrics?.map((m) => (
        <span key={m.label} className="shrink-0 font-mono text-caption font-medium text-text-primary">
          {m.value}
        </span>
      ))}
    </div>
  )
}

function HouseholdSummary({ data }: { data: RichCardData }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-body-strong">{data.entityName}</p>
        {data.tier && <Badge variant="default">{data.tier}</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {data.memberCount !== undefined && (
          <Badge variant="default">
            {data.memberCount} member{data.memberCount !== 1 ? 's' : ''}
          </Badge>
        )}
        {data.accountCount !== undefined && (
          <Badge variant="default">
            {data.accountCount} account{data.accountCount !== 1 ? 's' : ''}
          </Badge>
        )}
        {data.metrics?.map((m) => (
          <span key={m.label} className="font-mono text-caption font-medium text-text-primary">
            {m.value}
          </span>
        ))}
      </div>
    </div>
  )
}

const VARIANT_COMPONENTS = {
  portfolio_overview: PortfolioOverview,
  rebalance_workflow: RebalanceWorkflow,
  account_summary: AccountSummary,
  client_summary: ClientSummary,
  household_summary: HouseholdSummary,
} as const satisfies Record<RichCardData['variant'], (props: { data: RichCardData }) => JSX.Element>

function renderVariant(data: RichCardData): JSX.Element {
  const Component = VARIANT_COMPONENTS[data.variant]
  return <Component data={data} />
}

export function RichCard({ data, isAIContext, className }: RichCardProps) {
  const navigate = useNavigate()

  function handleClick() {
    navigate(getNavigationPath(data))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'mt-2 w-full max-w-[280px] rounded-md border border-border-primary bg-surface-primary p-3 text-left transition-colors hover:bg-surface-tertiary',
        isAIContext && 'border-l-2 border-l-accent-purple',
        className,
      )}
    >
      {renderVariant(data)}
    </button>
  )
}
