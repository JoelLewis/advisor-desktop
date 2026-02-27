import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Save, Plus, Pencil, Trash2, Zap } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { TabLayout } from '@/components/ui/TabLayout'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAISettings, useUpdateAISettings, useNBASettings, useUpdateNBASettings, useNotificationSettings, useUpdateNotificationSettings, useDisplaySettings, useUpdateDisplaySettings, useCustomPrompts, useCreateCustomPrompt, useUpdateCustomPrompt, useDeleteCustomPrompt } from '@/hooks/use-settings'
import { useNBAs } from '@/hooks/use-nbas'
import { AIAutonomyTab, PermissionMatrixCard } from './AIAutonomyTab'
import { TemplateLibraryEditor } from './TemplateLibraryEditor'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import { PRIORITY_VARIANTS } from '@/lib/labels'
import { CURRENCY_REGISTRY } from '@/lib/currency'
import type { AISettings, AITone, AIVerbosity, NBASettings, NotificationSettings, DisplaySettings, CommunicationChannel, FollowUpCadence, CustomPromptCategory, CustomAlertRule } from '@/types/settings'
import type { NBACategory } from '@/types/nba'
import type { CurrencyCode } from '@/types/currency'

const NBA_CATEGORIES: { value: NBACategory; label: string }[] = [
  { value: 'rebalancing', label: 'Rebalancing' },
  { value: 'tax_management', label: 'Tax Management' },
  { value: 'planning', label: 'Planning' },
  { value: 'risk', label: 'Risk' },
  { value: 'client_service', label: 'Client Service' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'growth', label: 'Growth' },
]

const SAVE_BUTTON_CLASS = 'flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50'

function SaveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={SAVE_BUTTON_CLASS}>
      <Save className="h-3.5 w-3.5" /> Save
    </button>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span className="text-body text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-accent-blue' : 'bg-border-secondary',
        )}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5',
        )} />
      </button>
    </label>
  )
}

function SelectField({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-body text-text-primary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function SliderField({ value, onChange, label, min = 0, max = 100 }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-body text-text-primary">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-border-secondary accent-accent-blue"
        />
        <span className="w-8 font-mono text-caption text-text-secondary text-right">{value}</span>
      </div>
    </div>
  )
}

const COMMUNICATION_CHANNELS: { value: CommunicationChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'video', label: 'Video' },
  { value: 'in_person', label: 'In-Person' },
]

const FOLLOW_UP_CADENCES: { value: FollowUpCadence; label: string }[] = [
  { value: '1_day', label: '1 Day' },
  { value: '3_days', label: '3 Days' },
  { value: '1_week', label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
]

const PROPOSAL_TEMPLATES = [
  { value: 'comprehensive-wealth', label: 'Comprehensive Wealth Management' },
  { value: 'retirement-transition', label: 'Retirement Transition' },
  { value: 'growth-portfolio', label: 'Growth Portfolio' },
]

const PROPOSAL_SECTIONS = [
  { value: 'cover', label: 'Cover Page' },
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'current_situation', label: 'Current Situation' },
  { value: 'recommended_portfolio', label: 'Recommended Portfolio' },
  { value: 'fee_schedule', label: 'Fee Schedule' },
  { value: 'disclosures', label: 'Disclosures' },
]

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
        className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
      />
      <textarea
        placeholder="Prompt text — this will appear as a suggestion in the AI panel"
        value={form.text}
        onChange={(e) => setForm({ ...form, text: e.target.value })}
        rows={2}
        className="w-full resize-none rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as CustomPromptCategory })}
          className="rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-none"
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

function AISettingsPanel() {
  const { data, isLoading } = useAISettings()
  const update = useUpdateAISettings()
  const [settings, setSettings] = useState<AISettings | null>(null)

  useEffect(() => { if (data) setSettings(data) }, [data])

  if (isLoading || !settings) return <Skeleton className="h-64" />

  function save() {
    if (settings) update.mutate(settings, {
      onSuccess: () => toast.success('AI settings saved'),
      onError: () => toast.error('Failed to save AI settings'),
    })
  }

  function updatePersona(patch: Partial<AISettings['persona']>) {
    if (!settings) return
    setSettings({ ...settings, persona: { ...settings.persona, ...patch } })
  }

  function toggleChannel(ch: CommunicationChannel) {
    if (!settings) return
    const channels = settings.persona.preferredChannels.includes(ch)
      ? settings.persona.preferredChannels.filter((c) => c !== ch)
      : [...settings.persona.preferredChannels, ch]
    updatePersona({ preferredChannels: channels })
  }

  function updateDocDefaults(patch: Partial<AISettings['documentDefaults']>) {
    if (!settings) return
    setSettings({ ...settings, documentDefaults: { ...settings.documentDefaults, ...patch } })
  }

  function toggleSection(section: string) {
    if (!settings) return
    const sections = settings.documentDefaults.defaultSections.includes(section)
      ? settings.documentDefaults.defaultSections.filter((s) => s !== section)
      : [...settings.documentDefaults.defaultSections, section]
    updateDocDefaults({ defaultSections: sections })
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Communication Style */}
      <Card>
        <CardHeader action={<SaveButton onClick={save} disabled={update.isPending} />}>
          Communication Style
        </CardHeader>
        <CardContent className="divide-y divide-border-primary">
          <SelectField
            label="Communication Tone"
            value={settings.tone}
            onChange={(v) => setSettings({ ...settings, tone: v as AITone })}
            options={[
              { value: 'formal', label: 'Formal' },
              { value: 'conversational', label: 'Conversational' },
              { value: 'concise', label: 'Concise' },
            ]}
          />
          <SelectField
            label="Response Detail"
            value={settings.verbosity}
            onChange={(v) => setSettings({ ...settings, verbosity: v as AIVerbosity })}
            options={[
              { value: 'brief', label: 'Brief' },
              { value: 'standard', label: 'Standard' },
              { value: 'detailed', label: 'Detailed' },
            ]}
          />
          <Toggle label="Auto-suggest actions" checked={settings.autoSuggest} onChange={(v) => setSettings({ ...settings, autoSuggest: v })} />
        </CardContent>
      </Card>

      {/* Card 2: AI Persona & Defaults */}
      <Card>
        <CardHeader action={<SaveButton onClick={save} disabled={update.isPending} />}>
          AI Persona &amp; Defaults
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary">Default Greeting</label>
            <input
              type="text"
              value={settings.persona.defaultGreeting}
              onChange={(e) => updatePersona({ defaultGreeting: e.target.value })}
              className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary">Email Signature</label>
            <textarea
              value={settings.persona.emailSignature}
              onChange={(e) => updatePersona({ emailSignature: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 font-mono text-body text-text-primary focus:border-accent-blue focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary">Preferred Channels</label>
            <div className="flex flex-wrap gap-2">
              {COMMUNICATION_CHANNELS.map((ch) => {
                const active = settings.persona.preferredChannels.includes(ch.value)
                return (
                  <button
                    key={ch.value}
                    onClick={() => toggleChannel(ch.value)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-caption font-medium transition-colors',
                      active
                        ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                        : 'border-border-secondary bg-surface-primary text-text-tertiary hover:text-text-secondary',
                    )}
                  >
                    {ch.label}
                  </button>
                )
              })}
            </div>
          </div>
          <SelectField
            label="Follow-up Cadence"
            value={settings.persona.followUpCadence}
            onChange={(v) => updatePersona({ followUpCadence: v as FollowUpCadence })}
            options={FOLLOW_UP_CADENCES}
          />
        </CardContent>
      </Card>

      {/* Card 3: Document Templates */}
      <Card>
        <CardHeader action={<SaveButton onClick={save} disabled={update.isPending} />}>
          Document Templates
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectField
            label="Preferred Proposal Template"
            value={settings.documentDefaults.preferredTemplate}
            onChange={(v) => updateDocDefaults({ preferredTemplate: v })}
            options={PROPOSAL_TEMPLATES}
          />
          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary">Default Sections</label>
            <div className="flex flex-wrap gap-2">
              {PROPOSAL_SECTIONS.map((sec) => {
                const active = settings.documentDefaults.defaultSections.includes(sec.value)
                return (
                  <button
                    key={sec.value}
                    onClick={() => toggleSection(sec.value)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-caption font-medium transition-colors',
                      active
                        ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                        : 'border-border-secondary bg-surface-primary text-text-tertiary hover:text-text-secondary',
                    )}
                  >
                    {sec.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary">Custom Disclaimer</label>
            <textarea
              value={settings.documentDefaults.customDisclaimer}
              onChange={(e) => updateDocDefaults({ customDisclaimer: e.target.value })}
              rows={2}
              placeholder="Enter custom disclaimer text to include in generated proposals..."
              className="w-full resize-none rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-body text-text-primary">Default Fee Rate</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={settings.documentDefaults.defaultFeeRate}
                onChange={(e) => updateDocDefaults({ defaultFeeRate: e.target.value })}
                className="w-16 rounded-md border border-border-secondary bg-surface-primary px-2 py-1.5 text-right font-mono text-body text-text-primary focus:border-accent-blue focus:outline-none"
              />
              <span className="text-body text-text-secondary">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: AI Permission Matrix — granular per-action controls */}
      <PermissionMatrixCard />
    </div>
  )
}

const ALERT_METRICS = [
  { value: 'drift', label: 'Portfolio drift' },
  { value: 'account_value', label: 'Account value' },
  { value: 'concentration', label: 'Single-security concentration' },
  { value: 'cash_balance', label: 'Cash balance' },
  { value: 'ytd_return', label: 'YTD return' },
  { value: 'days_since_contact', label: 'Days since last contact' },
  { value: 'days_to_rmd', label: 'Days until RMD deadline' },
  { value: 'unrealized_loss', label: 'Unrealized loss' },
]

const ALERT_OPERATORS = [
  { value: '>', label: 'exceeds' },
  { value: '<', label: 'falls below' },
  { value: '>=', label: 'is at least' },
  { value: '<=', label: 'is at most' },
  { value: '=', label: 'equals' },
]

const ALERT_SCOPES = [
  { value: 'any_client', label: 'any client' },
  { value: 'platinum_clients', label: 'platinum tier clients' },
  { value: 'gold_clients', label: 'gold tier clients' },
  { value: 'accounts_over_1m', label: 'accounts over $1M' },
  { value: 'accounts_over_5m', label: 'accounts over $5M' },
]

const ALERT_PRIORITIES: { value: CustomAlertRule['priority']; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

function CustomAlertRulesCard({
  rules,
  onChange,
  onSave,
  isSaving,
}: {
  rules: CustomAlertRule[]
  onChange: (rules: CustomAlertRule[]) => void
  onSave: () => void
  isSaving: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [metric, setMetric] = useState(ALERT_METRICS[0]!.value)
  const [operator, setOperator] = useState(ALERT_OPERATORS[0]!.value)
  const [threshold, setThreshold] = useState('')
  const [scope, setScope] = useState(ALERT_SCOPES[0]!.value)
  const [priority, setPriority] = useState<CustomAlertRule['priority']>('high')

  function buildCondition(): string {
    const metricLabel = ALERT_METRICS.find((m) => m.value === metric)?.label ?? metric
    const opLabel = ALERT_OPERATORS.find((o) => o.value === operator)?.label ?? operator
    const scopeLabel = ALERT_SCOPES.find((s) => s.value === scope)?.label ?? scope
    return `${metricLabel} ${opLabel} ${threshold} for ${scopeLabel}`
  }

  function buildName(): string {
    const metricLabel = ALERT_METRICS.find((m) => m.value === metric)?.label ?? metric
    return `${metricLabel} alert`
  }

  function handleAdd() {
    if (!threshold.trim()) return
    const newRule: CustomAlertRule = {
      name: buildName(),
      condition: buildCondition(),
      priority,
    }
    onChange([...rules, newRule])
    setAdding(false)
    setThreshold('')
  }

  function handleRemove(index: number) {
    onChange(rules.filter((_, i) => i !== index))
  }

  return (
    <Card>
      <CardHeader
        action={
          <div className="flex items-center gap-2">
            {rules.length > 0 && <SaveButton onClick={onSave} disabled={isSaving} />}
            <button
              onClick={() => setAdding(true)}
              className={SAVE_BUTTON_CLASS}
            >
              <Plus className="h-3.5 w-3.5" /> Add Rule
            </button>
          </div>
        }
      >
        Custom Alert Rules
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="space-y-3 rounded-lg border border-accent-blue/30 bg-accent-blue/5 p-3">
            <p className="text-caption font-medium text-text-secondary">Build alert rule</p>
            <div className="flex flex-wrap items-center gap-2 text-body text-text-primary">
              <span className="text-caption text-text-secondary">When</span>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 text-caption focus:border-accent-blue focus:outline-none"
              >
                {ALERT_METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 text-caption focus:border-accent-blue focus:outline-none"
              >
                {ALERT_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                type="text"
                placeholder="value"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-24 rounded-md border border-border-secondary bg-surface-primary px-2 py-1 font-mono text-caption focus:border-accent-blue focus:outline-none"
              />
              <span className="text-caption text-text-secondary">for</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 text-caption focus:border-accent-blue focus:outline-none"
              >
                {ALERT_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <span className="text-caption text-text-secondary">generate</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CustomAlertRule['priority'])}
                className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 text-caption focus:border-accent-blue focus:outline-none"
              >
                {ALERT_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <span className="text-caption text-text-secondary">NBA</span>
            </div>
            {threshold.trim() && (
              <p className="rounded bg-surface-tertiary px-2 py-1 font-mono text-caption text-text-secondary">
                Preview: {buildCondition()} → {priority} priority NBA
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setAdding(false)} className="rounded-md px-3 py-1 text-caption font-medium text-text-secondary hover:text-text-primary">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!threshold.trim()}
                className={SAVE_BUTTON_CLASS}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {rules.length === 0 && !adding && (
          <p className="py-4 text-center text-caption text-text-tertiary">
            No custom alert rules. Add rules to generate NBAs based on specific conditions.
          </p>
        )}

        {rules.map((rule, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border border-border-primary px-3 py-2">
            <div>
              <p className="text-body-strong">{rule.name}</p>
              <p className="font-mono text-caption text-text-tertiary">{rule.condition}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={PRIORITY_VARIANTS[rule.priority]}>{rule.priority}</Badge>
              <button
                onClick={() => handleRemove(i)}
                className="rounded p-1 text-text-tertiary hover:bg-red-50 hover:text-accent-red"
                aria-label={`Delete ${rule.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const WEIGHT_PRESETS: Record<string, { label: string; description: string; weights: NBASettings['weights'] }> = {
  balanced: {
    label: 'Balanced',
    description: 'Equal emphasis across all dimensions',
    weights: { urgency: 20, impact: 20, efficiency: 20, relationship: 20, confidence: 20 },
  },
  revenue: {
    label: 'Revenue',
    description: 'Prioritize high-impact, high-confidence actions',
    weights: { urgency: 10, impact: 35, efficiency: 15, relationship: 10, confidence: 30 },
  },
  compliance: {
    label: 'Compliance',
    description: 'Prioritize urgent compliance items',
    weights: { urgency: 35, impact: 15, efficiency: 10, relationship: 10, confidence: 30 },
  },
  relationship: {
    label: 'Relationship',
    description: 'Prioritize client relationship actions',
    weights: { urgency: 10, impact: 15, efficiency: 15, relationship: 40, confidence: 20 },
  },
}

function computeComposite(scoring: { urgency: number; impact: number; efficiency: number; relationship: number; confidence: number }, weights: NBASettings['weights']): number {
  const totalWeight = weights.urgency + weights.impact + weights.efficiency + weights.relationship + weights.confidence
  if (totalWeight === 0) return 0
  return (
    scoring.urgency * weights.urgency +
    scoring.impact * weights.impact +
    scoring.efficiency * weights.efficiency +
    scoring.relationship * weights.relationship +
    scoring.confidence * weights.confidence
  ) / totalWeight
}

function NBASettingsPanel() {
  const { data, isLoading } = useNBASettings()
  const update = useUpdateNBASettings()
  const [settings, setSettings] = useState<NBASettings | null>(null)
  const { data: nbas } = useNBAs({ dismissed: 'false' })

  useEffect(() => { if (data) setSettings(data) }, [data])

  // Live re-rank preview: recompute composite scores with current weights
  const rankedPreview = useMemo(() => {
    if (!nbas || !settings) return []
    return [...nbas]
      .map((nba) => ({
        id: nba.id,
        title: nba.title,
        category: nba.category,
        originalComposite: nba.scoring.composite,
        newComposite: Math.round(computeComposite(nba.scoring, settings.weights)),
      }))
      .sort((a, b) => b.newComposite - a.newComposite)
      .slice(0, 10)
  }, [nbas, settings])

  if (isLoading || !settings) return <Skeleton className="h-64" />

  function save() {
    if (settings) update.mutate(settings, {
      onSuccess: () => toast.success('NBA settings saved'),
      onError: () => toast.error('Failed to save NBA settings'),
    })
  }

  function updateWeight(key: string, value: number) {
    if (!settings) return
    setSettings({ ...settings, weights: { ...settings.weights, [key]: value } })
  }

  function applyPreset(presetKey: string) {
    if (!settings) return
    const preset = WEIGHT_PRESETS[presetKey]
    if (preset) {
      setSettings({ ...settings, weights: { ...preset.weights } })
    }
  }

  function toggleCategory(cat: NBACategory) {
    if (!settings) return
    const cats = settings.enabledCategories.includes(cat)
      ? settings.enabledCategories.filter((c) => c !== cat)
      : [...settings.enabledCategories, cat]
    setSettings({ ...settings, enabledCategories: cats })
  }

  const weightsTotal = Object.values(settings.weights).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader action={<SaveButton onClick={save} disabled={update.isPending} />}>
          Scoring Weights
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset buttons */}
          <div className="space-y-2">
            <span className="text-caption font-medium text-text-secondary">Presets</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(WEIGHT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="rounded-md border border-border-primary bg-surface-secondary px-3 py-1.5 text-caption font-medium text-text-secondary transition-colors hover:border-accent-blue hover:text-accent-blue"
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="divide-y divide-border-primary">
            <SliderField label="Urgency" value={settings.weights.urgency} onChange={(v) => updateWeight('urgency', v)} />
            <SliderField label="Impact" value={settings.weights.impact} onChange={(v) => updateWeight('impact', v)} />
            <SliderField label="Efficiency" value={settings.weights.efficiency} onChange={(v) => updateWeight('efficiency', v)} />
            <SliderField label="Relationship" value={settings.weights.relationship} onChange={(v) => updateWeight('relationship', v)} />
            <SliderField label="Confidence" value={settings.weights.confidence} onChange={(v) => updateWeight('confidence', v)} />
            <div className="flex items-center justify-between py-2">
              <span className="text-caption text-text-secondary">Total</span>
              <span className={cn(
                'font-mono text-caption font-medium',
                weightsTotal === 100 ? 'text-accent-green' : 'text-accent-red',
              )}>
                {weightsTotal} / 100
              </span>
            </div>
          </div>

          {/* Live ranking preview */}
          {rankedPreview.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border-primary bg-surface-secondary p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-caption font-medium text-text-secondary">Live Ranking Preview (Top 10)</span>
              </div>
              <div className="space-y-1">
                {rankedPreview.map((item, i) => {
                  const delta = item.newComposite - item.originalComposite
                  return (
                    <div key={item.id} className="flex items-center gap-2 text-caption">
                      <span className="w-5 text-right font-mono text-text-tertiary">{i + 1}.</span>
                      <span className="min-w-0 flex-1 truncate text-text-primary">{item.title}</span>
                      <span className="font-mono text-text-secondary">{item.newComposite}</span>
                      {delta !== 0 && (
                        <span className={cn(
                          'font-mono text-[11px]',
                          delta > 0 ? 'text-accent-green' : 'text-accent-red',
                        )}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Enabled Categories</CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {NBA_CATEGORIES.map((cat) => {
              const enabled = settings.enabledCategories.includes(cat.value)
              return (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-caption font-medium transition-colors',
                    enabled
                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                      : 'border-border-secondary bg-surface-primary text-text-tertiary hover:text-text-secondary',
                  )}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Batch Grouping</CardHeader>
        <CardContent>
          <SliderField
            label="Minimum clients for batch"
            value={settings.groupingThreshold}
            onChange={(v) => setSettings({ ...settings, groupingThreshold: v })}
            min={2}
            max={10}
          />
          <p className="mt-1 text-caption text-text-tertiary">
            When {settings.groupingThreshold}+ clients share the same action, group them as a batch opportunity.
          </p>
        </CardContent>
      </Card>

      <CustomAlertRulesCard
        rules={settings.customAlertRules}
        onChange={(rules) => setSettings({ ...settings, customAlertRules: rules })}
        onSave={save}
        isSaving={update.isPending}
      />
    </div>
  )
}

function NotificationSettingsPanel() {
  const { data, isLoading } = useNotificationSettings()
  const update = useUpdateNotificationSettings()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)

  useEffect(() => { if (data) setSettings(data) }, [data])

  if (isLoading || !settings) return <Skeleton className="h-64" />

  function save() {
    if (settings) update.mutate(settings, {
      onSuccess: () => toast.success('Notification settings saved'),
      onError: () => toast.error('Failed to save notification settings'),
    })
  }

  function updateChannel(key: string, value: boolean) {
    if (!settings) return
    setSettings({ ...settings, channels: { ...settings.channels, [key]: value } })
  }

  function updateQuietHours(patch: Partial<NotificationSettings['quietHours']>) {
    if (!settings) return
    setSettings({ ...settings, quietHours: { ...settings.quietHours, ...patch } })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader action={<SaveButton onClick={save} disabled={update.isPending} />}>
          Notification Channels
        </CardHeader>
        <CardContent className="divide-y divide-border-primary">
          <Toggle label="Email notifications" checked={settings.channels.email} onChange={(v) => updateChannel('email', v)} />
          <Toggle label="In-app notifications" checked={settings.channels.inApp} onChange={(v) => updateChannel('inApp', v)} />
          <Toggle label="Desktop notifications" checked={settings.channels.desktop} onChange={(v) => updateChannel('desktop', v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Quiet Hours</CardHeader>
        <CardContent className="space-y-3">
          <Toggle label="Enable quiet hours" checked={settings.quietHours.enabled} onChange={(v) => updateQuietHours({ enabled: v })} />
          {settings.quietHours.enabled && (
            <div className="flex items-center gap-4 pl-1">
              <div className="flex items-center gap-2">
                <span className="text-caption text-text-secondary">From</span>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => updateQuietHours({ start: e.target.value })}
                  className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 font-mono text-caption"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-caption text-text-secondary">To</span>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => updateQuietHours({ end: e.target.value })}
                  className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 font-mono text-caption"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const REPORTING_CURRENCIES: { value: CurrencyCode; label: string }[] = (
  Object.values(CURRENCY_REGISTRY) as { code: CurrencyCode; name: string; flag: string; isFiat: boolean }[]
)
  .filter((c) => c.isFiat)
  .map((c) => ({ value: c.code, label: `${c.flag} ${c.code} — ${c.name}` }))

const DATE_FORMATS: { value: DisplaySettings['dateFormat']; label: string }[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (International)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
]

function ThemeCard() {
  const themeMode = useUIStore((s) => s.themeMode)
  const setThemeMode = useUIStore((s) => s.setThemeMode)

  const options: { value: 'light' | 'dark' | 'system'; label: string; description: string }[] = [
    { value: 'light', label: 'Light', description: 'Always use light theme' },
    { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
    { value: 'system', label: 'System', description: 'Follow OS preference' },
  ]

  return (
    <Card>
      <CardHeader>Appearance</CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setThemeMode(opt.value)}
              className={cn(
                'flex-1 rounded-lg border-2 px-4 py-3 text-left transition-colors',
                themeMode === opt.value
                  ? 'border-accent-blue bg-accent-blue/5'
                  : 'border-border-primary hover:border-border-secondary',
              )}
            >
              <p className="text-body-strong text-text-primary">{opt.label}</p>
              <p className="mt-0.5 text-caption text-text-secondary">{opt.description}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function DisplaySettingsPanel() {
  const { data, isLoading } = useDisplaySettings()
  const update = useUpdateDisplaySettings()
  const [settings, setSettings] = useState<DisplaySettings | null>(null)

  useEffect(() => { if (data) setSettings(data) }, [data])

  if (isLoading || !settings) return <Skeleton className="h-64" />

  function save() {
    if (settings) update.mutate(settings, {
      onSuccess: () => toast.success('Display settings saved'),
      onError: () => toast.error('Failed to save display settings'),
    })
  }

  return (
    <div className="space-y-6">
      <ThemeCard />
      <Card>
        <CardHeader action={<SaveButton onClick={save} disabled={update.isPending} />}>
          Currency & Formatting
        </CardHeader>
        <CardContent className="divide-y divide-border-primary">
          <SelectField
            label="Reporting Currency"
            value={settings.reportingCurrency}
            onChange={(v) => setSettings({ ...settings, reportingCurrency: v as CurrencyCode })}
            options={REPORTING_CURRENCIES}
          />
          <Toggle
            label="Show original currency alongside converted values"
            checked={settings.showOriginalCurrency}
            onChange={(v) => setSettings({ ...settings, showOriginalCurrency: v })}
          />
          <Toggle
            label="Use compact number format (e.g. $1.2M instead of $1,200,000)"
            checked={settings.compactNumbers}
            onChange={(v) => setSettings({ ...settings, compactNumbers: v })}
          />
          <SelectField
            label="Date Format"
            value={settings.dateFormat}
            onChange={(v) => setSettings({ ...settings, dateFormat: v as DisplaySettings['dateFormat'] })}
            options={DATE_FORMATS}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function TemplatesPromptsPanel() {
  return (
    <div className="space-y-6">
      <TemplateLibraryEditor />
      <CustomPromptsCard />
    </div>
  )
}

export function SettingsPage() {
  const tabs = [
    { id: 'ai', label: 'AI Behavior', content: <AISettingsPanel /> },
    { id: 'autonomy', label: 'Automation', content: <AIAutonomyTab /> },
    { id: 'templates', label: 'Templates & Prompts', content: <TemplatesPromptsPanel /> },
    { id: 'nba', label: 'NBA Settings', content: <NBASettingsPanel /> },
    { id: 'notifications', label: 'Notifications', content: <NotificationSettingsPanel /> },
    { id: 'display', label: 'Display', content: <DisplaySettingsPanel /> },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-page-title">Settings</h1>
      <TabLayout tabs={tabs} />
    </div>
  )
}
