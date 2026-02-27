import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Save, Plus, Pencil, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { TabLayout } from '@/components/ui/TabLayout'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAISettings, useUpdateAISettings, useNBASettings, useUpdateNBASettings, useNotificationSettings, useUpdateNotificationSettings, useDisplaySettings, useUpdateDisplaySettings, useCustomPrompts, useCreateCustomPrompt, useUpdateCustomPrompt, useDeleteCustomPrompt } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'
import { PRIORITY_VARIANTS } from '@/lib/labels'
import { CURRENCY_REGISTRY } from '@/lib/currency'
import type { AISettings, AITone, AIVerbosity, NBASettings, NotificationSettings, DisplaySettings, CommunicationChannel, FollowUpCadence, CustomPromptCategory } from '@/types/settings'
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

  function updatePermission(key: string, value: boolean) {
    if (!settings) return
    setSettings({ ...settings, permissions: { ...settings.permissions, [key]: value } })
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

      {/* Card 4: Custom Prompts — separate CRUD resource */}
      <CustomPromptsCard />

      {/* Card 5: AI Permissions */}
      <Card>
        <CardHeader action={<SaveButton onClick={save} disabled={update.isPending} />}>
          AI Permissions
        </CardHeader>
        <CardContent className="divide-y divide-border-primary">
          {Object.entries(settings.permissions).map(([key, enabled]) => (
            <Toggle
              key={key}
              label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              checked={enabled}
              onChange={(v) => updatePermission(key, v)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function NBASettingsPanel() {
  const { data, isLoading } = useNBASettings()
  const update = useUpdateNBASettings()
  const [settings, setSettings] = useState<NBASettings | null>(null)

  useEffect(() => { if (data) setSettings(data) }, [data])

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
        <CardContent className="divide-y divide-border-primary">
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

      {settings.customAlertRules.length > 0 && (
        <Card>
          <CardHeader>Custom Alert Rules</CardHeader>
          <CardContent className="space-y-2">
            {settings.customAlertRules.map((rule, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-border-primary px-3 py-2">
                <div>
                  <p className="text-body-strong">{rule.name}</p>
                  <p className="font-mono text-caption text-text-tertiary">{rule.condition}</p>
                </div>
                <Badge variant={PRIORITY_VARIANTS[rule.priority]}>{rule.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
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

export function SettingsPage() {
  const tabs = [
    { id: 'ai', label: 'AI Assistant', content: <AISettingsPanel /> },
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
