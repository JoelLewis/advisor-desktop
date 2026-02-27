import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { useBreakpoint } from '@/hooks/use-breakpoint'

export function StatusBar() {
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)
  const aiPanelWidth = useUIStore((s) => s.aiPanelWidth)
  const { isBase } = useBreakpoint()

  return (
    <footer
      className={cn(
        'fixed bottom-0 z-10 flex h-statusbar items-center justify-between border-t border-border-primary bg-surface-primary px-4 text-mono-sm text-text-tertiary transition-[left,right] duration-200 ease-in-out',
        sidebarExpanded ? 'left-sidebar-expanded' : 'left-sidebar-collapsed',
      )}
      style={{ right: aiPanelOpen && !isBase ? aiPanelWidth : 0 }}
    >
      <span>Reference Design by Joel Lewis</span>
      <div className="flex items-center gap-3">
        <a
          href="https://joellewis.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-tertiary transition-colors hover:text-accent-blue"
        >
          joellewis.com
        </a>
        <span className="text-border-secondary">&middot;</span>
        <span>Concept v1</span>
      </div>
    </footer>
  )
}
