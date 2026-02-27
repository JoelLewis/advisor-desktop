import { useEffect, useRef } from 'react'
import { X, ScanSearch, BookOpen } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useAnnotations } from './useAnnotations'
import { AnnotationCard } from './AnnotationCard'
import { THEME_COLORS } from './AnnotationHotspot'
import { cn } from '@/lib/utils'

const PANEL_WIDTH = 360

const THEME_LABELS: Record<string, string> = {
  ai_embedded: 'Embedded AI',
  actionable_ux: 'Actionable UX',
  smart_workflows: 'Smart Workflows',
  batch_actions: 'Batch Actions',
}

export function AnnotationPanel() {
  const panelOpen = useUIStore((s) => s.annotationPanelOpen)
  const activeId = useUIStore((s) => s.activeAnnotationId)
  const setActive = useUIStore((s) => s.setActiveAnnotation)
  const setPanelOpen = useUIStore((s) => s.setAnnotationPanelOpen)
  const toggleAnnotations = useUIStore((s) => s.toggleAnnotations)
  const { isBase } = useBreakpoint()

  const routeConfig = useAnnotations()
  const listRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Auto-scroll active card into view
  useEffect(() => {
    if (activeId && cardRefs.current.has(activeId)) {
      cardRefs.current.get(activeId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeId])

  if (!panelOpen) return null

  return (
    <>
      {/* Backdrop for overlay mode at base breakpoint */}
      {isBase && (
        <div
          className="fixed inset-0 z-30 bg-black/30 animate-fade-in"
          onClick={() => setPanelOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className="fixed right-0 top-0 bottom-0 z-40 flex flex-col border-l border-border-primary bg-surface-primary shadow-lg animate-slide-in-right"
        style={{ width: PANEL_WIDTH }}
        role="complementary"
        aria-label="iDeal Demo Guide"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border-primary px-4 py-3">
          <ScanSearch className="h-5 w-5 text-accent-amber" />
          <h2 className="text-body-strong text-text-primary flex-1">iDeal Guide</h2>
          <button
            onClick={() => toggleAnnotations()}
            aria-label="Close guide"
            className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Theme legend */}
        <div className="flex flex-wrap gap-3 border-b border-border-primary px-4 py-2">
          {Object.entries(THEME_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-full', THEME_COLORS[key as keyof typeof THEME_COLORS].bg)} />
              <span className="text-mono-sm text-text-secondary">{label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {routeConfig ? (
            <>
              {/* Page info */}
              <div className="mb-3 rounded-lg bg-surface-tertiary p-3">
                <h3 className="text-body-strong text-text-primary">{routeConfig.pageTitle}</h3>
                <p className="mt-1 text-caption text-text-secondary">{routeConfig.pageDescription}</p>
              </div>

              {/* Annotation cards */}
              <div className="flex flex-col gap-2">
                {routeConfig.annotations.map((ann) => (
                  <div
                    key={ann.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(ann.id, el)
                      else cardRefs.current.delete(ann.id)
                    }}
                  >
                    <AnnotationCard
                      annotation={ann}
                      active={activeId === ann.id}
                      onClick={() => setActive(activeId === ann.id ? null : ann.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Empty state — no annotations for this page */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-10 w-10 text-text-tertiary mb-3" />
              <p className="text-body-strong text-text-secondary">No annotations on this page</p>
              <p className="text-caption text-text-tertiary mt-1">
                Navigate to an annotated page to see the guide.
              </p>
              <div className="mt-4 flex flex-col gap-1 text-caption text-accent-blue">
                <span>Dashboard &middot; Actions &middot; Client Detail</span>
                <span>Trading &middot; Workflows &middot; Portfolios</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export { PANEL_WIDTH }
