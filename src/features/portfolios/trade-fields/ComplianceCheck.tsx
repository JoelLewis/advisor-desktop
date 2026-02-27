import { Shield, AlertTriangle, XCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PreTradeViolation } from '@/services/oms'

type ComplianceCheckProps = {
  violations: PreTradeViolation[]
  isChecking: boolean
  passed: boolean | null
}

export function PreTradeComplianceDisplay({ violations, isChecking, passed }: ComplianceCheckProps) {
  if (isChecking) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border-primary bg-surface-secondary px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
        <span className="text-caption text-text-secondary">Running pre-trade compliance checks...</span>
      </div>
    )
  }

  if (passed === null) return null

  if (passed && violations.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-accent-green/30 bg-accent-green/5 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-accent-green" />
        <span className="text-caption text-accent-green">All compliance checks passed</span>
      </div>
    )
  }

  const blocks = violations.filter((v) => v.severity === 'block')
  const warnings = violations.filter((v) => v.severity === 'warning')

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className={cn('h-4 w-4', blocks.length > 0 ? 'text-accent-red' : 'text-amber-500')} />
        <span className={cn('text-caption font-medium', blocks.length > 0 ? 'text-accent-red' : 'text-amber-600')}>
          {blocks.length > 0
            ? `${blocks.length} compliance violation${blocks.length > 1 ? 's' : ''} — trade blocked`
            : `${warnings.length} compliance warning${warnings.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Violations */}
      {violations.map((v, i) => (
        <div
          key={i}
          className={cn(
            'rounded-md border-l-2 px-3 py-2',
            v.severity === 'block'
              ? 'border-l-accent-red bg-red-50/80'
              : 'border-l-amber-500 bg-amber-50/80',
          )}
        >
          <div className="flex items-start gap-2">
            {v.severity === 'block' ? (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-red" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-caption font-medium text-text-primary">{v.constraint}</span>
                <span className="text-mono-sm text-text-tertiary">
                  {v.currentValue} / {v.limit}
                </span>
              </div>
              <p className="mt-0.5 text-caption text-text-secondary">{v.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
