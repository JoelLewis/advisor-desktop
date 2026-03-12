import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Zap } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useNBASettings, useUpdateNBASettings } from '@/hooks/use-settings'
import { useNBAs } from '@/hooks/use-nbas'
import { cn } from '@/lib/utils'
import { PRIORITY_VARIANTS } from '@/lib/labels'
import { SaveButton, SliderField, NBA_CATEGORIES, SAVE_BUTTON_CLASS } from './settings-shared'
import type { NBASettings, CustomAlertRule } from '@/types/settings'
import type { NBACategory } from '@/types/nba'

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
                className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 text-caption focus:border-accent-blue focus:outline-hidden"
              >
                {ALERT_METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 text-caption focus:border-accent-blue focus:outline-hidden"
              >
                {ALERT_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                type="text"
                placeholder="value"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-24 rounded-md border border-border-secondary bg-surface-primary px-2 py-1 font-mono text-caption focus:border-accent-blue focus:outline-hidden"
              />
              <span className="text-caption text-text-secondary">for</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 text-caption focus:border-accent-blue focus:outline-hidden"
              >
                {ALERT_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <span className="text-caption text-text-secondary">generate</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CustomAlertRule['priority'])}
                className="rounded-md border border-border-secondary bg-surface-primary px-2 py-1 text-caption focus:border-accent-blue focus:outline-hidden"
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

export function NBASettingsPanel() {
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
    <div className="space-y-6" data-annotation="settings-nba">
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
