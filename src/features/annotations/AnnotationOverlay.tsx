import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useUIStore } from '@/store/ui-store'
import { useAnnotations } from './useAnnotations'
import { useHotspotPositions } from './useHotspotPositions'
import { AnnotationHotspot } from './AnnotationHotspot'

export function AnnotationOverlay() {
  const enabled = useUIStore((s) => s.annotationsEnabled)
  const activeId = useUIStore((s) => s.activeAnnotationId)
  const setActive = useUIStore((s) => s.setActiveAnnotation)

  const routeConfig = useAnnotations()
  const annotations = routeConfig?.annotations ?? []
  const positions = useHotspotPositions(annotations, enabled)

  // Manage annotation-active class on target elements
  useEffect(() => {
    if (!enabled) return

    const prev = document.querySelector('.annotation-active')
    prev?.classList.remove('annotation-active')

    if (activeId) {
      const el = document.querySelector(`[data-annotation="${activeId}"]`)
      el?.classList.add('annotation-active')
    }

    return () => {
      document.querySelector('.annotation-active')?.classList.remove('annotation-active')
    }
  }, [activeId, enabled])

  if (!enabled) return null

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[45]"
      aria-hidden="true"
    >
      {/* Subtle scrim */}
      <div className="absolute inset-0 bg-black/5" />

      {/* Hotspots */}
      {annotations.map((ann) => {
        const pos = positions.get(ann.id)
        if (!pos) return null

        return (
          <AnnotationHotspot
            key={ann.id}
            number={ann.number}
            theme={ann.theme}
            active={activeId === ann.id}
            style={{ top: pos.top, left: pos.left }}
            onClick={() => setActive(activeId === ann.id ? null : ann.id)}
          />
        )
      })}
    </div>,
    document.body,
  )
}
