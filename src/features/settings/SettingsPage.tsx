import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { TabLayout } from '@/components/ui/TabLayout'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAISettings, useUpdateAISettings, useNBASettings, useUpdateNBASettings, useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'
import type { AISettings, AITone, AIVerbosity, NBASettings, NotificationSettings } from '@/types/settings'
import type { NBACategory } from '@/types/nba'

const NBA_CATEGORIES: { value: NBACategory; label: string }[] = [
  { value: 'rebalancing', label: 'Rebalancing' },
  { value: 'tax_management', label: 'Tax Management' },
  { value: 'planning', label: 'Planning' },
  { value: 'risk', label: 'Risk' },
  { value: 'client_service', label: 'Client Service' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'growth', label: 'Growth' },
]

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

function AISettingsPanel() {
  const { data, isLoading } = useAISettings()
  const update = useUpdateAISettings()
  const [settings, setSettings] = useState<AISettings | null>(null)

  useEffect(() => { if (data) setSettings(data) }, [data])

  if (isLoading || !settings) return <Skeleton className="h-64" />

  function save() {
    if (settings) update.mutate(settings)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader action={
          <button onClick={save} disabled={update.isPending} className="flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        }>
          AI Assistant
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

      <Card>
        <CardHeader>AI Permissions</CardHeader>
        <CardContent className="divide-y divide-border-primary">
          {Object.entries(settings.permissions).map(([key, enabled]) => (
            <Toggle
              key={key}
              label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              checked={enabled}
              onChange={(v) => setSettings({ ...settings, permissions: { ...settings.permissions, [key]: v } })}
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
    if (settings) update.mutate(settings)
  }

  function toggleCategory(cat: NBACategory) {
    if (!settings) return
    const cats = settings.enabledCategories.includes(cat)
      ? settings.enabledCategories.filter((c) => c !== cat)
      : [...settings.enabledCategories, cat]
    setSettings({ ...settings, enabledCategories: cats })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader action={
          <button onClick={save} disabled={update.isPending} className="flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        }>
          Scoring Weights
        </CardHeader>
        <CardContent className="divide-y divide-border-primary">
          <SliderField label="Urgency" value={settings.weights.urgency} onChange={(v) => setSettings({ ...settings, weights: { ...settings.weights, urgency: v } })} />
          <SliderField label="Impact" value={settings.weights.impact} onChange={(v) => setSettings({ ...settings, weights: { ...settings.weights, impact: v } })} />
          <SliderField label="Efficiency" value={settings.weights.efficiency} onChange={(v) => setSettings({ ...settings, weights: { ...settings.weights, efficiency: v } })} />
          <SliderField label="Relationship" value={settings.weights.relationship} onChange={(v) => setSettings({ ...settings, weights: { ...settings.weights, relationship: v } })} />
          <SliderField label="Confidence" value={settings.weights.confidence} onChange={(v) => setSettings({ ...settings, weights: { ...settings.weights, confidence: v } })} />
          <div className="flex items-center justify-between py-2">
            <span className="text-caption text-text-secondary">Total</span>
            <span className={cn(
              'font-mono text-caption font-medium',
              Object.values(settings.weights).reduce((a, b) => a + b, 0) === 100 ? 'text-accent-green' : 'text-accent-red',
            )}>
              {Object.values(settings.weights).reduce((a, b) => a + b, 0)} / 100
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

const PRIORITY_VARIANTS = {
  critical: 'red' as const,
  high: 'yellow' as const,
  medium: 'blue' as const,
  low: 'default' as const,
}

function NotificationSettingsPanel() {
  const { data, isLoading } = useNotificationSettings()
  const update = useUpdateNotificationSettings()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)

  useEffect(() => { if (data) setSettings(data) }, [data])

  if (isLoading || !settings) return <Skeleton className="h-64" />

  function save() {
    if (settings) update.mutate(settings)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader action={
          <button onClick={save} disabled={update.isPending} className="flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        }>
          Notification Channels
        </CardHeader>
        <CardContent className="divide-y divide-border-primary">
          <Toggle label="Email notifications" checked={settings.channels.email} onChange={(v) => setSettings({ ...settings, channels: { ...settings.channels, email: v } })} />
          <Toggle label="In-app notifications" checked={settings.channels.inApp} onChange={(v) => setSettings({ ...settings, channels: { ...settings.channels, inApp: v } })} />
          <Toggle label="Desktop notifications" checked={settings.channels.desktop} onChange={(v) => setSettings({ ...settings, channels: { ...settings.channels, desktop: v } })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Quiet Hours</CardHeader>
        <CardContent className="space-y-3">
          <Toggle label="Enable quiet hours" checked={settings.quietHours.enabled} onChange={(v) => setSettings({ ...settings, quietHours: { ...settings.quietHours, enabled: v } })} />
          {settings.quietHours.enabled && (
            <div className="flex items-center gap-4 pl-1">
              <div className="flex items-center gap-2">
                <span className="text-caption text-text-secondary">From</span>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => setSettings({ ...settings, quietHours: { ...settings.quietHours, start: e.target.value } })}
                  className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 font-mono text-caption"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-caption text-text-secondary">To</span>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => setSettings({ ...settings, quietHours: { ...settings.quietHours, end: e.target.value } })}
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

export function SettingsPage() {
  const tabs = [
    { id: 'ai', label: 'AI Assistant', content: <AISettingsPanel /> },
    { id: 'nba', label: 'NBA Settings', content: <NBASettingsPanel /> },
    { id: 'notifications', label: 'Notifications', content: <NotificationSettingsPanel /> },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-page-title">Settings</h1>
      <TabLayout tabs={tabs} />
    </div>
  )
}
