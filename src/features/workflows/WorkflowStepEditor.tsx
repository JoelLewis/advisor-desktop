import { useState } from 'react'
import { toast } from 'sonner'
import { X, Plus, Trash2, ChevronUp, ChevronDown, Bot, User, Shield, Bell, Cog } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useUpdateTemplate, useCreateTemplate } from '@/hooks/use-workflows'
import { cn } from '@/lib/utils'
import type { WorkflowTemplate, WorkflowStep, WorkflowStepType } from '@/types/workflow'

const STEP_TYPES: { value: WorkflowStepType; label: string; icon: typeof Bot; color: string }[] = [
  { value: 'human_action', label: 'Human Action', icon: User, color: 'text-accent-blue' },
  { value: 'ai_generation', label: 'AI Generation', icon: Bot, color: 'text-accent-purple' },
  { value: 'approval_gate', label: 'Approval Gate', icon: Shield, color: 'text-accent-green' },
  { value: 'notification', label: 'Notification', icon: Bell, color: 'text-amber-500' },
  { value: 'system', label: 'System', icon: Cog, color: 'text-text-secondary' },
]

const ASSIGNEE_SUGGESTIONS = ['Advisor', 'CSA', 'AI Agent', 'Compliance', 'Custodian', 'Client', 'System', 'External']

function inferStepType(assignee: string): WorkflowStepType {
  const lower = assignee.toLowerCase()
  if (lower.includes('ai')) return 'ai_generation'
  if (lower === 'system') return 'system'
  if (lower === 'compliance') return 'approval_gate'
  if (lower === 'client' || lower === 'external') return 'notification'
  return 'human_action'
}

type Props = {
  template: WorkflowTemplate | null
  open: boolean
  onClose: () => void
}

export function WorkflowStepEditor({ template, open, onClose }: Props) {
  const updateMutation = useUpdateTemplate()
  const createMutation = useCreateTemplate()

  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [category, setCategory] = useState(template?.category ?? 'Administrative')
  const [steps, setSteps] = useState<WorkflowStep[]>(
    template?.steps ?? [{ order: 1, name: '', defaultAssignee: 'Advisor', estimatedMinutes: 15, stepType: 'human_action' }],
  )

  if (!open) return null

  function addStep() {
    const newOrder = steps.length + 1
    setSteps([...steps, { order: newOrder, name: '', defaultAssignee: 'Advisor', estimatedMinutes: 15, stepType: 'human_action' }])
  }

  function removeStep(index: number) {
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
    setSteps(updated)
  }

  function updateStep(index: number, patch: Partial<WorkflowStep>) {
    const updated = steps.map((s, i) => {
      if (i !== index) return s
      const merged = { ...s, ...patch }
      // Auto-infer step type when assignee changes
      if (patch.defaultAssignee && !patch.stepType) {
        merged.stepType = inferStepType(patch.defaultAssignee)
      }
      return merged
    })
    setSteps(updated)
  }

  function moveStep(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= steps.length) return
    const updated = steps.map((step, i) => {
      if (i === index) return { ...steps[targetIndex]!, order: i + 1 }
      if (i === targetIndex) return { ...steps[index]!, order: i + 1 }
      return { ...step, order: i + 1 }
    })
    setSteps(updated)
  }

  function handleSave() {
    const data = { name, description, category, steps }
    if (template) {
      updateMutation.mutate({ id: template.id, ...data }, {
        onSuccess: () => { toast.success('Template updated'); onClose() },
        onError: () => toast.error('Failed to update template'),
      })
    } else {
      createMutation.mutate(data, {
        onSuccess: () => { toast.success('Template created'); onClose() },
        onError: () => toast.error('Failed to create template'),
      })
    }
  }

  function handleSaveAsNew() {
    createMutation.mutate({ name: `${name} (Copy)`, description, category, steps }, {
      onSuccess: () => { toast.success('Template saved as new'); onClose() },
      onError: () => toast.error('Failed to save template'),
    })
  }

  const isPending = updateMutation.isPending || createMutation.isPending
  const canSave = name.trim().length > 0 && steps.length > 0 && steps.every((s) => s.name.trim().length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border-primary bg-surface-primary shadow-2xl scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-primary bg-surface-primary px-6 py-4">
          <h2 className="text-section-title">
            {template ? 'Edit Template' : 'New Template'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Template metadata */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body-strong text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
            />
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-none"
              >
                <option value="Onboarding">Onboarding</option>
                <option value="Client Service">Client Service</option>
                <option value="Tax Management">Tax Management</option>
                <option value="Administrative">Administrative</option>
                <option value="Compliance">Compliance</option>
                <option value="Trading">Trading</option>
              </select>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-caption font-medium text-text-secondary">Steps ({steps.length})</p>
              <p className="font-mono text-caption text-text-tertiary">
                Est. {Math.floor(steps.reduce((s, st) => s + st.estimatedMinutes, 0) / 60)}h{' '}
                {steps.reduce((s, st) => s + st.estimatedMinutes, 0) % 60}m total
              </p>
            </div>

            {steps.map((step, i) => {
              const stepType = STEP_TYPES.find((t) => t.value === (step.stepType ?? inferStepType(step.defaultAssignee)))
              const StepIcon = stepType?.icon ?? User
              return (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-border-primary bg-surface-secondary p-3">
                  {/* Order + arrows */}
                  <div className="flex flex-col items-center gap-0.5 pt-1">
                    <button
                      onClick={() => moveStep(i, -1)}
                      disabled={i === 0}
                      className="rounded p-0.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-tertiary font-mono text-[11px] text-text-secondary">
                      {step.order}
                    </span>
                    <button
                      onClick={() => moveStep(i, 1)}
                      disabled={i === steps.length - 1}
                      className="rounded p-0.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Step details */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Step name"
                      value={step.name}
                      onChange={(e) => updateStep(i, { name: e.target.value })}
                      className="w-full rounded-md border border-border-secondary bg-surface-primary px-2 py-1 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Step type badge */}
                      <select
                        value={step.stepType ?? inferStepType(step.defaultAssignee)}
                        onChange={(e) => updateStep(i, { stepType: e.target.value as WorkflowStepType })}
                        className="rounded border border-border-secondary bg-surface-primary px-2 py-0.5 text-caption focus:border-accent-blue focus:outline-none"
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>

                      {/* Assignee */}
                      <select
                        value={step.defaultAssignee}
                        onChange={(e) => updateStep(i, { defaultAssignee: e.target.value })}
                        className="rounded border border-border-secondary bg-surface-primary px-2 py-0.5 text-caption focus:border-accent-blue focus:outline-none"
                      >
                        {ASSIGNEE_SUGGESTIONS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>

                      {/* Est time */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={step.estimatedMinutes}
                          onChange={(e) => updateStep(i, { estimatedMinutes: Math.max(1, Number(e.target.value)) })}
                          className="w-16 rounded border border-border-secondary bg-surface-primary px-2 py-0.5 font-mono text-caption focus:border-accent-blue focus:outline-none"
                        />
                        <span className="text-caption text-text-tertiary">min</span>
                      </div>

                      {/* Type indicator */}
                      <Badge className={cn('flex items-center gap-1 text-[10px]', stepType?.color)}>
                        <StepIcon className="h-3 w-3" />
                        {stepType?.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeStep(i)}
                    disabled={steps.length <= 1}
                    className="mt-1 rounded p-1 text-text-tertiary hover:bg-red-50 hover:text-accent-red disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}

            <button
              onClick={addStep}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-secondary py-2 text-caption font-medium text-text-secondary transition-colors hover:border-accent-blue hover:text-accent-blue"
            >
              <Plus className="h-3.5 w-3.5" /> Add Step
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-border-primary bg-surface-primary px-6 py-4">
          <div>
            {template && (
              <button
                onClick={handleSaveAsNew}
                disabled={isPending || !canSave}
                className="rounded-md border border-border-secondary px-3 py-1.5 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-tertiary disabled:opacity-50"
              >
                Save as New Template
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-md px-3 py-1.5 text-caption font-medium text-text-secondary hover:text-text-primary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !canSave}
              className="flex items-center gap-1.5 rounded-md bg-accent-blue px-4 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50"
            >
              {template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
