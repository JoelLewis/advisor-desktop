import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { CATEGORY_CONFIG } from '@/components/ui/NBACard'
import { useBatchAction } from '@/hooks/use-batch-nba'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import type { NBA, NBACategory } from '@/types/nba'

type BatchActionModalProps = {
  groupId: string
  title: string
  category: NBACategory
  nbas: NBA[]
  onClose: () => void
}

export function BatchActionModal({ groupId, title, category, nbas, onClose }: BatchActionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(nbas.map((n) => n.id)))
  const batchAction = useBatchAction()
  const navigate = useNavigate()
  const config = CATEGORY_CONFIG[category]
  const { formatWithConversion } = useFormatCurrency()

  const totalImpact = nbas
    .filter((n) => selectedIds.has(n.id))
    .reduce((sum, n) => sum + n.estimatedImpact, 0)

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(nbas.map((n) => n.id)))
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

  function getBatchAction(): 'rebalance' | 'create_tasks' | 'contact' {
    if (category === 'rebalancing') return 'rebalance'
    if (category === 'client_service' || category === 'compliance') return 'create_tasks'
    return 'contact'
  }

  function handleExecute() {
    batchAction.mutate(
      { groupId, nbaIds: [...selectedIds], action: getBatchAction() },
      {
        onSuccess: () => {
          onClose()
          if (category === 'rebalancing') navigate('/portfolios/rebalance')
        },
      },
    )
  }

  function getActionLabel(): string {
    const count = selectedIds.size
    if (category === 'rebalancing') return `Rebalance Selected (${count})`
    if (category === 'tax_management') return `Review Tax Lots (${count})`
    return `Create Tasks (${count})`
  }

  const actionLabel = getActionLabel()

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-accent-blue" />
            <div>
              <DialogTitle>{title}</DialogTitle>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
                <span className="text-caption text-text-tertiary">{nbas.length} items</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Select controls */}
        <div className="flex items-center gap-2 border-b border-border-primary px-5 py-2">
          <button onClick={selectAll} className="text-caption text-accent-blue hover:underline">Select All</button>
          <span className="text-text-tertiary">·</span>
          <button onClick={deselectAll} className="text-caption text-accent-blue hover:underline">Deselect All</button>
          <span className="ml-auto text-caption text-text-secondary">{selectedIds.size} of {nbas.length} selected</span>
        </div>

        {/* Items list */}
        <div className="max-h-[320px] overflow-y-auto scrollbar-thin" role="group" aria-label="NBA items">
          {nbas.map((nba) => {
            const selected = selectedIds.has(nba.id)
            return (
              <button
                key={nba.id}
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggleSelect(nba.id)}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-border-primary px-5 py-3 text-left transition-colors last:border-0',
                  selected ? 'bg-accent-blue/5' : 'hover:bg-surface-tertiary',
                )}
              >
                <div className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                  selected ? 'border-accent-blue bg-accent-blue text-white' : 'border-border-secondary',
                )} aria-hidden="true">
                  {selected && <Check className="h-3 w-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {nba.clients.map((c) => (
                      <span key={c.id} className="text-caption font-medium text-text-primary">{c.name}</span>
                    ))}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-text-tertiary">{nba.description}</p>
                </div>
                {nba.estimatedImpact > 0 && (
                  <span className="shrink-0 font-mono text-caption text-text-secondary">
                    {formatWithConversion(nba.estimatedImpact, 'USD', { compact: true })}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <DialogFooter className="justify-between">
          {totalImpact > 0 && (
            <span className="text-caption text-text-secondary">
              Total impact: <span className="font-medium font-mono">{formatWithConversion(totalImpact, 'USD', { compact: true })}</span> across {selectedIds.size} items
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-border-primary px-3 py-1.5 text-caption font-medium text-text-secondary hover:bg-surface-tertiary"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={selectedIds.size === 0 || batchAction.isPending}
              className="flex items-center gap-1.5 rounded-md bg-accent-blue px-4 py-1.5 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {batchAction.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...</>
              ) : (
                actionLabel
              )}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
