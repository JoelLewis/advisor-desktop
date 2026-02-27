import { useState, useCallback } from 'react'
import { Search, Bell, Sparkles, User, MessageSquare, Info, SquarePen } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { usePlatform } from '@/hooks/use-platform'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useNotificationCounts } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import { WelcomeOverlay } from '@/features/welcome/WelcomeOverlay'
import { NotificationCenter } from '@/features/notifications/NotificationCenter'

export function TopBar() {
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)
  const aiPanelWidth = useUIStore((s) => s.aiPanelWidth)
  const openSearch = useUIStore((s) => s.openGlobalSearch)
  const openCapture = useUIStore((s) => s.openQuickCapture)
  const toggleAI = useUIStore((s) => s.toggleAIPanel)
  const toggleMessaging = useUIStore((s) => s.toggleMessaging)
  const { shortcut } = usePlatform()
  const { isBase } = useBreakpoint()
  const [showAbout, setShowAbout] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { data: countData } = useNotificationCounts()
  const unreadTotal = countData?.total ?? 0
  const handleAboutDismiss = useCallback(() => setShowAbout(false), [])
  const toggleNotifications = useCallback(() => setNotifOpen((prev) => !prev), [])

  return (
    <header
      className={cn(
        'fixed top-0 z-20 flex h-topbar items-center justify-between border-b border-border-primary bg-surface-primary px-4 transition-[left,right] duration-200 ease-in-out',
        sidebarExpanded ? 'left-sidebar-expanded' : 'left-sidebar-collapsed',
      )}
      style={{ right: aiPanelOpen && !isBase ? aiPanelWidth : 0 }}
    >
      {/* Left: Search + Quick Capture */}
      <div className="flex items-center gap-2">
        <button
          onClick={openSearch}
          data-annotation="dash-search"
          className="flex items-center gap-2 rounded-md border border-border-primary bg-surface-secondary px-3 py-1.5 text-caption text-text-tertiary transition-colors hover:border-border-secondary hover:text-text-secondary"
        >
          <Search className="h-4 w-4" />
          <span className="hidden xl:inline">Search clients, accounts...</span>
          <kbd className="ml-4 rounded border border-border-primary bg-surface-primary px-1.5 py-0.5 text-mono-sm">
            {shortcut('K')}
          </kbd>
        </button>
        <button
          onClick={openCapture}
          className="flex items-center gap-1.5 rounded-md border border-border-primary bg-surface-secondary px-3 py-1.5 text-caption text-text-tertiary transition-colors hover:border-border-secondary hover:text-text-secondary"
          aria-label="Quick Capture"
          title="Quick Capture (Ctrl+/)"
        >
          <SquarePen className="h-4 w-4" />
          <span className="hidden xl:inline">Capture</span>
          <kbd className="rounded border border-border-primary bg-surface-primary px-1.5 py-0.5 text-mono-sm">
            Ctrl+/
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleAI}
          data-annotation="dash-ai-toggle"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-accent-purple transition-colors hover:bg-accent-purple/10"
          aria-label="Toggle AI assistant"
          title={`AI Assistant (${shortcut('J')})`}
        >
          <Sparkles className="h-5 w-5" />
        </button>

        <button
          onClick={toggleMessaging}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-accent-blue transition-colors hover:bg-accent-blue/10"
          aria-label="Toggle messaging"
          title="Team Messages (Ctrl+M)"
        >
          <MessageSquare className="h-5 w-5" />
        </button>

        <button
          onClick={toggleNotifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-tertiary"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadTotal > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-red px-1 text-[10px] font-medium leading-none text-white">
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowAbout(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-tertiary"
          aria-label="About this project"
          title="About this project"
        >
          <Info className="h-5 w-5" />
        </button>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-tertiary text-text-secondary transition-colors hover:bg-border-primary"
          aria-label="User menu"
        >
          <User className="h-4 w-4" />
        </button>
      </div>

      {/* Welcome / About overlay */}
      <WelcomeOverlay forceOpen={showAbout} onDismiss={handleAboutDismiss} />

      {/* Notification Center */}
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  )
}
