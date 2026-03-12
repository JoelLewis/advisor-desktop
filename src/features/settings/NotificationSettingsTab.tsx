import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/use-settings'
import { SaveButton, Toggle } from './settings-shared'
import type { NotificationSettings } from '@/types/settings'

export function NotificationSettingsPanel() {
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
