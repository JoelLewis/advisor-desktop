import {
  CheckCircle2, Clock, AlertTriangle, DollarSign,
  ArrowRight, TrendingDown, Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TabLayout } from '@/components/ui/TabLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import { useBillingCycles, useHouseholdFees, useBillingExceptions, useBreakpointAnalyses } from '@/hooks/use-billing'
import { useUIStore } from '@/store/ui-store'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { BillingCycle, HouseholdFee, BillingException, BreakpointAnalysis, BillingStage } from '@/types/billing'

const STAGE_CONFIG: Record<BillingStage, { label: string; color: string }> = {
  valuation: { label: 'Valuation', color: 'bg-accent-blue' },
  calculation: { label: 'Calculation', color: 'bg-accent-purple' },
  review: { label: 'Review', color: 'bg-amber-500' },
  collection: { label: 'Collection', color: 'bg-accent-green' },
}

const STAGES: BillingStage[] = ['valuation', 'calculation', 'review', 'collection']

function CycleTracker({ cycle }: { cycle: BillingCycle }) {
  const currentIdx = STAGES.indexOf(cycle.stage)
  return (
    <div className="rounded-lg border border-border-primary p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-body-strong text-text-primary">{cycle.period}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-caption text-text-secondary">
            {formatCurrency(cycle.totalBilled, true)} billed
          </span>
          {cycle.exceptionsCount > 0 && (
            <Badge variant="yellow">{cycle.exceptionsCount} exceptions</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => {
          const cfg = STAGE_CONFIG[stage]
          const isComplete = i < currentIdx || (i === currentIdx && !!cycle.stageCompletedAt)
          const isCurrent = i === currentIdx && !cycle.stageCompletedAt
          return (
            <div key={stage} className="flex flex-1 items-center gap-1">
              <div className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium ${
                    isComplete
                      ? 'bg-accent-green text-white'
                      : isCurrent
                        ? `${cfg.color} text-white`
                        : 'bg-surface-tertiary text-text-tertiary'
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-[10px] ${isCurrent ? 'font-medium text-text-primary' : 'text-text-tertiary'}`}>
                  {cfg.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <ArrowRight className={`h-3 w-3 shrink-0 ${i < currentIdx ? 'text-accent-green' : 'text-border-secondary'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FeeDetailTable({ fees }: { fees: HouseholdFee[] }) {
  const sorted = [...fees].sort((a, b) => b.aumBasis - a.aumBasis)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-caption">
        <thead>
          <tr className="border-b border-border-primary bg-surface-secondary">
            <th className="px-3 py-2 font-medium text-text-secondary">Household</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">AUM Basis</th>
            <th className="px-3 py-2 font-medium text-text-secondary">Fee Type</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">Rate (bps)</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">Quarterly</th>
            <th className="px-3 py-2 font-medium text-text-secondary">Method</th>
            <th className="px-3 py-2 font-medium text-text-secondary">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((fee) => (
            <tr key={fee.householdId} className="border-b border-border-primary last:border-0 hover:bg-surface-tertiary/50">
              <td className="px-3 py-2 font-medium text-text-primary">{fee.householdName}</td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">{formatCurrency(fee.aumBasis, true)}</td>
              <td className="px-3 py-2 capitalize text-text-secondary">{fee.feeType}</td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">{(fee.annualRate * 10000).toFixed(0)}</td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">{formatCurrency(fee.quarterlyAmount)}</td>
              <td className="px-3 py-2 capitalize text-text-secondary">{fee.method}</td>
              <td className="px-3 py-2">
                {fee.waiver ? (
                  <Badge variant="purple">{fee.waiver.type}</Badge>
                ) : fee.exceptions.length > 0 ? (
                  <Badge variant="yellow">{fee.exceptions.length} issue{fee.exceptions.length > 1 ? 's' : ''}</Badge>
                ) : (
                  <Badge variant="green">OK</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  missing_aum: 'Missing AUM',
  schedule_mismatch: 'Schedule Mismatch',
  breakpoint_near_miss: 'Breakpoint Near-miss',
  collection_failed: 'Collection Failed',
  fee_override: 'Fee Override',
}

const SEVERITY_VARIANTS: Record<string, 'red' | 'yellow' | 'default'> = {
  high: 'red',
  medium: 'yellow',
  low: 'default',
}

function ExceptionQueue({ exceptions }: { exceptions: BillingException[] }) {
  if (exceptions.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-caption text-text-tertiary">
        No open exceptions
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {exceptions.map((ex) => (
        <div key={ex.id} className="rounded-md border border-border-primary px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-3.5 w-3.5 ${ex.severity === 'high' ? 'text-accent-red' : ex.severity === 'medium' ? 'text-amber-500' : 'text-text-tertiary'}`} />
              <span className="text-caption font-medium text-text-primary">{ex.householdName}</span>
            </div>
            <Badge variant={SEVERITY_VARIANTS[ex.severity] ?? 'default'}>
              {EXCEPTION_TYPE_LABELS[ex.type] ?? ex.type}
            </Badge>
          </div>
          <p className="mt-1 text-caption text-text-secondary">{ex.description}</p>
        </div>
      ))}
    </div>
  )
}

function BreakpointTable({ analyses }: { analyses: BreakpointAnalysis[] }) {
  const setInitialMessage = useUIStore((s) => s.setInitialMessage)

  return (
    <div className="space-y-3">
      {analyses.map((bp) => (
        <div key={bp.householdId} className="rounded-md border border-border-primary px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-text-primary">{bp.householdName}</span>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3.5 w-3.5 text-accent-green" />
              <span className="font-mono text-caption font-medium text-accent-green">
                Save {formatCurrency(bp.annualSavings)}/yr
              </span>
            </div>
          </div>
          <div className="mt-2 flex gap-6 text-caption text-text-secondary">
            <div>
              Current: <span className="font-mono text-text-primary">{formatCurrency(bp.currentAUM, true)}</span>
            </div>
            <div>
              Next breakpoint: <span className="font-mono text-text-primary">{formatCurrency(bp.nextBreakpoint, true)}</span>
            </div>
            <div>
              Gap: <span className="font-mono text-accent-blue">{formatCurrency(bp.gapToBreakpoint, true)}</span>
            </div>
          </div>
          <div className="mt-2 flex gap-6 text-caption text-text-secondary">
            <div>
              Current rate: <span className="font-mono">{formatPercent(bp.currentRate * 100, 2)}</span>
            </div>
            <div>
              Breakpoint rate: <span className="font-mono text-accent-green">{formatPercent(bp.breakpointRate * 100, 2)}</span>
            </div>
          </div>
          <button
            onClick={() => setInitialMessage(`Create a consolidation NBA for ${bp.householdName} — they need ${formatCurrency(bp.gapToBreakpoint, true)} more to reach the ${formatCurrency(bp.nextBreakpoint, true)} breakpoint and save ${formatCurrency(bp.annualSavings)}/yr in fees.`)}
            className="mt-2 flex items-center gap-1 rounded-md bg-accent-purple/10 px-2.5 py-1 text-caption font-medium text-accent-purple hover:bg-accent-purple/20"
          >
            <Sparkles className="h-3 w-3" />
            Create Consolidation NBA
          </button>
        </div>
      ))}
    </div>
  )
}

function WaiverTracker({ fees }: { fees: HouseholdFee[] }) {
  const waivers = fees.filter((f) => f.waiver)
  if (waivers.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-caption text-text-tertiary">
        No active waivers or discounts
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-md border border-border-primary">
      <table className="w-full text-left text-caption">
        <thead>
          <tr className="border-b border-border-primary bg-surface-secondary">
            <th className="px-3 py-2 font-medium text-text-secondary">Household</th>
            <th className="px-3 py-2 font-medium text-text-secondary">Waiver Type</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">Discount (bps)</th>
            <th className="px-3 py-2 font-medium text-text-secondary">Expires</th>
          </tr>
        </thead>
        <tbody>
          {waivers.map((f) => (
            <tr key={f.householdId} className="border-b border-border-primary last:border-0">
              <td className="px-3 py-2 font-medium text-text-primary">{f.householdName}</td>
              <td className="px-3 py-2 text-text-secondary">{f.waiver!.type}</td>
              <td className="px-3 py-2 text-right font-mono text-accent-red">-{f.waiver!.discountBps}</td>
              <td className="px-3 py-2 font-mono text-text-secondary">{new Date(f.waiver!.expiresAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function BillingPage() {
  const { data: cycles, isLoading: cyclesLoading } = useBillingCycles()
  const { data: fees, isLoading: feesLoading } = useHouseholdFees()
  const { data: exceptions } = useBillingExceptions({ resolved: 'false' })
  const { data: breakpoints } = useBreakpointAnalyses()

  const isLoading = cyclesLoading || feesLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const totalQuarterly = fees?.reduce((s, f) => s + f.quarterlyAmount, 0) ?? 0
  const avgRate = fees && fees.length > 0
    ? fees.reduce((s, f) => s + f.annualRate, 0) / fees.length
    : 0

  const tabs = [
    {
      id: 'fees',
      label: 'Fee Schedule',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      content: fees ? <FeeDetailTable fees={fees} /> : null,
    },
    {
      id: 'exceptions',
      label: `Exceptions${exceptions && exceptions.length > 0 ? ` (${exceptions.length})` : ''}`,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      content: exceptions ? <ExceptionQueue exceptions={exceptions} /> : null,
    },
    {
      id: 'breakpoints',
      label: 'Breakpoint Analysis',
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      content: breakpoints ? <BreakpointTable analyses={breakpoints} /> : null,
    },
    {
      id: 'waivers',
      label: 'Waivers & Discounts',
      icon: <Clock className="h-3.5 w-3.5" />,
      content: fees ? <WaiverTracker fees={fees} /> : null,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-caption text-text-tertiary">Quarterly Revenue</div>
            <div className="font-mono text-heading text-text-primary">{formatCurrency(totalQuarterly, true)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-caption text-text-tertiary">Avg Fee Rate</div>
            <div className="font-mono text-heading text-text-primary">{(avgRate * 10000).toFixed(0)} bps</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-caption text-text-tertiary">Households Billed</div>
            <div className="font-mono text-heading text-text-primary">{fees?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-caption text-text-tertiary">Open Exceptions</div>
            <div className="font-mono text-heading text-accent-red">{exceptions?.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Cycle Tracker */}
      <Card>
        <CardHeader>Billing Cycles</CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cycles?.map((cycle) => (
              <CycleTracker key={cycle.id} cycle={cycle} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Detail */}
      <Card>
        <TabLayout tabs={tabs} />
      </Card>
    </div>
  )
}
