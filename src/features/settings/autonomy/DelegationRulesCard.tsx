import { useState } from 'react'
import { toast } from 'sonner'
import { Users, Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import {
  useDelegationRules, useCreateDelegationRule, useUpdateDelegationRule, useDeleteDelegationRule,
} from '@/hooks/use-settings'
import type { DelegationRule } from '@/types/settings'
import { SAVE_BUTTON_CLASS } from './shared'

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

export function DelegationRulesCard() {
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
                <p className="mt-0.5 text-caption text-text-secondary">{'\u2192'} {rule.delegateTo}</p>
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
