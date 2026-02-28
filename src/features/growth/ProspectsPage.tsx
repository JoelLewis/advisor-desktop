import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, User, Phone, Mail, Calendar, UserPlus, LayoutGrid, List, FileText } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DenseMetricsBar } from '@/components/ui/DenseMetricsBar'
import type { DenseMetric } from '@/components/ui/DenseMetricsBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { ProspectListView } from '@/features/growth/ProspectListView'
import { useProspects } from '@/hooks/use-prospects'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import type { Prospect, ProspectStage } from '@/types/prospect'

type ViewMode = 'board' | 'list'

const STAGES: { id: ProspectStage; label: string; color: string }[] = [
  { id: 'lead', label: 'Lead', color: 'bg-text-tertiary' },
  { id: 'discovery', label: 'Discovery', color: 'bg-accent-blue' },
  { id: 'proposal', label: 'Proposal', color: 'bg-accent-purple' },
  { id: 'decision', label: 'Decision', color: 'bg-amber-500' },
  { id: 'onboarding', label: 'Onboarding', color: 'bg-accent-green' },
]

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referral',
  event: 'Event',
  website: 'Website',
  cold_outreach: 'Cold Outreach',
  existing_client: 'Existing Client',
}

const BOARD_VISIBLE_LIMIT = 5

function daysInStage(prospect: Prospect): number {
  const changed = new Date(prospect.stageChangedAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.round((now - changed) / (1000 * 60 * 60 * 24)))
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const navigate = useNavigate()
  const { formatWithConversion } = useFormatCurrency()
  return (
    <div className="rounded-md border border-border-primary bg-surface-primary p-3 shadow-xs transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-tertiary text-text-secondary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-body-strong">{prospect.name}</p>
            {prospect.company && (
              <p className="text-caption text-text-tertiary">{prospect.company}</p>
            )}
          </div>
        </div>
        <Badge variant="default">{SOURCE_LABELS[prospect.source] ?? prospect.source}</Badge>
      </div>

      <div className="mt-3 space-y-1.5 text-caption">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Est. AUM</span>
          <span className="font-mono font-medium">{formatWithConversion(prospect.estimatedAUM, 'USD', { compact: true })}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Probability</span>
          <span className={cn('font-mono font-medium', prospect.probability >= 0.7 ? 'text-accent-green' : prospect.probability >= 0.4 ? 'text-amber-600' : 'text-text-secondary')}>
            {(prospect.probability * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="mt-3 rounded bg-surface-secondary p-2">
        <p className="text-caption text-text-secondary">Next Action</p>
        <p className="text-caption font-medium text-text-primary">{prospect.nextAction}</p>
        <div className="mt-1 flex items-center gap-1 text-caption text-text-tertiary">
          <Calendar className="h-3 w-3" />
          <span>{new Date(prospect.nextActionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2" data-annotation="growth-prospect-actions">
        <button
          onClick={() => window.open(`tel:${prospect.phone}`)}
          className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
          title={`Call ${prospect.phone}`}
        >
          <Phone className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => window.open(`mailto:${prospect.email}`)}
          className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
          title={`Email ${prospect.email}`}
        >
          <Mail className="h-3.5 w-3.5" />
        </button>
        {prospect.stage === 'proposal' && (
          <button
            onClick={() => navigate(`/clients/prospect/proposal?prospectId=${prospect.id}`)}
            className="ml-auto flex items-center gap-1 rounded-md border border-accent-purple/30 bg-accent-purple/5 px-2 py-1 text-[10px] font-medium text-accent-purple transition-colors hover:bg-accent-purple/10"
          >
            <FileText className="h-3 w-3" /> Generate Proposal
          </button>
        )}
        {prospect.stage === 'onboarding' && (
          <button
            onClick={() => navigate(`/clients/onboard/${prospect.id}`)}
            className="ml-auto flex items-center gap-1 rounded-md bg-accent-green px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-accent-green/90"
          >
            <UserPlus className="h-3 w-3" /> Start Onboarding
          </button>
        )}
      </div>
    </div>
  )
}

function PipelineMetrics({ prospects }: { prospects: Prospect[] }) {
  const { formatWithConversion } = useFormatCurrency()
  const metrics = useMemo(() => {
    const total = prospects.length
    const onboardingCount = prospects.filter((p) => p.stage === 'onboarding').length
    const winRate = total > 0 ? (onboardingCount / total) * 100 : 0

    const nonLeadProspects = prospects.filter((p) => p.stage !== 'lead')
    const avgDaysInStage = nonLeadProspects.length > 0
      ? Math.round(nonLeadProspects.reduce((sum, p) => sum + daysInStage(p), 0) / nonLeadProspects.length)
      : 0

    const weightedAUM = prospects.reduce((sum, p) => sum + p.estimatedAUM * p.probability, 0)
    const allDays = prospects.map((p) => {
      const created = new Date(p.createdAt).getTime()
      const now = Date.now()
      return Math.max(1, Math.round((now - created) / (1000 * 60 * 60 * 24)))
    })
    const avgDaysInPipeline = allDays.length > 0
      ? Math.round(allDays.reduce((a, b) => a + b, 0) / allDays.length)
      : 1
    const velocity = avgDaysInPipeline > 0 ? weightedAUM / avgDaysInPipeline : 0

    return { avgDaysInStage, winRate, velocity }
  }, [prospects])

  return (
    <div className="flex items-center gap-6 rounded-lg border border-border-primary bg-surface-primary px-5 py-3">
      <div>
        <p className="text-caption text-text-tertiary">Avg Days in Stage</p>
        <p className="font-mono text-body-strong">{metrics.avgDaysInStage}d</p>
      </div>
      <div className="h-8 w-px bg-border-primary" />
      <div>
        <p className="text-caption text-text-tertiary">Win Rate</p>
        <p className="font-mono text-body-strong">{metrics.winRate.toFixed(0)}%</p>
      </div>
      <div className="h-8 w-px bg-border-primary" />
      <div>
        <p className="text-caption text-text-tertiary">Pipeline Velocity</p>
        <p className="font-mono text-body-strong">{formatWithConversion(metrics.velocity, 'USD', { compact: true })}/day</p>
      </div>
    </div>
  )
}

function ViewToggle({ view, onViewChange }: { view: ViewMode; onViewChange: (v: ViewMode) => void }) {
  return (
    <div className="flex rounded-lg border border-border-primary bg-surface-primary">
      <button
        onClick={() => onViewChange('board')}
        className={cn(
          'flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-caption font-medium transition-colors',
          view === 'board' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary',
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Board
      </button>
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          'flex items-center gap-1.5 rounded-r-lg px-3 py-1.5 text-caption font-medium transition-colors',
          view === 'list' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary',
        )}
      >
        <List className="h-3.5 w-3.5" />
        List
      </button>
    </div>
  )
}

function BoardColumn({ stage, prospects: stageProspects }: { stage: typeof STAGES[number]; prospects: Prospect[] }) {
  const [showAll, setShowAll] = useState(false)
  const { formatWithConversion } = useFormatCurrency()
  const stageAUM = stageProspects.reduce((sum, p) => sum + p.estimatedAUM, 0)
  const hasMore = stageProspects.length > BOARD_VISIBLE_LIMIT
  const visible = showAll ? stageProspects : stageProspects.slice(0, BOARD_VISIBLE_LIMIT)
  const hiddenCount = stageProspects.length - BOARD_VISIBLE_LIMIT

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <Card className="flex-1">
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <div className={cn('h-2.5 w-2.5 rounded-full', stage.color)} />
            <span className="text-body-strong">{stage.label}</span>
            <Badge variant="default">{stageProspects.length}</Badge>
          </div>
        </CardHeader>
        <div className="px-3 py-1 text-caption text-text-tertiary">
          {formatWithConversion(stageAUM, 'USD', { compact: true })} pipeline
        </div>
        <CardContent className="space-y-3 pt-2">
          {visible.length > 0 ? (
            <>
              {visible.map((prospect) => (
                <ProspectCard key={prospect.id} prospect={prospect} />
              ))}
              {hasMore && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full rounded-md border border-border-primary bg-surface-secondary py-2 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
                >
                  Show {hiddenCount} more
                </button>
              )}
              {hasMore && showAll && (
                <button
                  onClick={() => setShowAll(false)}
                  className="w-full rounded-md border border-border-primary bg-surface-secondary py-2 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
                >
                  Show less
                </button>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-caption text-text-tertiary">No prospects</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function ProspectsPage() {
  const { data: prospects, isLoading } = useProspects()
  const [view, setView] = useState<ViewMode>('board')
  const { formatWithConversion } = useFormatCurrency()

  const pipeline = useMemo(() => {
    if (!prospects) return new Map<ProspectStage, Prospect[]>()
    const map = new Map<ProspectStage, Prospect[]>()
    for (const stage of STAGES) {
      map.set(stage.id, prospects.filter((p) => p.stage === stage.id))
    }
    return map
  }, [prospects])

  const totalEstimatedAUM = prospects?.reduce((sum, p) => sum + p.estimatedAUM, 0) ?? 0
  const weightedPipeline = prospects?.reduce((sum, p) => sum + p.estimatedAUM * p.probability, 0) ?? 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[52px] w-full rounded-lg" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-accent-green" />
          <h1 className="text-page-title">Growth Pipeline</h1>
        </div>
        <div data-annotation="growth-view-toggle">
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      <div data-annotation="growth-metrics">
        <DenseMetricsBar metrics={[
          { label: 'Total Prospects', value: String(prospects?.length ?? 0) },
          { label: 'Pipeline AUM', value: formatWithConversion(totalEstimatedAUM, 'USD', { compact: true }) },
          { label: 'Weighted Pipeline', value: formatWithConversion(weightedPipeline, 'USD', { compact: true }) },
          { label: 'Avg. Probability', value: prospects && prospects.length > 0
            ? `${Math.round(prospects.reduce((sum, p) => sum + p.probability, 0) / prospects.length * 100)}%`
            : '0%'
          },
        ] satisfies DenseMetric[]} />
      </div>

      {prospects && prospects.length > 0 && (
        <div data-annotation="growth-health">
          <PipelineMetrics prospects={prospects} />
        </div>
      )}

      {view === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <BoardColumn
              key={stage.id}
              stage={stage}
              prospects={pipeline.get(stage.id) ?? []}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ProspectListView prospects={prospects ?? []} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
