import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, User, Phone, Mail, Calendar, UserPlus } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { useProspects } from '@/hooks/use-prospects'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Prospect, ProspectStage } from '@/types/prospect'

const STAGES: { id: ProspectStage; label: string; color: string }[] = [
  { id: 'lead', label: 'Lead', color: 'bg-text-tertiary' },
  { id: 'qualified', label: 'Qualified', color: 'bg-accent-blue' },
  { id: 'proposal', label: 'Proposal', color: 'bg-accent-purple' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-amber-500' },
  { id: 'onboarding', label: 'Onboarding', color: 'bg-accent-green' },
]

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referral',
  event: 'Event',
  website: 'Website',
  cold_outreach: 'Cold Outreach',
  existing_client: 'Existing Client',
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const navigate = useNavigate()
  return (
    <div className="rounded-md border border-border-primary bg-surface-primary p-3 shadow-sm transition-shadow hover:shadow-md">
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
          <span className="font-mono font-medium">{formatCurrency(prospect.estimatedAUM, true)}</span>
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

      <div className="mt-2 flex items-center gap-2">
        <button className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary" title={prospect.phone}>
          <Phone className="h-3.5 w-3.5" />
        </button>
        <button className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary" title={prospect.email}>
          <Mail className="h-3.5 w-3.5" />
        </button>
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

export function ProspectsPage() {
  const { data: prospects, isLoading } = useProspects()

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
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-accent-green" />
        <h1 className="text-page-title">Growth Pipeline</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Prospects" value={String(prospects?.length ?? 0)} />
        <MetricCard label="Pipeline AUM" value={formatCurrency(totalEstimatedAUM, true)} />
        <MetricCard label="Weighted Pipeline" value={formatCurrency(weightedPipeline, true)} />
        <MetricCard label="Avg. Probability" value={prospects && prospects.length > 0
          ? `${Math.round(prospects.reduce((sum, p) => sum + p.probability, 0) / prospects.length * 100)}%`
          : '0%'
        } />
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageProspects = pipeline.get(stage.id) ?? []
          const stageAUM = stageProspects.reduce((sum, p) => sum + p.estimatedAUM, 0)
          return (
            <div key={stage.id} className="flex w-72 shrink-0 flex-col">
              <Card className="flex-1">
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2.5 w-2.5 rounded-full', stage.color)} />
                    <span className="text-body-strong">{stage.label}</span>
                    <Badge variant="default">{stageProspects.length}</Badge>
                  </div>
                </CardHeader>
                <div className="px-3 py-1 text-caption text-text-tertiary">
                  {formatCurrency(stageAUM, true)} pipeline
                </div>
                <CardContent className="space-y-3 pt-2">
                  {stageProspects.length > 0 ? (
                    stageProspects.map((prospect) => (
                      <ProspectCard key={prospect.id} prospect={prospect} />
                    ))
                  ) : (
                    <p className="py-8 text-center text-caption text-text-tertiary">No prospects</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
