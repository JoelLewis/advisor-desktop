import { useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useDataQualitySummary } from '@/hooks/use-reconciliation'
import { DataQualityPanel } from '@/features/reconciliation/DataQualityPanel'

export function StatusBar() {
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)
  const aiPanelWidth = useUIStore((s) => s.aiPanelWidth)
  const { isBase } = useBreakpoint()
  const [dqOpen, setDqOpen] = useState(false)
  const { data: summary } = useDataQualitySummary()

  const openBreaks = summary?.openBreaks ?? 0
  const hasIssues = openBreaks > 0

  return (
    <>
      <footer
        className={cn(
          'fixed bottom-0 z-10 flex h-statusbar items-center justify-between border-t border-border-primary bg-surface-primary px-4 text-mono-sm text-text-tertiary transition-[left,right] duration-200 ease-in-out',
          sidebarExpanded ? 'left-sidebar-expanded' : 'left-sidebar-collapsed',
        )}
        style={{ right: aiPanelOpen && !isBase ? aiPanelWidth : 0 }}
      >
        <div className="flex items-center gap-3">
          <span>Reference Design by Joel Lewis</span>
          <span className="text-border-secondary">&middot;</span>
          <button
            onClick={() => setDqOpen((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors hover:bg-surface-tertiary',
              hasIssues ? 'text-amber-600' : 'text-accent-green',
            )}
          >
            {hasIssues ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            <Activity className="h-3 w-3" />
            <span className="font-mono">
              {hasIssues ? `${openBreaks} break${openBreaks > 1 ? 's' : ''}` : 'All synced'}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://joelelewis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-tertiary transition-colors hover:text-accent-blue"
          >
            joelelewis.com
          </a>
          <span className="text-border-secondary">&middot;</span>
          <span>Concept v1</span>
        </div>
      </footer>
      <DataQualityPanel open={dqOpen} onClose={() => setDqOpen(false)} />
    </>
  )
}
