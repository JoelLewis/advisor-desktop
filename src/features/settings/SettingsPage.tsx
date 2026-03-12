import { TabLayout } from '@/components/ui/TabLayout'
import { AIAutonomyTab } from './AIAutonomyTab'
import { AISettingsPanel } from './AISettingsTab'
import { TemplatesPromptsPanel } from './TemplatesPromptsTab'
import { NBASettingsPanel } from './NBASettingsTab'
import { NotificationSettingsPanel } from './NotificationSettingsTab'
import { DisplaySettingsPanel } from './DisplaySettingsTab'

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
