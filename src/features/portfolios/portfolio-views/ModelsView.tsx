import { AlertTriangle, Layers, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import type { Account } from '@/types/account'
import type { DriftStatus, ModelAssignment } from '@/types/portfolio'

export function ModelsView({
  models,
  accountsByModel,
  driftMap,
  onRebalanceModel,
}: {
  models: ModelAssignment[]
  accountsByModel: Map<string, Account[]>
  driftMap: Map<string, DriftStatus>
  onRebalanceModel: (modelId: string) => void
}) {
  const { formatWithConversion: fmtConvert } = useFormatCurrency()
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {models.map((model) => {
        const modelAccounts = accountsByModel.get(model.id) ?? []
        const totalAUM = modelAccounts.reduce((sum, a) => sum + a.totalValue, 0)
        const driftedCount = modelAccounts.filter((a) => driftMap.get(a.id)?.needsRebalance).length
        const avgDrift = modelAccounts.length > 0
          ? modelAccounts.reduce((sum, a) => sum + (driftMap.get(a.id)?.totalDrift ?? 0), 0) / modelAccounts.length
          : 0

        return (
          <Card key={model.id}>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-accent-blue" />
                    <h3 className="text-body-strong">{model.name}</h3>
                  </div>
                  <p className="mt-0.5 text-caption text-text-secondary">{model.description}</p>
                </div>
                {driftedCount > 0 && (
                  <button
                    onClick={() => onRebalanceModel(model.id)}
                    className="flex shrink-0 items-center gap-1.5 rounded bg-accent-blue px-2.5 py-1 text-caption font-medium text-white hover:bg-accent-blue/90"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Rebalance Model
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-caption">
                <span>Benchmark: <span className="font-mono font-medium text-text-primary">{model.benchmark}</span></span>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-md border border-border-primary bg-surface-secondary p-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-tertiary">Accounts</p>
                  <p className="font-mono text-body-strong">{modelAccounts.length}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-tertiary">Total AUM</p>
                  <p className="font-mono text-body-strong">{fmtConvert(totalAUM, 'USD', { compact: true })}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-tertiary">Avg Drift</p>
                  <p className={cn(
                    'font-mono text-body-strong',
                    avgDrift * 100 > 3 ? 'text-accent-red' : avgDrift * 100 > 1.5 ? 'text-amber-600' : 'text-accent-green',
                  )}>
                    {(avgDrift * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              {driftedCount > 0 && (
                <p className="text-caption text-accent-red">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  {driftedCount} account{driftedCount !== 1 ? 's' : ''} drifted
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {model.assetClasses.map((ac) => (
                  <span key={ac.assetClass} className="rounded bg-surface-tertiary px-2 py-0.5 text-[11px] text-text-secondary">
                    {ac.assetClass.replace(/_/g, ' ')} {(ac.targetWeight * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
      {models.length === 0 && (
        <p className="col-span-2 py-8 text-center text-caption text-text-tertiary">No models found</p>
      )}
    </div>
  )
}
