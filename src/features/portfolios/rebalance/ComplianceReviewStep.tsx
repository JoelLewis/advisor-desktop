import { memo } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Shield, RefreshCw, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import type { TradeComplianceResult, TradeComplianceCheck } from '@/types/compliance'
import type { WizardStep } from './types'

type ComplianceStatus = TradeComplianceCheck['status']

const COMPLIANCE_STATUS_BADGE: Record<ComplianceStatus, 'green' | 'yellow' | 'red'> = {
  pass: 'green',
  warning: 'yellow',
  fail: 'red',
}

const CATEGORY_LABELS: Record<TradeComplianceCheck['category'], string> = {
  restricted_securities: 'Restricted',
  concentration_limit: 'Concentration',
  cash_minimum: 'Cash Reserve',
  wash_sale: 'Wash Sale',
  position_limit: 'Position Limit',
}

const CHECK_BORDER_STYLES: Record<ComplianceStatus, string> = {
  fail: 'border-accent-red/30 bg-accent-red/5',
  warning: 'border-amber-200 bg-amber-50/50',
  pass: 'border-border-primary',
}

const CHECK_ICONS: Record<ComplianceStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warning: AlertTriangle,
  fail: XCircle,
}

const CHECK_ICON_COLORS: Record<ComplianceStatus, string> = {
  pass: 'text-accent-green',
  warning: 'text-amber-500',
  fail: 'text-accent-red',
}

type ComplianceReviewStepProps = {
  complianceResults: TradeComplianceResult[]
  accounts: { id: string; name: string }[] | undefined
  allComplianceChecks: TradeComplianceCheck[]
  hasComplianceFailure: boolean
  executeMutation: { isPending: boolean }
  handleExecute: () => void
  setStep: (step: WizardStep) => void
}

export function ComplianceReviewStep({
  complianceResults,
  accounts,
  allComplianceChecks,
  hasComplianceFailure,
  executeMutation,
  handleExecute,
  setStep,
}: ComplianceReviewStepProps) {
  return (
    <div className="space-y-4">
      {/* Per-account compliance results */}
      {complianceResults.map((result) => {
        const acc = accounts?.find((a) => a.id === result.accountId)
        return (
          <Card key={result.accountId}>
            <CardHeader action={
              <Badge variant={COMPLIANCE_STATUS_BADGE[result.overallStatus]}>{result.overallStatus}</Badge>
            }>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-text-tertiary" />
                {acc?.name ?? result.accountId}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.checks.map((check, i) => (
                <ComplianceCheckRow key={i} check={check} />
              ))}
            </CardContent>
          </Card>
        )
      })}

      {complianceResults.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-caption text-text-tertiary">No compliance checks to display</p>
          </CardContent>
        </Card>
      )}

      <ComplianceSummaryBanner checks={allComplianceChecks} />

      <div className="flex justify-between">
        <button onClick={() => setStep('preview')} className="rounded border border-border-secondary px-4 py-2 text-body text-text-secondary hover:bg-surface-tertiary">
          Back
        </button>
        <button
          onClick={handleExecute}
          disabled={hasComplianceFailure || executeMutation.isPending}
          className="flex items-center gap-2 rounded bg-accent-green px-4 py-2 text-body font-medium text-white hover:bg-accent-green/90 disabled:opacity-50"
        >
          {executeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <RefreshCw className="h-4 w-4" />
          Execute Rebalance
        </button>
      </div>
    </div>
  )
}

function ComplianceSummaryBanner({ checks }: { checks: TradeComplianceCheck[] }) {
  const hasFailure = checks.some((c) => c.status === 'fail')
  const hasWarning = checks.some((c) => c.status === 'warning')

  if (hasFailure) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/5 p-4 text-body text-accent-red">
        <XCircle className="h-5 w-5 shrink-0" />
        <span>One or more compliance checks failed. Resolve failures before executing.</span>
      </div>
    )
  }

  if (hasWarning) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-body text-amber-700">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span>Compliance warnings detected. Review before proceeding.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/5 p-4 text-body text-accent-green">
      <CheckCircle2 className="h-5 w-5 shrink-0" />
      <span>All compliance checks passed. Ready to execute.</span>
    </div>
  )
}

const ComplianceCheckRow = memo(function ComplianceCheckRow({ check }: { check: TradeComplianceCheck }) {
  const { formatWithConversion } = useFormatCurrency()
  const StatusIcon = CHECK_ICONS[check.status] ?? AlertTriangle

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-md border p-3',
      CHECK_BORDER_STYLES[check.status],
    )}>
      <StatusIcon className={cn('h-4 w-4', CHECK_ICON_COLORS[check.status])} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-body-strong">{check.rule}</span>
          <Badge variant={COMPLIANCE_STATUS_BADGE[check.status]}>{check.status}</Badge>
          <Badge variant="default">{CATEGORY_LABELS[check.category]}</Badge>
        </div>
        <p className="mt-0.5 text-caption text-text-secondary">{check.message}</p>
        {check.details && (
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-tertiary">
            {check.details.symbol && <span>Symbol: <span className="font-mono font-medium">{check.details.symbol}</span></span>}
            {check.details.currentWeight !== undefined && (
              <span>Current: <span className="font-mono font-medium">{(check.details.currentWeight * 100).toFixed(1)}%</span></span>
            )}
            {check.details.postTradeWeight !== undefined && (
              <span>Post-trade: <span className="font-mono font-medium">{(check.details.postTradeWeight * 100).toFixed(1)}%</span></span>
            )}
            {check.details.limit !== undefined && (
              <span>Limit: <span className="font-mono font-medium">{(check.details.limit * 100).toFixed(0)}%</span></span>
            )}
            {check.details.cashBalance !== undefined && (
              <span>Cash: <span className="font-mono font-medium">{formatWithConversion(check.details.cashBalance, 'USD')}</span></span>
            )}
            {check.details.minimumCash !== undefined && (
              <span>Min: <span className="font-mono font-medium">{formatWithConversion(check.details.minimumCash, 'USD')}</span></span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
