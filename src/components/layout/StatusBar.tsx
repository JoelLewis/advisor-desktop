import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'

export function StatusBar() {
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)
  const aiPanelWidth = useUIStore((s) => s.aiPanelWidth)

  return (
    <footer
      className={cn(
        'fixed bottom-0 z-10 flex h-statusbar items-center justify-between border-t border-border-primary bg-surface-primary px-4 text-mono-sm text-text-tertiary transition-[left,right] duration-200 ease-in-out',
        sidebarExpanded ? 'left-sidebar-expanded' : 'left-sidebar-collapsed',
      )}
      style={{ right: aiPanelOpen ? aiPanelWidth : 0 }}
    >
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
          Connected
        </span>
        <span>Last sync: just now</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
          Data quality: Good
        </span>
        <span>v0.1.0</span>
      </div>
    </footer>
  )
}
