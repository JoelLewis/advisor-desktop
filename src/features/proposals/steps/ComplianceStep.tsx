import { useState } from 'react'
import { ShieldCheck, AlertTriangle, XCircle, Check, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProposal, useProposalComplianceCheck } from '@/hooks/use-proposals'
import type { ProposalComplianceCheck } from '@/types/proposal'

type ComplianceStepProps = {
  proposalId: string
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pass: <Check className="h-4 w-4 text-accent-green" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  fail: <XCircle className="h-4 w-4 text-accent-red" />,
}

const STATUS_BG: Record<string, string> = {
  pass: 'bg-accent-green/5 border-accent-green/20',
  warning: 'bg-yellow-50 border-yellow-200',
  fail: 'bg-accent-red/5 border-accent-red/20',
}

export function ComplianceStep({ proposalId }: ComplianceStepProps) {
  const { data: proposal } = useProposal(proposalId)
  const complianceCheck = useProposalComplianceCheck(proposalId)
  const [hasRun, setHasRun] = useState(false)

  if (!proposal) return null

  const checks = proposal.complianceChecks
  const passCount = checks.filter((c) => c.status === 'pass').length
  const warnCount = checks.filter((c) => c.status === 'warning').length
  const failCount = checks.filter((c) => c.status === 'fail').length

  function handleRunCheck() {
    complianceCheck.mutate(undefined, {
      onSuccess: () => setHasRun(true),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-body font-semibold text-text-primary">Compliance Review</h3>
          <p className="text-caption text-text-secondary">
            {checks.length === 0
              ? 'Run compliance checks before finalizing the proposal.'
              : `${passCount} passed, ${warnCount} warnings, ${failCount} failures`}
          </p>
        </div>
        <button
          onClick={handleRunCheck}
          disabled={complianceCheck.isPending}
          className="flex items-center gap-2 rounded-md bg-accent-blue px-4 py-2 text-caption font-medium text-white hover:bg-accent-blue/90 disabled:opacity-40"
        >
          {complianceCheck.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...</>
          ) : hasRun ? (
            <><RefreshCw className="h-3.5 w-3.5" /> Re-run Checks</>
          ) : (
            <><ShieldCheck className="h-3.5 w-3.5" /> Run Compliance Check</>
          )}
        </button>
      </div>

      {/* Summary banner */}
      {checks.length > 0 && (
        <div className={cn(
          'rounded-lg border p-3',
          failCount > 0 ? 'bg-accent-red/5 border-accent-red/20' :
          warnCount > 0 ? 'bg-yellow-50 border-yellow-200' :
          'bg-accent-green/5 border-accent-green/20',
        )}>
          <p className={cn(
            'text-caption font-medium',
            failCount > 0 ? 'text-accent-red' :
            warnCount > 0 ? 'text-yellow-700' :
            'text-accent-green',
          )}>
            {failCount > 0
              ? 'Compliance check failed — resolve issues before finalizing.'
              : warnCount > 0
                ? 'Compliance checks passed with warnings — review before proceeding.'
                : 'All compliance checks passed.'}
          </p>
        </div>
      )}

      {/* Compliance check results */}
      {checks.length > 0 && (
        <div className="space-y-2">
          {checks.map((check: ProposalComplianceCheck) => (
            <div
              key={check.id}
              className={cn('rounded-lg border p-4', STATUS_BG[check.status])}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{STATUS_ICONS[check.status]}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-text-primary">{check.rule}</span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
                      check.severity === 'critical' ? 'bg-accent-red/10 text-accent-red' :
                      check.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-surface-tertiary text-text-tertiary',
                    )}>
                      {check.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-text-secondary">{check.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {checks.length === 0 && (
        <div className="rounded-lg border border-dashed border-border-primary py-12 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-body text-text-secondary">No compliance checks have been run yet.</p>
          <p className="text-caption text-text-tertiary">Click "Run Compliance Check" to validate the proposal.</p>
        </div>
      )}
    </div>
  )
}
