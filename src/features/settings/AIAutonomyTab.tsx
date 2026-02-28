import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Bot, Clock, Zap, Shield, Users, Plus, Pencil, Trash2, Power, PowerOff, Save } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatDate } from '@/lib/utils'
import {
  useStandingRules, useCreateStandingRule, useUpdateStandingRule, useDeleteStandingRule,
  useDelegationRules, useCreateDelegationRule, useUpdateDelegationRule, useDeleteDelegationRule,
  useAIPermissions, useUpdateAIPermissions,
} from '@/hooks/use-settings'
import {
  STANDING_RULE_ACTIONS, STANDING_RULE_ACTION_LABELS,
  AI_ACTION_TYPES, AI_ACTION_TYPE_LABELS,
  PERMISSION_MODES, PERMISSION_MODE_LABELS,
  DATA_SCOPES, DATA_SCOPE_LABELS,
  EXECUTION_SCHEDULES, EXECUTION_SCHEDULE_LABELS,
} from '@/types/standing-rule'
import type {
  StandingRule, TriggerType, StandingRuleAction,
  AIPermissionMatrix, PermissionMode, AIActionType,
} from '@/types/standing-rule'
import type { DelegationRule } from '@/types/settings'

const SAVE_BUTTON_CLASS = 'flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50'

// ─── Standing Rules ────────────────────────────

type StandingRuleFormData = {
  name: string
  triggerType: TriggerType
  triggerCondition: string
  action: StandingRuleAction
  actionDescription: string
}

const EMPTY_RULE: StandingRuleFormData = {
  name: '',
  triggerType: 'time_based',
  triggerCondition: '',
  action: 'generate_prep_brief',
  actionDescription: '',
}

function StandingRuleForm({ initial, onSave, onCancel, isPending }: {
  initial: StandingRuleFormData
  onSave: (data: StandingRuleFormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState(initial)

  return (
    <div className="space-y-3 rounded-lg border border-accent-blue/30 bg-accent-blue/5 p-3">
      <input
        type="text"
        placeholder="Rule name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-caption font-medium text-text-secondary">Trigger Type</label>
          <select
            value={form.triggerType}
            onChange={(e) => setForm({ ...form, triggerType: e.target.value as TriggerType })}
            className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
          >
            <option value="time_based">Time-Based</option>
            <option value="event_based">Event-Based</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-caption font-medium text-text-secondary">Action</label>
          <select
            value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value as StandingRuleAction })}
            className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
          >
            {STANDING_RULE_ACTIONS.map((a) => (
              <option key={a} value={a}>{STANDING_RULE_ACTION_LABELS[a]}</option>
            ))}
          </select>
        </div>
      </div>
      <input
        type="text"
        placeholder="Trigger condition (e.g., '48h before quarterly review')"
        value={form.triggerCondition}
        onChange={(e) => setForm({ ...form, triggerCondition: e.target.value })}
        className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
      />
      <input
        type="text"
        placeholder="Action description"
        value={form.actionDescription}
        onChange={(e) => setForm({ ...form, actionDescription: e.target.value })}
        className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-caption font-medium text-text-secondary hover:text-text-primary">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={isPending || !form.name.trim() || !form.triggerCondition.trim()}
          className={SAVE_BUTTON_CLASS}
        >
          Save
        </button>
      </div>
    </div>
  )
}

function StandingRulesCard() {
  const { data: rules, isLoading } = useStandingRules()
  const createMutation = useCreateStandingRule()
  const updateMutation = useUpdateStandingRule()
  const deleteMutation = useDeleteStandingRule()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (isLoading) return <Skeleton className="h-48" />

  function handleCreate(data: StandingRuleFormData) {
    createMutation.mutate(data, {
      onSuccess: () => { setAdding(false); toast.success('Standing rule created') },
    })
  }

  function handleToggle(rule: StandingRule) {
    updateMutation.mutate({ id: rule.id, enabled: !rule.enabled }, {
      onSuccess: () => toast.success(rule.enabled ? 'Rule disabled' : 'Rule enabled'),
    })
  }

  function handleUpdate(id: string, data: StandingRuleFormData) {
    updateMutation.mutate({ id, ...data }, {
      onSuccess: () => { setEditingId(null); toast.success('Rule updated') },
    })
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Rule deleted'),
    })
  }

  return (
    <Card>
      <CardHeader action={
        <button onClick={() => { setAdding(true); setEditingId(null) }} className={SAVE_BUTTON_CLASS}>
          <Plus className="h-3.5 w-3.5" /> Add Rule
        </button>
      }>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-accent-purple" />
          Standing Rules
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-caption text-text-tertiary">
          Automated AI actions triggered by time or events. Rules run in the background and generate outputs for your review.
        </p>

        {adding && (
          <StandingRuleForm
            initial={EMPTY_RULE}
            onSave={handleCreate}
            onCancel={() => setAdding(false)}
            isPending={createMutation.isPending}
          />
        )}

        {(!rules || rules.length === 0) && !adding && (
          <p className="py-4 text-center text-caption text-text-tertiary">No standing rules configured</p>
        )}

        {rules?.map((rule) => (
          editingId === rule.id ? (
            <StandingRuleForm
              key={rule.id}
              initial={{
                name: rule.name,
                triggerType: rule.triggerType,
                triggerCondition: rule.triggerCondition,
                action: rule.action,
                actionDescription: rule.actionDescription,
              }}
              onSave={(data) => handleUpdate(rule.id, data)}
              onCancel={() => setEditingId(null)}
              isPending={updateMutation.isPending}
            />
          ) : (
            <div
              key={rule.id}
              className={cn(
                'rounded-lg border px-4 py-3',
                rule.enabled ? 'border-border-primary bg-surface-primary' : 'border-border-primary bg-surface-tertiary opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-body-strong">{rule.name}</span>
                    <Badge variant={rule.triggerType === 'time_based' ? 'blue' : 'purple'}>
                      {rule.triggerType === 'time_based' ? <><Clock className="mr-0.5 h-2.5 w-2.5" /> Time</> : <><Zap className="mr-0.5 h-2.5 w-2.5" /> Event</>}
                    </Badge>
                    <Badge variant="default">{STANDING_RULE_ACTION_LABELS[rule.action]}</Badge>
                  </div>
                  <p className="mt-0.5 text-caption text-text-secondary">{rule.triggerCondition}</p>
                  <p className="mt-0.5 text-caption text-text-tertiary">{rule.actionDescription}</p>
                  <div className="mt-1.5 flex items-center gap-4 text-[11px] text-text-tertiary">
                    {rule.lastRunAt && <span>Last run: {formatDate(rule.lastRunAt)}</span>}
                    {rule.nextRunAt && <span>Next: {formatDate(rule.nextRunAt)}</span>}
                    <span>{rule.runCount} runs</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={cn(
                      'rounded p-1.5 transition-colors',
                      rule.enabled ? 'text-accent-green hover:bg-green-50' : 'text-text-tertiary hover:bg-surface-tertiary',
                    )}
                    aria-label={rule.enabled ? 'Disable' : 'Enable'}
                    title={rule.enabled ? 'Disable' : 'Enable'}
                  >
                    {rule.enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => { setEditingId(rule.id); setAdding(false) }}
                    className="rounded p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="rounded p-1.5 text-text-tertiary hover:bg-red-50 hover:text-accent-red"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        ))}
      </CardContent>
    </Card>
  )
}

// ─── AI Permission Matrix ──────────────────────

const MODE_COLORS: Record<PermissionMode, string> = {
  auto_approve: 'border-accent-green bg-accent-green/10 text-accent-green',
  queue_for_review: 'border-accent-blue bg-accent-blue/10 text-accent-blue',
  notify_and_hold: 'border-accent-red bg-accent-red/10 text-accent-red',
}

function PermissionMatrixCard() {
  const { data, isLoading } = useAIPermissions()
  const update = useUpdateAIPermissions()
  const [matrix, setMatrix] = useState<AIPermissionMatrix | null>(null)

  useEffect(() => { if (data) setMatrix(data) }, [data])

  const save = useCallback(() => {
    if (matrix) update.mutate(matrix, {
      onSuccess: () => toast.success('Permissions saved'),
    })
  }, [matrix, update])

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

// ─── Delegation Standing Rules ─────────────────

type DelegationFormData = {
  name: string
  condition: string
  delegateTo: string
  delegationType: DelegationRule['delegationType']
}

const EMPTY_DELEGATION: DelegationFormData = {
  name: '',
  condition: '',
  delegateTo: '',
  delegationType: 'ai_agent',
}

function DelegationForm({ initial, onSave, onCancel, isPending }: {
  initial: DelegationFormData
  onSave: (data: DelegationFormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState(initial)

  return (
    <div className="space-y-3 rounded-lg border border-accent-green/30 bg-accent-green/5 p-3">
      <input
        type="text"
        placeholder="Rule name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
      />
      <input
        type="text"
        placeholder="Condition (e.g., 'Account value < $500K AND drift > threshold')"
        value={form.condition}
        onChange={(e) => setForm({ ...form, condition: e.target.value })}
        className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-caption font-medium text-text-secondary">Delegate To</label>
          <input
            type="text"
            placeholder="AI Agent, team member name, etc."
            value={form.delegateTo}
            onChange={(e) => setForm({ ...form, delegateTo: e.target.value })}
            className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
          />
        </div>
        <div>
          <label className="mb-1 block text-caption font-medium text-text-secondary">Delegation Type</label>
          <select
            value={form.delegationType}
            onChange={(e) => setForm({ ...form, delegationType: e.target.value as DelegationRule['delegationType'] })}
            className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
          >
            <option value="ai_agent">AI Agent</option>
            <option value="team_member">Team Member</option>
            <option value="both">Both (AI + Human)</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-caption font-medium text-text-secondary hover:text-text-primary">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={isPending || !form.name.trim() || !form.condition.trim() || !form.delegateTo.trim()}
          className={SAVE_BUTTON_CLASS}
        >
          Save
        </button>
      </div>
    </div>
  )
}

const DELEGATION_TYPE_BADGE: Record<DelegationRule['delegationType'], { label: string; variant: 'purple' | 'blue' | 'green' }> = {
  ai_agent: { label: 'AI Agent', variant: 'purple' },
  team_member: { label: 'Team Member', variant: 'blue' },
  both: { label: 'AI + Human', variant: 'green' },
}

function DelegationRulesCard() {
  const { data: rules, isLoading } = useDelegationRules()
  const createMutation = useCreateDelegationRule()
  const updateMutation = useUpdateDelegationRule()
  const deleteMutation = useDeleteDelegationRule()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (isLoading) return <Skeleton className="h-48" />

  function handleCreate(data: DelegationFormData) {
    createMutation.mutate({ ...data, isActive: true }, {
      onSuccess: () => { setAdding(false); toast.success('Delegation rule created') },
    })
  }

  function handleToggle(rule: DelegationRule) {
    updateMutation.mutate({ id: rule.id, isActive: !rule.isActive }, {
      onSuccess: () => toast.success(rule.isActive ? 'Rule disabled' : 'Rule enabled'),
    })
  }

  function handleUpdate(id: string, data: DelegationFormData) {
    updateMutation.mutate({ id, ...data }, {
      onSuccess: () => { setEditingId(null); toast.success('Rule updated') },
    })
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Rule deleted'),
    })
  }

  return (
    <Card>
      <CardHeader action={
        <button onClick={() => { setAdding(true); setEditingId(null) }} className={SAVE_BUTTON_CLASS}>
          <Plus className="h-3.5 w-3.5" /> Add Rule
        </button>
      }>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accent-green" />
          Delegation Standing Rules
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-caption text-text-tertiary">
          Define standing policies for delegating tasks to AI agents or team members. Matching tasks are automatically routed.
        </p>

        {adding && (
          <DelegationForm
            initial={EMPTY_DELEGATION}
            onSave={handleCreate}
            onCancel={() => setAdding(false)}
            isPending={createMutation.isPending}
          />
        )}

        {(!rules || rules.length === 0) && !adding && (
          <p className="py-4 text-center text-caption text-text-tertiary">No delegation rules configured</p>
        )}

        {rules?.map((rule) => (
          editingId === rule.id ? (
            <DelegationForm
              key={rule.id}
              initial={{
                name: rule.name,
                condition: rule.condition,
                delegateTo: rule.delegateTo,
                delegationType: rule.delegationType,
              }}
              onSave={(data) => handleUpdate(rule.id, data)}
              onCancel={() => setEditingId(null)}
              isPending={updateMutation.isPending}
            />
          ) : (
            <div
              key={rule.id}
              className={cn(
                'flex items-start justify-between gap-3 rounded-lg border px-4 py-3',
                rule.isActive ? 'border-border-primary bg-surface-primary' : 'border-border-primary bg-surface-tertiary opacity-60',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-body-strong">{rule.name}</span>
                  <Badge variant={DELEGATION_TYPE_BADGE[rule.delegationType].variant}>
                    {DELEGATION_TYPE_BADGE[rule.delegationType].label}
                  </Badge>
                </div>
                <p className="mt-0.5 font-mono text-caption text-text-tertiary">{rule.condition}</p>
                <p className="mt-0.5 text-caption text-text-secondary">→ {rule.delegateTo}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleToggle(rule)}
                  className={cn(
                    'rounded p-1.5 transition-colors',
                    rule.isActive ? 'text-accent-green hover:bg-green-50' : 'text-text-tertiary hover:bg-surface-tertiary',
                  )}
                  aria-label={rule.isActive ? 'Disable' : 'Enable'}
                >
                  {rule.isActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => { setEditingId(rule.id); setAdding(false) }}
                  className="rounded p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="rounded p-1.5 text-text-tertiary hover:bg-red-50 hover:text-accent-red"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Exported Components ───────────────────────

export { PermissionMatrixCard }

export function AIAutonomyTab() {
  return (
    <div className="space-y-6">
      <StandingRulesCard />
      <DelegationRulesCard />
    </div>
  )
}
