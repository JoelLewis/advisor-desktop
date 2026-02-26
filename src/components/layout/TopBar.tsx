import { Search, Bell, Sparkles, User, MessageSquare } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { usePlatform } from '@/hooks/use-platform'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { cn } from '@/lib/utils'

export function TopBar() {
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)
  const aiPanelWidth = useUIStore((s) => s.aiPanelWidth)
  const openSearch = useUIStore((s) => s.openGlobalSearch)
  const toggleAI = useUIStore((s) => s.toggleAIPanel)
  const toggleMessaging = useUIStore((s) => s.toggleMessaging)
  const { shortcut } = usePlatform()
  const { isBase } = useBreakpoint()

  return (
    <header
      className={cn(
        'fixed top-0 z-20 flex h-topbar items-center justify-between border-b border-border-primary bg-surface-primary px-4 transition-[left,right] duration-200 ease-in-out',
        sidebarExpanded ? 'left-sidebar-expanded' : 'left-sidebar-collapsed',
      )}
      style={{ right: aiPanelOpen && !isBase ? aiPanelWidth : 0 }}
    >
      {/* Left: Search trigger */}
      <button
        onClick={openSearch}
        className="flex items-center gap-2 rounded-md border border-border-primary bg-surface-secondary px-3 py-1.5 text-caption text-text-tertiary transition-colors hover:border-border-secondary hover:text-text-secondary"
      >
        <Search className="h-4 w-4" />
        <span className="hidden xl:inline">Search clients, accounts...</span>
        <kbd className="ml-4 rounded border border-border-primary bg-surface-primary px-1.5 py-0.5 text-mono-sm">
          {shortcut('K')}
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleAI}
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
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-tertiary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {/* Notification dot */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-red" />
        </button>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-tertiary text-text-secondary transition-colors hover:bg-border-primary"
          aria-label="User menu"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
