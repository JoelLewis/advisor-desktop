import { Loader2, AlertTriangle, Layers } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import type { ModelAssignment } from '@/types/portfolio'

export type SelectionMode = 'accounts' | 'model'

export const SELECTION_MODE_OPTIONS: { id: SelectionMode; label: string }[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'model', label: 'Model' },
]

type SelectAccountsStepProps = {
  accounts: { id: string; name: string; accountNumber: string; totalValue: number; modelId: string }[] | undefined
  driftedAccounts: { id: string; name: string; accountNumber: string; totalValue: number; modelId: string }[]
  driftMap: Map<string, { totalDrift: number; needsRebalance: boolean }>
  selectedIds: Set<string>
  toggleSelect: (id: string) => void
  selectionMode: SelectionMode
  setSelectionMode: (mode: SelectionMode) => void
  selectedModelId: string | null
  handleSelectModel: (modelId: string) => void
  driftThreshold: number
  setDriftThreshold: (val: number) => void
  taxAware: boolean
  setTaxAware: (val: boolean) => void
  handlePreview: () => void
  previewMutation: { isPending: boolean }
  formatWithConversion: ReturnType<typeof useFormatCurrency>['formatWithConversion']
  models: ModelAssignment[]
  driftedAccountsByModel: Map<string, string[]>
}

export function SelectAccountsStep({
  accounts,
  driftedAccounts,
  driftMap,
  selectedIds,
  toggleSelect,
  selectionMode,
  setSelectionMode,
  selectedModelId,
  handleSelectModel,
  driftThreshold,
  setDriftThreshold,
  taxAware,
  setTaxAware,
  handlePreview,
  previewMutation,
  formatWithConversion,
  models,
  driftedAccountsByModel,
}: SelectAccountsStepProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader action={
          <div className="flex items-center gap-4">
            {/* Selection mode toggle */}
            <div className="flex items-center gap-2 text-caption text-text-secondary">
              <span>Select by:</span>
              <div className="inline-flex rounded-lg border border-border-primary">
                {SELECTION_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectionMode(opt.id)
                      if (opt.id === 'accounts') {
                        // Parent handles clearing selectedModelId via setSelectionMode
                      }
                    }}
                    className={cn(
                      'px-2.5 py-1 text-caption font-medium transition-colors first:rounded-l-[7px] last:rounded-r-[7px]',
                      selectionMode === opt.id
                        ? 'bg-accent-blue text-white'
                        : 'text-text-secondary hover:bg-surface-tertiary',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-caption text-text-secondary">
              Drift threshold
              <input
                type="number"
                value={driftThreshold}
                onChange={(e) => setDriftThreshold(Number(e.target.value))}
                className="w-16 rounded border border-border-secondary px-2 py-1 text-caption font-mono"
                min={0.5}
                max={10}
                step={0.5}
              />
              %
            </label>
            <label className="flex items-center gap-2 text-caption text-text-secondary">
              <input
                type="checkbox"
                checked={taxAware}
                onChange={(e) => setTaxAware(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-accent-blue"
              />
              Tax-aware
            </label>
          </div>
        }>
          {selectionMode === 'accounts' ? 'Accounts Exceeding Drift Threshold' : 'Select Model to Rebalance'}
        </CardHeader>
        <CardContent>
          {!accounts ? (
            <Skeleton className="h-40" />
          ) : selectionMode === 'model' ? (
            <ModelSelectionView
              models={models}
              driftedAccountsByModel={driftedAccountsByModel}
              accounts={accounts}
              driftMap={driftMap}
              selectedModelId={selectedModelId}
              selectedIds={selectedIds}
              onSelectModel={handleSelectModel}
              onToggleAccount={toggleSelect}
            />
          ) : (
            <div className="space-y-2">
              {driftedAccounts.map((acc) => {
                const drift = driftMap.get(acc.id)
                return (
                  <label
                    key={acc.id}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-md border px-4 py-3',
                      selectedIds.has(acc.id) ? 'border-accent-blue bg-accent-blue/5' : 'border-border-primary hover:bg-surface-tertiary',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(acc.id)}
                        onChange={() => toggleSelect(acc.id)}
                        className="h-4 w-4 rounded accent-accent-blue"
                      />
                      <div>
                        <p className="text-body-strong">{acc.name}</p>
                        <p className="font-mono text-caption text-text-tertiary">{acc.accountNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-mono text-body">{formatWithConversion(acc.totalValue, 'USD', { compact: true })}</span>
                      <span className="font-mono text-caption text-accent-red">
                        {drift ? `${(drift.totalDrift * 100).toFixed(1)}% drift` : ''}
                      </span>
                    </div>
                  </label>
                )
              })}
              {driftedAccounts.length === 0 && (
                <p className="py-8 text-center text-caption text-text-tertiary">
                  No accounts exceed the {driftThreshold}% drift threshold
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <button
          onClick={handlePreview}
          disabled={selectedIds.size === 0 || previewMutation.isPending}
          className="flex items-center gap-2 rounded bg-accent-blue px-4 py-2 text-body font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50"
        >
          {previewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Preview Trades
        </button>
      </div>
    </div>
  )
}

// ── Model Selection View ──

function ModelSelectionView({
  models,
  driftedAccountsByModel,
  accounts,
  driftMap,
  selectedModelId,
  selectedIds,
  onSelectModel,
  onToggleAccount,
}: {
  models: ModelAssignment[]
  driftedAccountsByModel: Map<string, string[]>
  accounts: { id: string; name: string; accountNumber: string; totalValue: number; modelId: string }[]
  driftMap: Map<string, { totalDrift: number; needsRebalance: boolean }>
  selectedModelId: string | null
  selectedIds: Set<string>
  onSelectModel: (modelId: string) => void
  onToggleAccount: (accountId: string) => void
}) {
  const { formatWithConversion } = useFormatCurrency()
  // Only show models that have drifted accounts
  const modelsWithDrift = models.filter((m) => (driftedAccountsByModel.get(m.id)?.length ?? 0) > 0)
  const modelsWithoutDrift = models.filter((m) => (driftedAccountsByModel.get(m.id)?.length ?? 0) === 0)

  const selectedModelAccounts = selectedModelId
    ? accounts.filter((a) => a.modelId === selectedModelId && driftMap.get(a.id)?.needsRebalance)
    : []

  return (
    <div className="space-y-4">
      {/* Model cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {modelsWithDrift.map((model) => {
          const driftedCount = driftedAccountsByModel.get(model.id)?.length ?? 0
          const modelAccounts = accounts.filter((a) => a.modelId === model.id)
          const totalAUM = modelAccounts.reduce((sum, a) => sum + a.totalValue, 0)
          const isSelected = selectedModelId === model.id

          return (
            <button
              key={model.id}
              onClick={() => onSelectModel(model.id)}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                isSelected
                  ? 'border-accent-blue bg-accent-blue/5 ring-1 ring-accent-blue'
                  : 'border-border-primary hover:bg-surface-tertiary',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent-blue" />
                  <span className="text-body-strong">{model.name}</span>
                </div>
                {isSelected && (
                  <Badge variant="blue">Selected</Badge>
                )}
              </div>
              <p className="mt-1 text-caption text-text-secondary">{model.description}</p>
              <div className="mt-2 flex gap-4 text-caption">
                <span className="text-text-secondary">{modelAccounts.length} accounts</span>
                <span className="font-mono text-text-secondary">{formatWithConversion(totalAUM, 'USD', { compact: true })}</span>
                <span className="text-accent-red">
                  <AlertTriangle className="mr-0.5 inline h-3 w-3" />
                  {driftedCount} drifted
                </span>
              </div>
            </button>
          )
        })}
        {modelsWithoutDrift.map((model) => {
          const modelAccounts = accounts.filter((a) => a.modelId === model.id)
          const totalAUM = modelAccounts.reduce((sum, a) => sum + a.totalValue, 0)

          return (
            <div
              key={model.id}
              className="rounded-lg border border-border-primary p-4 opacity-50"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-text-tertiary" />
                <span className="text-body-strong text-text-secondary">{model.name}</span>
              </div>
              <p className="mt-1 text-caption text-text-tertiary">{model.description}</p>
              <div className="mt-2 flex gap-4 text-caption">
                <span className="text-text-tertiary">{modelAccounts.length} accounts</span>
                <span className="font-mono text-text-tertiary">{formatWithConversion(totalAUM, 'USD', { compact: true })}</span>
                <span className="text-accent-green">No drift</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Individual account selection under selected model */}
      {selectedModelId && selectedModelAccounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-caption font-medium text-text-secondary">
            Drifted accounts in {models.find((m) => m.id === selectedModelId)?.name} - deselect individual accounts if needed:
          </p>
          {selectedModelAccounts.map((acc) => {
            const drift = driftMap.get(acc.id)
            return (
              <label
                key={acc.id}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-md border px-4 py-3',
                  selectedIds.has(acc.id) ? 'border-accent-blue bg-accent-blue/5' : 'border-border-primary hover:bg-surface-tertiary',
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(acc.id)}
                    onChange={() => onToggleAccount(acc.id)}
                    className="h-4 w-4 rounded accent-accent-blue"
                  />
                  <div>
                    <p className="text-body-strong">{acc.name}</p>
                    <p className="font-mono text-caption text-text-tertiary">{acc.accountNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-mono text-body">{formatWithConversion(acc.totalValue, 'USD', { compact: true })}</span>
                  <span className="font-mono text-caption text-accent-red">
                    {drift ? `${(drift.totalDrift * 100).toFixed(1)}% drift` : ''}
                  </span>
                </div>
              </label>
            )
          })}
        </div>
      )}

      {models.length === 0 && (
        <p className="py-8 text-center text-caption text-text-tertiary">No models available</p>
      )}
    </div>
  )
}
