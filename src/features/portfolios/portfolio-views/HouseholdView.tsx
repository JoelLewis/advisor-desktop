import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, RefreshCw, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import { ACCOUNT_TYPE_SHORT_LABELS, TAX_TREATMENT_LABELS, taxTreatmentBadgeVariant } from '@/lib/labels'
import type { Account } from '@/types/account'
import type { DriftStatus } from '@/types/portfolio'

export type HouseholdGroup = {
  id: string
  name: string
  accounts: Account[]
  totalAUM: number
  avgDrift: number
  driftedCount: number
}

export function HouseholdView({
  groups,
  driftMap,
  onNavigateAccount,
  onRebalanceHousehold,
}: {
  groups: HouseholdGroup[]
  driftMap: Map<string, DriftStatus>
  onNavigateAccount: (accountId: string) => void
  onRebalanceHousehold: (accountIds: string[]) => void
}) {
  const { formatWithConversion: fmtConvert } = useFormatCurrency()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isExpanded = expandedIds.has(group.id)
        return (
          <div key={group.id} className="rounded-lg border border-border-primary bg-surface-primary">
            <button
              onClick={() => toggleExpand(group.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-tertiary/50"
            >
              <div className="flex items-center gap-3">
                {isExpanded
                  ? <ChevronDown className="h-4 w-4 text-text-tertiary" />
                  : <ChevronRight className="h-4 w-4 text-text-tertiary" />
                }
                <Users className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-body-strong">{group.name}</p>
                  <p className="text-caption text-text-tertiary">{group.accounts.length} account{group.accounts.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="font-mono text-body">{fmtConvert(group.totalAUM, 'USD', { compact: true })}</p>
                  <p className="text-caption text-text-tertiary">Total AUM</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'font-mono text-caption',
                    group.avgDrift * 100 > 3 ? 'text-accent-red' : group.avgDrift * 100 > 1.5 ? 'text-amber-600' : 'text-accent-green',
                  )}>
                    {(group.avgDrift * 100).toFixed(1)}%
                  </p>
                  <p className="text-caption text-text-tertiary">Avg drift</p>
                </div>
                {group.driftedCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRebalanceHousehold(group.accounts.map((a) => a.id))
                    }}
                    className="flex items-center gap-1.5 rounded bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Rebalance Household
                  </button>
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-border-primary">
                {group.accounts.map((acc) => {
                  const drift = driftMap.get(acc.id)
                  const driftVal = drift ? drift.totalDrift * 100 : 0
                  return (
                    <button
                      key={acc.id}
                      onClick={() => onNavigateAccount(acc.id)}
                      className="flex w-full items-center justify-between border-b border-border-primary px-4 py-2.5 pl-12 text-left last:border-b-0 hover:bg-surface-tertiary/50"
                    >
                      <div>
                        <p className="text-body">{acc.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-caption text-text-tertiary">{acc.accountNumber}</span>
                          <Badge variant={taxTreatmentBadgeVariant(acc.taxTreatment)}>
                            {TAX_TREATMENT_LABELS[acc.taxTreatment]}
                          </Badge>
                          <span className="text-caption text-text-tertiary">{ACCOUNT_TYPE_SHORT_LABELS[acc.type]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="font-mono text-body">
                          {fmtConvert(acc.totalValue, acc.baseCurrency ?? 'USD', { compact: true })}
                        </span>
                        {drift && (
                          <div className="flex items-center gap-1.5">
                            {drift.needsRebalance && <AlertTriangle className="h-3.5 w-3.5 text-accent-red" />}
                            <span className={cn(
                              'font-mono text-caption',
                              drift.needsRebalance ? 'text-accent-red' : driftVal > 1.5 ? 'text-amber-600' : 'text-accent-green',
                            )}>
                              {driftVal.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {groups.length === 0 && (
        <p className="py-8 text-center text-caption text-text-tertiary">No households found</p>
      )}
    </div>
  )
}
