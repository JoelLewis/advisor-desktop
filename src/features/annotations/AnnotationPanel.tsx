import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ScanSearch, GripHorizontal, BookOpen, Eye } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { useAnnotations } from './useAnnotations'
import { THEME_COLORS } from './AnnotationHotspot'
import { cn } from '@/lib/utils'

const MIN_HEIGHT = 140
const MAX_HEIGHT = 400
const DEFAULT_HEIGHT = 220
const SNAP_POINTS = [MIN_HEIGHT, DEFAULT_HEIGHT, MAX_HEIGHT] as const
const DISMISS_THRESHOLD = 60 // drag below MIN by this much to dismiss

const THEME_LABELS: Record<string, string> = {
  ai_embedded: 'Embedded AI',
  actionable_ux: 'Actionable UX',
  smart_workflows: 'Smart Workflows',
  batch_actions: 'Batch Actions',
}

function nearestSnap(height: number, maxAllowed: number): number {
  let best = MIN_HEIGHT
  let bestDist = Math.abs(height - best)
  for (const snap of SNAP_POINTS) {
    if (snap > maxAllowed) continue
    const dist = Math.abs(height - snap)
    if (dist < bestDist) {
      best = snap
      bestDist = dist
    }
  }
  return best
}

export function AnnotationPanel() {
  const panelOpen = useUIStore((s) => s.annotationPanelOpen)
  const activeId = useUIStore((s) => s.activeAnnotationId)
  const setActive = useUIStore((s) => s.setActiveAnnotation)
  const toggleAnnotations = useUIStore((s) => s.toggleAnnotations)
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)

  const routeConfig = useAnnotations()
  const [drawerHeight, setDrawerHeight] = useState(DEFAULT_HEIGHT)
  const [isSnapping, setIsSnapping] = useState(false)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)
  const pillStripRef = useRef<HTMLDivElement>(null)

  // Viewport-relative max: cap at 50vh so drawer never overwhelms the screen
  const effectiveMax = typeof window !== 'undefined'
    ? Math.min(MAX_HEIGHT, Math.floor(window.innerHeight * 0.5))
    : MAX_HEIGHT

  // Sync --drawer-height CSS custom property
  useEffect(() => {
    if (panelOpen) {
      document.documentElement.style.setProperty('--drawer-height', `${drawerHeight}px`)
    } else {
      document.documentElement.style.removeProperty('--drawer-height')
    }
    return () => {
      document.documentElement.style.removeProperty('--drawer-height')
    }
  }, [panelOpen, drawerHeight])

  // Auto-scroll active pill into view
  useEffect(() => {
    if (activeId && pillStripRef.current) {
      const pill = pillStripRef.current.querySelector(`[data-pill="${activeId}"]`)
      pill?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeId])

  // Drag-to-resize handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartHeight.current = drawerHeight
    setIsSnapping(false)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    document.body.classList.add('select-none')
  }, [drawerHeight])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const delta = dragStartY.current - e.clientY
    // Allow dragging slightly below MIN for the dismiss gesture
    const next = Math.min(effectiveMax, Math.max(MIN_HEIGHT - DISMISS_THRESHOLD, dragStartHeight.current + delta))
    setDrawerHeight(next)
  }, [effectiveMax])

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    document.body.classList.remove('select-none')

    // Swipe-down-to-dismiss: if dragged well below minimum, close
    if (drawerHeight < MIN_HEIGHT - DISMISS_THRESHOLD / 2) {
      toggleAnnotations()
      setDrawerHeight(DEFAULT_HEIGHT) // reset for next open
      return
    }

    // Snap to nearest snap point
    const target = nearestSnap(drawerHeight, effectiveMax)
    if (target !== drawerHeight) {
      setIsSnapping(true)
      setDrawerHeight(target)
      // Clear snapping flag after transition
      setTimeout(() => setIsSnapping(false), 200)
    }
  }, [drawerHeight, effectiveMax, toggleAnnotations])

  function handlePillClick(annotationId: string) {
    setActive(activeId === annotationId ? null : annotationId)
    const el = document.querySelector(`[data-annotation="${annotationId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function scrollToElement(annotationId: string) {
    const el = document.querySelector(`[data-annotation="${annotationId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (!panelOpen) return null

  const sidebarWidth = sidebarExpanded ? 240 : 64
  const activeAnnotation = routeConfig?.annotations.find((a) => a.id === activeId)
  const showExpandedArea = drawerHeight > MIN_HEIGHT + 20
  // Clamp visual height to MIN for display (the below-MIN range is only for the dismiss gesture)
  const visualHeight = Math.max(MIN_HEIGHT, drawerHeight)

  return (
    <aside
      className={cn(
        'fixed bottom-0 z-[48] flex flex-col border-t border-border-primary bg-surface-primary shadow-[0_-4px_16px_rgba(0,0,0,0.08)] animate-slide-up',
        isSnapping && 'transition-[height] duration-200 ease-out',
      )}
      style={{
        left: sidebarWidth,
        right: 0,
        height: visualHeight,
        // Fade out slightly when in dismiss range
        opacity: drawerHeight < MIN_HEIGHT ? Math.max(0.3, drawerHeight / MIN_HEIGHT) : 1,
      }}
      role="complementary"
      aria-label="Feature Guide"
    >
      {/* Drag handle bar — touch-action: none prevents browser scroll hijacking */}
      <div
        className="flex h-8 shrink-0 cursor-ns-resize items-center justify-between border-b border-border-primary px-4"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize drawer"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-4 w-4 text-text-tertiary" />
          <ScanSearch className="h-4 w-4 text-accent-amber" />
          <span className="text-caption font-semibold text-text-primary">Feature Guide</span>
          {/* Inline theme legend dots */}
          <div className="ml-2 hidden items-center gap-2 sm:flex">
            {Object.entries(THEME_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1">
                <span className={cn('h-2 w-2 rounded-full', THEME_COLORS[key as keyof typeof THEME_COLORS].bg)} />
                <span className="text-mono-sm text-text-tertiary">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleAnnotations()
          }}
          aria-label="Close guide"
          className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {routeConfig ? (
        <>
          {/* Card navigation strip — overscroll-behavior prevents scroll chaining to page */}
          <div
            ref={pillStripRef}
            className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-border-primary px-4 scrollbar-thin"
            style={{ scrollSnapType: 'x mandatory', overscrollBehavior: 'contain' }}
          >
            {routeConfig.annotations.map((ann) => {
              const colors = THEME_COLORS[ann.theme]
              const isActive = activeId === ann.id
              return (
                <button
                  key={ann.id}
                  data-pill={ann.id}
                  onClick={() => handlePillClick(ann.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-caption font-medium transition-all duration-150',
                    isActive
                      ? 'text-white shadow-sm'
                      : 'border border-border-primary bg-surface-primary text-text-secondary hover:bg-surface-tertiary',
                  )}
                  style={{
                    scrollSnapAlign: 'center',
                    ...(isActive ? { backgroundColor: colors.cssVar } : {}),
                  }}
                >
                  <span className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                    isActive ? 'bg-white/25 text-white' : cn(colors.bg, 'text-white'),
                  )}>
                    {ann.number}
                  </span>
                  <span className="whitespace-nowrap">{ann.title}</span>
                </button>
              )
            })}
          </div>

          {/* Expanded card area — overscroll-behavior prevents scroll chaining */}
          {showExpandedArea && (
            <div
              className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin"
              style={{ overscrollBehavior: 'contain' }}
            >
              {activeAnnotation ? (
                <div className="animate-fade-in">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                        THEME_COLORS[activeAnnotation.theme].bg,
                      )}
                    >
                      {activeAnnotation.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-body-strong text-text-primary">{activeAnnotation.title}</h3>
                      <p className="mt-1 text-caption text-text-secondary leading-relaxed">
                        {activeAnnotation.description}
                      </p>
                      <button
                        onClick={() => scrollToElement(activeAnnotation.id)}
                        className="mt-2 inline-flex items-center gap-1 text-caption text-accent-blue hover:underline"
                      >
                        <Eye className="h-3 w-3" />
                        View element
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-caption text-text-tertiary">
                    Select an annotation above to see details
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Empty state — no annotations for this page */
        <div className="flex flex-1 items-center justify-center gap-3 px-4">
          <BookOpen className="h-6 w-6 text-text-tertiary" />
          <div>
            <p className="text-body-strong text-text-secondary">No annotations on this page</p>
            <p className="text-caption text-text-tertiary">
              Dashboard &middot; Actions &middot; Client Detail &middot; Trading &middot; Workflows &middot; Portfolios
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
