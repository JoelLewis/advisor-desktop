import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Shield, Save } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import {
  useAIPermissions, useUpdateAIPermissions,
} from '@/hooks/use-settings'
import {
  AI_ACTION_TYPES, AI_ACTION_TYPE_LABELS,
  PERMISSION_MODES, PERMISSION_MODE_LABELS,
  DATA_SCOPES, DATA_SCOPE_LABELS,
  EXECUTION_SCHEDULES, EXECUTION_SCHEDULE_LABELS,
} from '@/types/standing-rule'
import type {
  AIPermissionMatrix, PermissionMode, AIActionType,
} from '@/types/standing-rule'
import { SAVE_BUTTON_CLASS } from './shared'

const MODE_COLORS: Record<PermissionMode, string> = {
  auto_approve: 'border-accent-green bg-accent-green/10 text-accent-green',
  queue_for_review: 'border-accent-blue bg-accent-blue/10 text-accent-blue',
  notify_and_hold: 'border-accent-red bg-accent-red/10 text-accent-red',
}

export function PermissionMatrixCard() {
  const { data, isLoading } = useAIPermissions()
  const update = useUpdateAIPermissions()
  const [matrix, setMatrix] = useState<AIPermissionMatrix | null>(null)

  useEffect(() => { if (data) setMatrix(data) }, [data])

  function save() {
    if (matrix) update.mutate(matrix, {
      onSuccess: () => toast.success('Permissions saved'),
    })
  }

  if (isLoading || !matrix) return <Skeleton className="h-64" />

  function setPermissionMode(actionType: AIActionType, mode: PermissionMode) {
    if (!matrix) return
    setMatrix({
      ...matrix,
      permissions: matrix.permissions.map((p) =>
        p.actionType === actionType ? { ...p, mode } : p,
      ),
    })
  }

  return (
    <Card>
      <CardHeader action={
        <button onClick={save} disabled={update.isPending} className={SAVE_BUTTON_CLASS}>
          <Save className="h-3.5 w-3.5" /> Save
        </button>
      }>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent-blue" />
          AI Permission Matrix
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-caption text-text-tertiary">
          Control what actions the AI can take autonomously, queue for your review, or hold for manual initiation.
        </p>

        {/* Per-action permissions */}
        <div className="space-y-2">
          {AI_ACTION_TYPES.map((actionType) => {
            const entry = matrix.permissions.find((p) => p.actionType === actionType)
            const currentMode = entry?.mode ?? 'notify_and_hold'
            return (
              <div key={actionType} className="flex items-center justify-between rounded-md border border-border-primary px-4 py-2.5">
                <span className="text-body text-text-primary">{AI_ACTION_TYPE_LABELS[actionType]}</span>
                <div className="flex gap-1">
                  {PERMISSION_MODES.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPermissionMode(actionType, mode)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                        currentMode === mode
                          ? MODE_COLORS[mode]
                          : 'border-border-primary text-text-tertiary hover:bg-surface-tertiary',
                      )}
                    >
                      {PERMISSION_MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Data scope + execution schedule */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-caption font-medium text-text-secondary">Data Access Scope</label>
            <select
              value={matrix.dataScope}
              onChange={(e) => setMatrix({ ...matrix, dataScope: e.target.value as AIPermissionMatrix['dataScope'] })}
              className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
            >
              {DATA_SCOPES.map((s) => (
                <option key={s} value={s}>{DATA_SCOPE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-caption font-medium text-text-secondary">Execution Schedule</label>
            <select
              value={matrix.executionSchedule}
              onChange={(e) => setMatrix({ ...matrix, executionSchedule: e.target.value as AIPermissionMatrix['executionSchedule'] })}
              className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
            >
              {EXECUTION_SCHEDULES.map((s) => (
                <option key={s} value={s}>{EXECUTION_SCHEDULE_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
