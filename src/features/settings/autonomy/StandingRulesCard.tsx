import { useState } from 'react'
import { toast } from 'sonner'
import { Bot, Clock, Zap, Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatDate } from '@/lib/utils'
import {
  useStandingRules, useCreateStandingRule, useUpdateStandingRule, useDeleteStandingRule,
} from '@/hooks/use-settings'
import {
  STANDING_RULE_ACTIONS, STANDING_RULE_ACTION_LABELS,
} from '@/types/standing-rule'
import type {
  StandingRule, TriggerType, StandingRuleAction,
} from '@/types/standing-rule'
import { SAVE_BUTTON_CLASS } from './shared'

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

export function StandingRulesCard() {
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
