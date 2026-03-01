import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Eye, EyeOff, Copy, FileText } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate, useDeleteEmailTemplate } from '@/hooks/use-email-templates'
import { TEMPLATE_CATEGORIES, TEMPLATE_VARIABLES } from '@/types/email-template'
import type { EmailTemplate, TemplateCategory, TemplateVariable } from '@/types/email-template'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  email: 'bg-accent-blue/10 text-accent-blue',
  meeting_prep: 'bg-accent-green/10 text-accent-green',
  proposal: 'bg-accent-purple/10 text-accent-purple',
  presentation: 'bg-amber-100 text-amber-700',
  compliance: 'bg-accent-red/10 text-accent-red',
}

const SAVE_BUTTON_CLASS = 'flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50'

function resolveVariables(text: string, variables: TemplateVariable[]): string {
  let result = text
  for (const v of variables) {
    result = result.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.sampleValue)
  }
  return result
}

function VariablePanel({ onInsert }: { onInsert: (variable: string) => void }) {
  return (
    <div className="space-y-2 rounded-lg border border-border-primary bg-surface-secondary p-3">
      <p className="text-caption font-medium text-text-secondary">Insert Variable</p>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v.key}
            onClick={() => onInsert(`{{${v.key}}}`)}
            className="rounded border border-border-secondary bg-surface-primary px-2 py-0.5 font-mono text-[11px] text-text-secondary transition-colors hover:border-accent-purple hover:text-accent-purple"
            title={`${v.label}: ${v.sampleValue}`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}

type TemplateFormData = {
  name: string
  subject: string
  body: string
  category: TemplateCategory
}

const EMPTY_FORM: TemplateFormData = { name: '', subject: '', body: '', category: 'email' }

function TemplateEditorForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial: TemplateFormData
  onSave: (data: TemplateFormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState<TemplateFormData>(initial)
  const [showPreview, setShowPreview] = useState(false)

  const previewSubject = useMemo(() => resolveVariables(form.subject, TEMPLATE_VARIABLES), [form.subject])
  const previewBody = useMemo(() => resolveVariables(form.body, TEMPLATE_VARIABLES), [form.body])

  function insertVariable(variable: string) {
    // Insert at cursor position or append to body
    setForm({ ...form, body: form.body + variable })
  }

  return (
    <div className="space-y-4 rounded-lg border border-accent-purple/30 bg-accent-purple/5 p-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <input
          type="text"
          placeholder="Template name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as TemplateCategory })}
          className="rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
        >
          {TEMPLATE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <input
        type="text"
        placeholder="Subject line (supports {{variables}})"
        value={form.subject}
        onChange={(e) => setForm({ ...form, subject: e.target.value })}
        className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
      />

      <VariablePanel onInsert={insertVariable} />

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1.5 text-caption font-medium text-text-secondary hover:text-text-primary"
        >
          {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {showPreview ? (
        <div className="space-y-2 rounded-md border border-border-primary bg-surface-primary p-4">
          <p className="text-caption font-medium text-text-secondary">Subject: {previewSubject}</p>
          <div className="whitespace-pre-wrap text-body text-text-primary">{previewBody}</div>
        </div>
      ) : (
        <textarea
          placeholder="Template body — use {{variable.name}} for dynamic content"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={12}
          className="w-full resize-y rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-[13px] leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
        />
      )}

      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-caption font-medium text-text-secondary hover:text-text-primary">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={isPending || !form.name.trim() || !form.body.trim()}
          className={SAVE_BUTTON_CLASS}
        >
          Save Template
        </button>
      </div>
    </div>
  )
}

function TemplateRow({
  template,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  template: EmailTemplate
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border-primary bg-surface-primary">
      <div
        className="flex cursor-pointer items-start gap-3 p-3 hover:bg-surface-secondary"
        onClick={() => setExpanded(!expanded)}
      >
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-body-strong text-text-primary">{template.name}</span>
            <Badge className={cn('text-[10px]', CATEGORY_COLORS[template.category])}>
              {template.category.replace('_', ' ')}
            </Badge>
            {template.version > 1 && (
              <span className="font-mono text-[10px] text-text-tertiary">v{template.version}</span>
            )}
          </div>
          <p className="mt-0.5 truncate text-caption text-text-secondary">{template.subject}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate() }}
            className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
            aria-label={`Duplicate ${template.name}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
            aria-label={`Edit ${template.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="rounded p-1 text-text-tertiary hover:bg-red-50 hover:text-accent-red"
            aria-label={`Delete ${template.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border-primary bg-surface-secondary p-4">
          <p className="mb-2 text-caption font-medium text-text-secondary">Preview (with sample data)</p>
          <div className="rounded-md border border-border-primary bg-surface-primary p-3">
            <p className="mb-2 text-caption font-medium text-text-secondary">
              Subject: {resolveVariables(template.subject, TEMPLATE_VARIABLES)}
            </p>
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-primary">
              {resolveVariables(template.body, TEMPLATE_VARIABLES)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function TemplateLibraryEditor() {
  const { data: templates, isLoading } = useEmailTemplates()
  const createMutation = useCreateEmailTemplate()
  const updateMutation = useUpdateEmailTemplate()
  const deleteMutation = useDeleteEmailTemplate()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<TemplateCategory | 'all'>('all')

  const filtered = useMemo(() => {
    if (!templates) return []
    if (filterCategory === 'all') return templates
    return templates.filter((t) => t.category === filterCategory)
  }, [templates, filterCategory])

  if (isLoading) return <Skeleton className="h-64" />

  function handleCreate(data: TemplateFormData) {
    createMutation.mutate(data, {
      onSuccess: () => { setAdding(false); toast.success('Template created') },
      onError: () => toast.error('Failed to create template'),
    })
  }

  function handleUpdate(id: string, data: TemplateFormData) {
    updateMutation.mutate({ id, ...data }, {
      onSuccess: () => { setEditingId(null); toast.success('Template updated') },
      onError: () => toast.error('Failed to update template'),
    })
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Template deleted'),
      onError: () => toast.error('Failed to delete template'),
    })
  }

  function handleDuplicate(template: EmailTemplate) {
    createMutation.mutate(
      { name: `${template.name} (Copy)`, subject: template.subject, body: template.body, category: template.category },
      {
        onSuccess: () => toast.success('Template duplicated'),
        onError: () => toast.error('Failed to duplicate template'),
      },
    )
  }

  const addButton = (
    <button onClick={() => { setAdding(true); setEditingId(null) }} className={SAVE_BUTTON_CLASS}>
      <Plus className="h-3.5 w-3.5" /> New Template
    </button>
  )

  return (
    <Card>
      <CardHeader action={addButton}>Template Library</CardHeader>
      <CardContent className="space-y-3">
        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterCategory('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-caption font-medium transition-colors',
              filterCategory === 'all'
                ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                : 'border-border-secondary text-text-tertiary hover:text-text-secondary',
            )}
          >
            All ({templates?.length ?? 0})
          </button>
          {TEMPLATE_CATEGORIES.map((cat) => {
            const count = templates?.filter((t) => t.category === cat.value).length ?? 0
            return (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-caption font-medium transition-colors',
                  filterCategory === cat.value
                    ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                    : 'border-border-secondary text-text-tertiary hover:text-text-secondary',
                )}
              >
                {cat.label} ({count})
              </button>
            )
          })}
        </div>

        {adding && (
          <TemplateEditorForm
            initial={EMPTY_FORM}
            onSave={handleCreate}
            onCancel={() => setAdding(false)}
            isPending={createMutation.isPending}
          />
        )}

        {filtered.length === 0 && !adding && (
          <p className="py-8 text-center text-caption text-text-tertiary">
            No templates in this category. Create one to get started.
          </p>
        )}

        {filtered.map((t) =>
          editingId === t.id ? (
            <TemplateEditorForm
              key={t.id}
              initial={{ name: t.name, subject: t.subject, body: t.body, category: t.category }}
              onSave={(data) => handleUpdate(t.id, data)}
              onCancel={() => setEditingId(null)}
              isPending={updateMutation.isPending}
            />
          ) : (
            <TemplateRow
              key={t.id}
              template={t}
              onEdit={() => { setEditingId(t.id); setAdding(false) }}
              onDelete={() => handleDelete(t.id)}
              onDuplicate={() => handleDuplicate(t)}
            />
          ),
        )}
      </CardContent>
    </Card>
  )
}
