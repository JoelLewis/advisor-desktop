import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDisplaySettings, useUpdateDisplaySettings } from '@/hooks/use-settings'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import { CURRENCY_REGISTRY } from '@/lib/currency'
import { THEME_CONFIG } from '@/lib/theme'
import { SaveButton, Toggle, SelectField } from './settings-shared'
import type { DisplaySettings } from '@/types/settings'
import type { CurrencyCode } from '@/types/currency'

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

const THEME_OPTIONS = (['light', 'dark', 'system'] as const).map((value) => ({
  value,
  ...THEME_CONFIG[value],
}))

function ThemeCard() {
  const themeMode = useUIStore((s) => s.themeMode)
  const setThemeMode = useUIStore((s) => s.setThemeMode)

  return (
    <Card>
      <CardHeader>Appearance</CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {THEME_OPTIONS.map((opt) => (
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

export function DisplaySettingsPanel() {
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
