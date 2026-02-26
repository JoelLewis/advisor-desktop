import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, Loader2, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useExecuteTemplate } from '@/hooks/use-ai'
import { cn } from '@/lib/utils'
import type { ActionTemplate, ActionTemplateParam } from '@/types/ai'

const INPUT_CLASS = 'w-full rounded-md border border-border-primary bg-surface-primary px-2.5 py-1.5 text-caption text-text-primary focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/20'

function TemplateField({ param, value, onChange }: {
  param: ActionTemplateParam
  value: string
  onChange: (value: string) => void
}) {
  function renderInput(): JSX.Element {
    if (param.type === 'select' && param.options) {
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS}>
          <option value="">Select...</option>
          {param.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    if (param.type === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(INPUT_CLASS, 'font-mono')}
          placeholder={param.defaultValue ?? ''}
        />
      )
    }

    const inputType = param.type === 'date' ? 'date' : 'text'
    const placeholder = param.type === 'entity' ? `Search ${param.entityType ?? 'entity'}...` : ''

    return (
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
        placeholder={placeholder}
      />
    )
  }

  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-text-secondary">
        {param.label}
        {param.required && <span className="text-accent-red"> *</span>}
      </label>
      {renderInput()}
    </div>
  )
}

type ActionTemplateCardProps = {
  template: ActionTemplate
}

export function ActionTemplateCard({ template }: ActionTemplateCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    for (const p of template.params) {
      if (p.defaultValue) defaults[p.key] = p.defaultValue
    }
    return defaults
  })
  const [success, setSuccess] = useState(false)
  const [resultRoute, setResultRoute] = useState<string | undefined>()
  const execute = useExecuteTemplate()
  const navigate = useNavigate()

  function updateField(key: string, value: string) {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleExecute() {
    execute.mutate(
      { templateId: template.id, params: formValues },
      {
        onSuccess: (result) => {
          setSuccess(true)
          setResultRoute(result.executionRoute)
        },
      },
    )
  }

  const requiredFilled = template.params
    .filter((p) => p.required)
    .every((p) => formValues[p.key]?.trim())

  if (success) {
    return (
      <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-accent-green" />
          <span className="text-caption font-medium text-accent-green">{template.name} — Complete</span>
        </div>
        {resultRoute && (
          <button
            onClick={() => navigate(resultRoute)}
            className="mt-2 text-caption font-medium text-accent-blue hover:underline"
          >
            View Result
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-accent-purple/20 bg-accent-purple/5 transition-all">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-accent-purple">{template.name}</p>
          <p className="text-[11px] text-text-secondary">{template.description}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-[10px] text-text-tertiary">
          <Clock className="h-3 w-3" />
          {template.estimatedTime}
        </span>
        {expanded
          ? <ChevronUp className="h-4 w-4 shrink-0 text-text-tertiary" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" />}
      </button>

      {/* Expanded form */}
      {expanded && (
        <div className="border-t border-accent-purple/10 px-3 pb-3 pt-2">
          <div className="space-y-2.5">
            {template.params.map((param) => (
              <TemplateField
                key={param.key}
                param={param}
                value={formValues[param.key] ?? ''}
                onChange={(value) => updateField(param.key, value)}
              />
            ))}
          </div>

          <button
            onClick={handleExecute}
            disabled={!requiredFilled || execute.isPending}
            className={cn(
              'mt-3 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-caption font-medium transition-colors',
              'bg-accent-purple text-white hover:bg-accent-purple/90',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {execute.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Executing...
              </>
            ) : (
              'Execute'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
