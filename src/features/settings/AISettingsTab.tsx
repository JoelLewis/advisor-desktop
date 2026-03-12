import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAISettings, useUpdateAISettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'
import { SaveButton, Toggle, SelectField, COMMUNICATION_CHANNELS, FOLLOW_UP_CADENCES, PROPOSAL_TEMPLATES, PROPOSAL_SECTIONS } from './settings-shared'
import { PermissionMatrixCard } from './autonomy/PermissionMatrixCard'
import type { AISettings, AITone, AIVerbosity, CommunicationChannel, FollowUpCadence } from '@/types/settings'

export function AISettingsPanel() {
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
              className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary">Email Signature</label>
            <textarea
              value={settings.persona.emailSignature}
              onChange={(e) => updatePersona({ emailSignature: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 font-mono text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
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
              className="w-full resize-none rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden"
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-body text-text-primary">Default Fee Rate</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={settings.documentDefaults.defaultFeeRate}
                onChange={(e) => updateDocDefaults({ defaultFeeRate: e.target.value })}
                className="w-16 rounded-md border border-border-secondary bg-surface-primary px-2 py-1.5 text-right font-mono text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
              />
              <span className="text-body text-text-secondary">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: AI Permission Matrix */}
      <PermissionMatrixCard />
    </div>
  )
}
