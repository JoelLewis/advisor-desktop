import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, DollarSign, Target, AlertTriangle,
  Heart, Shield, TrendingUp, AlertCircle, ChevronUp,
  ArrowUp, Minus, Timer, ArrowUpDown, Lock, X,
} from 'lucide-react'
import { NBACard, CATEGORY_CONFIG } from '@/components/ui/NBACard'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card, CardHeader } from '@/components/ui/Card'
import { BatchActionModal } from './BatchActionModal'
import { useNBAs, useDismissNBA } from '@/hooks/use-nbas'
import { useUIStore } from '@/store/ui-store'
import type { NBA, NBACategory } from '@/types/nba'

const CATEGORY_OPTIONS = [
  { value: 'rebalancing', label: 'Rebalancing', icon: <RefreshCw className="h-3.5 w-3.5" /> },
  { value: 'tax_management', label: 'Tax Management', icon: <DollarSign className="h-3.5 w-3.5" /> },
  { value: 'planning', label: 'Planning', icon: <Target className="h-3.5 w-3.5" /> },
  { value: 'risk', label: 'Risk', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { value: 'client_service', label: 'Client Service', icon: <Heart className="h-3.5 w-3.5" /> },
  { value: 'compliance', label: 'Compliance', icon: <Shield className="h-3.5 w-3.5" /> },
  { value: 'growth', label: 'Growth', icon: <TrendingUp className="h-3.5 w-3.5" /> },
]

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', icon: <AlertCircle className="h-3.5 w-3.5 text-accent-red" /> },
  { value: 'high', label: 'High', icon: <ChevronUp className="h-3.5 w-3.5 text-amber-600" /> },
  { value: 'medium', label: 'Medium', icon: <ArrowUp className="h-3.5 w-3.5 text-amber-500" /> },
  { value: 'low', label: 'Low', icon: <Minus className="h-3.5 w-3.5 text-text-tertiary" /> },
]

const URGENCY_OPTIONS = [
  { value: 'time_critical', label: 'Time-Critical', icon: <Timer className="h-3.5 w-3.5 text-accent-red" /> },
  { value: 'this_week', label: 'This Week', icon: <Timer className="h-3.5 w-3.5 text-amber-600" /> },
  { value: 'this_month', label: 'This Month', icon: <Timer className="h-3.5 w-3.5 text-accent-blue" /> },
  { value: 'when_convenient', label: 'When Convenient', icon: <Timer className="h-3.5 w-3.5 text-text-tertiary" /> },
]

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function getUrgencyBucket(urgency: number): string {
  if (urgency > 80) return 'time_critical'
  if (urgency > 60) return 'this_week'
  if (urgency > 40) return 'this_month'
  return 'when_convenient'
}

type SortMode = 'priority' | 'urgency'

function filterAndSortNBAs(
  nbas: NBA[],
  categories: string[],
  priorities: string[],
  urgencyBuckets: string[],
  sortMode: SortMode,
): NBA[] {
  let filtered = nbas
  if (categories.length > 0) {
    filtered = filtered.filter((n) => categories.includes(n.category))
  }
  if (priorities.length > 0) {
    filtered = filtered.filter((n) => priorities.includes(n.priority))
  }
  if (urgencyBuckets.length > 0) {
    filtered = filtered.filter((n) => urgencyBuckets.includes(getUrgencyBucket(n.scoring.urgency)))
  }

  if (sortMode === 'urgency') {
    return [...filtered].sort((a, b) => b.scoring.urgency - a.scoring.urgency)
  }
  return [...filtered].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  )
}

type BatchGroup = { groupId: string; title: string; category: NBACategory; nbas: NBA[] }

export function NBAFeed() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedUrgency, setSelectedUrgency] = useState<string[]>([])
  const [sortMode, setSortMode] = useState<SortMode>('priority')
  const [batchGroup, setBatchGroup] = useState<BatchGroup | null>(null)
  const [complianceDismiss, setComplianceDismiss] = useState<{ nbaId: string; title: string } | null>(null)
  const [dismissReason, setDismissReason] = useState('')

  const navigate = useNavigate()
  const { data: nbas, isLoading } = useNBAs({ dismissed: 'false' })
  const dismiss = useDismissNBA()
  const setInitialMessage = useUIStore((s) => s.setInitialMessage)

  const handleDismiss = useCallback((id: string) => {
    const nba = nbas?.find((n) => n.id === id)
    if (nba?.complianceInfo?.nonDismissible && !nba.complianceInfo.supervisorOverride) {
      setComplianceDismiss({ nbaId: id, title: nba.title })
      setDismissReason('')
      return
    }
    dismiss.mutate(id)
  }, [nbas, dismiss])

  const handleComplianceDismissConfirm = useCallback(() => {
    if (!complianceDismiss || !dismissReason.trim()) return
    dismiss.mutate(complianceDismiss.nbaId, {
      onSuccess: () => setComplianceDismiss(null),
    })
    // Note: In a real implementation, the reason would be sent to the server
    // with supervisorOverride: true. For the mock, just dismiss it.
    setComplianceDismiss(null)
  }, [complianceDismiss, dismissReason, dismiss])

  function handleAction(nbaId: string) {
    const nba = nbas?.find((n) => n.id === nbaId)
    if (!nba) return

    const route = nba.actionRoute
    if (route) {
      if (route.path) {
        const search = route.params ? '?' + new URLSearchParams(route.params).toString() : ''
        navigate(route.path + search)
      }
      if (route.openAI && route.aiMessage) {
        setInitialMessage(route.aiMessage)
      } else if (!route.path) {
        setInitialMessage(`Take action on: "${nba.title}" — ${nba.description}`)
      }
    } else {
      setInitialMessage(`Take action on: "${nba.title}" — ${nba.description}`)
    }
  }

  const filteredNBAs = useMemo(
    () => (nbas ? filterAndSortNBAs(nbas, selectedCategories, selectedPriorities, selectedUrgency, sortMode) : []),
    [nbas, selectedCategories, selectedPriorities, selectedUrgency, sortMode],
  )

  const groups = useMemo(() => {
    const groupMap = new Map<string, BatchGroup>()
    for (const nba of filteredNBAs) {
      if (nba.groupId) {
        const existing = groupMap.get(nba.groupId)
        if (existing) {
          existing.nbas.push(nba)
        } else {
          groupMap.set(nba.groupId, { groupId: nba.groupId, title: nba.title, category: nba.category, nbas: [nba] })
        }
      }
    }
    return new Map([...groupMap.entries()].filter(([, g]) => g.nbas.length >= 2))
  }, [filteredNBAs])

  const renderedGroupBanners = new Set<string>()

  return (
    <Card>
      <CardHeader
        action={
          <div className="flex items-center gap-2" data-annotation="actions-filters">
            <MultiSelect
              options={CATEGORY_OPTIONS}
              selected={selectedCategories}
              onChange={setSelectedCategories}
              placeholder="All Categories"
            />
            <MultiSelect
              options={PRIORITY_OPTIONS}
              selected={selectedPriorities}
              onChange={setSelectedPriorities}
              placeholder="All Priorities"
            />
            <MultiSelect
              options={URGENCY_OPTIONS}
              selected={selectedUrgency}
              onChange={setSelectedUrgency}
              placeholder="All Urgency"
            />
            <button
              onClick={() => setSortMode((m) => m === 'priority' ? 'urgency' : 'priority')}
              className="flex items-center gap-1 rounded-md border border-border-primary px-2 py-1.5 text-caption text-text-secondary hover:bg-surface-tertiary"
              title={`Sort by ${sortMode === 'priority' ? 'urgency' : 'priority'}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortMode === 'priority' ? 'Priority' : 'Urgency'}
            </button>
          </div>
        }
      >
        Next Best Actions
      </CardHeader>
      <div className="max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin p-4" data-annotation="actions-feed">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        ) : filteredNBAs.length > 0 ? (
          <div className="space-y-3">
            {filteredNBAs.map((nba) => {
              const group = nba.groupId ? groups.get(nba.groupId) : undefined
              const showBanner = group && !renderedGroupBanners.has(nba.groupId!)
              if (showBanner) renderedGroupBanners.add(nba.groupId!)

              return (
                <div key={nba.id} {...(nba === filteredNBAs[0] ? { 'data-annotation': 'actions-card' } : {})}>
                  {showBanner && group && (
                    <button
                      onClick={() => setBatchGroup(group)}
                      data-annotation="actions-batch"
                      className="mb-2 flex w-full items-center justify-between rounded-lg border border-accent-blue/30 bg-accent-blue/5 px-4 py-2 text-left transition-colors hover:bg-accent-blue/10"
                    >
                      <span className="text-caption font-medium text-accent-blue">
                        {group.nbas.length} clients — {CATEGORY_CONFIG[nba.category].label}
                      </span>
                      <span className="rounded-md bg-accent-blue px-2.5 py-0.5 text-[10px] font-medium text-white">
                        Batch Action
                      </span>
                    </button>
                  )}
                  <NBACard
                    nba={nba}
                    onDismiss={handleDismiss}
                    onAction={handleAction}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-caption text-text-tertiary">
            No actions match your filters
          </div>
        )}
      </div>

      {batchGroup && (
        <BatchActionModal
          groupId={batchGroup.groupId}
          title={batchGroup.title}
          category={batchGroup.category}
          nbas={batchGroup.nbas}
          onClose={() => setBatchGroup(null)}
        />
      )}

      {/* Compliance dismiss reason dialog */}
      {complianceDismiss && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setComplianceDismiss(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border-primary bg-surface-primary p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-accent-red" />
                <h3 className="text-body-strong text-text-primary">Compliance Action Required</h3>
              </div>
              <button
                onClick={() => setComplianceDismiss(null)}
                className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-caption text-text-secondary">
              &quot;{complianceDismiss.title}&quot; is a compliance-required action and cannot be dismissed without a documented reason and supervisor override.
            </p>
            <label className="mt-4 block text-caption font-medium text-text-secondary">
              Reason for dismissal <span className="text-accent-red">*</span>
            </label>
            <textarea
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="Provide justification for dismissing this compliance action..."
              className="mt-1 w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setComplianceDismiss(null)}
                className="rounded-md px-3 py-1.5 text-caption text-text-secondary hover:bg-surface-tertiary"
              >
                Cancel
              </button>
              <button
                onClick={handleComplianceDismissConfirm}
                disabled={!dismissReason.trim()}
                className="rounded-md bg-accent-red px-3 py-1.5 text-caption font-medium text-white transition-colors hover:bg-accent-red/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Request Override &amp; Dismiss
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
