import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCustomPrompts, useCreateCustomPrompt, useUpdateCustomPrompt, useDeleteCustomPrompt } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'
import { SAVE_BUTTON_CLASS } from './settings-shared'
import { TemplateLibraryEditor } from './TemplateLibraryEditor'
import type { CustomPromptCategory } from '@/types/settings'

const PROMPT_CATEGORIES: { value: CustomPromptCategory; label: string }[] = [
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'communication', label: 'Communication' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'planning', label: 'Planning' },
  { value: 'trading', label: 'Trading' },
]

const CATEGORY_COLORS: Record<CustomPromptCategory, string> = {
  portfolio: 'bg-accent-blue/10 text-accent-blue',
  communication: 'bg-accent-green/10 text-accent-green',
  compliance: 'bg-accent-red/10 text-accent-red',
  planning: 'bg-accent-purple/10 text-accent-purple',
  trading: 'bg-amber-100 text-amber-700',
}

type PromptFormData = {
  name: string
  text: string
  category: CustomPromptCategory
}

const EMPTY_PROMPT_FORM: PromptFormData = { name: '', text: '', category: 'portfolio' }

function PromptForm({ initial, onSave, onCancel, isPending }: {
  initial: PromptFormData
  onSave: (data: PromptFormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState<PromptFormData>(initial)

  return (
    <div className="space-y-3 rounded-lg border border-accent-purple/30 bg-accent-purple/5 p-3">
      <input
        type="text"
        placeholder="Prompt name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
      />
      <textarea
        placeholder="Prompt text — this will appear as a suggestion in the AI panel"
        value={form.text}
        onChange={(e) => setForm({ ...form, text: e.target.value })}
        rows={2}
        className="w-full resize-none rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
      />
      <div className="flex items-center justify-between">
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as CustomPromptCategory })}
          className="rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
        >
          {PROMPT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-caption font-medium text-text-secondary hover:text-text-primary">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={isPending || !form.name.trim() || !form.text.trim()}
            className={SAVE_BUTTON_CLASS}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomPromptsCard() {
  const { data: prompts, isLoading } = useCustomPrompts()
  const createMutation = useCreateCustomPrompt()
  const updateMutation = useUpdateCustomPrompt()
  const deleteMutation = useDeleteCustomPrompt()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (isLoading) return <Skeleton className="h-48" />

  function handleCreate(data: PromptFormData) {
    createMutation.mutate(data, {
      onSuccess: () => { setAdding(false); toast.success('Custom prompt created') },
      onError: () => toast.error('Failed to create prompt'),
    })
  }

  function handleUpdate(id: string, data: PromptFormData) {
    updateMutation.mutate({ id, ...data }, {
      onSuccess: () => { setEditingId(null); toast.success('Custom prompt updated') },
      onError: () => toast.error('Failed to update prompt'),
    })
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Custom prompt deleted'),
      onError: () => toast.error('Failed to delete prompt'),
    })
  }

  const addButton = (
    <button onClick={() => { setAdding(true); setEditingId(null) }} className={SAVE_BUTTON_CLASS}>
      <Plus className="h-3.5 w-3.5" /> Add Prompt
    </button>
  )

  return (
    <Card>
      <CardHeader action={addButton}>Custom Prompts</CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <PromptForm
            initial={EMPTY_PROMPT_FORM}
            onSave={handleCreate}
            onCancel={() => setAdding(false)}
            isPending={createMutation.isPending}
          />
        )}

        {(!prompts || prompts.length === 0) && !adding && (
          <p className="py-4 text-center text-caption text-text-tertiary">
            No custom prompts yet. Add prompts that will appear alongside AI suggestions.
          </p>
        )}

        {prompts?.map((p) => (
          editingId === p.id ? (
            <PromptForm
              key={p.id}
              initial={{ name: p.name, text: p.text, category: p.category }}
              onSave={(data) => handleUpdate(p.id, data)}
              onCancel={() => setEditingId(null)}
              isPending={updateMutation.isPending}
            />
          ) : (
            <div key={p.id} className="flex items-start gap-3 rounded-lg border-l-2 border-accent-purple bg-surface-primary p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-body-strong text-text-primary">{p.name}</span>
                  <Badge className={cn('text-[10px]', CATEGORY_COLORS[p.category])}>{p.category}</Badge>
                </div>
                <p className="mt-0.5 truncate text-caption text-text-secondary">{p.text}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => { setEditingId(p.id); setAdding(false) }}
                  className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded p-1 text-text-tertiary hover:bg-red-50 hover:text-accent-red"
                  aria-label={`Delete ${p.name}`}
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

export function TemplatesPromptsPanel() {
  return (
    <div className="space-y-6">
      <TemplateLibraryEditor />
      <CustomPromptsCard />
    </div>
  )
}
