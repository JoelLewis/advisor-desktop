import { useEffect, useRef, useState } from 'react'
import type { Annotation } from '@/types/annotation'

type Position = { top: number; left: number }

function computePosition(el: Element, annotation: Annotation): Position {
  const rect = el.getBoundingClientRect()
  const ox = annotation.offset?.x ?? 0
  const oy = annotation.offset?.y ?? 0

  switch (annotation.anchor) {
    case 'top-right':
      return { top: rect.top + oy - 6, left: rect.right + ox + 6 }
    case 'top-left':
      return { top: rect.top + oy - 6, left: rect.left + ox - 6 }
    case 'bottom-right':
      return { top: rect.bottom + oy + 6, left: rect.right + ox + 6 }
    case 'bottom-left':
      return { top: rect.bottom + oy + 6, left: rect.left + ox - 6 }
    case 'center-right':
      return { top: rect.top + rect.height / 2 + oy, left: rect.right + ox + 6 }
    case 'center-left':
      return { top: rect.top + rect.height / 2 + oy, left: rect.left + ox - 34 }
  }
}

/**
 * Tracks positions of elements matching `data-annotation` attributes.
 * Uses rAF-throttled scroll/resize listeners + 500ms fallback for lazy-loaded elements.
 */
export function useHotspotPositions(annotations: Annotation[], enabled: boolean) {
  const [positions, setPositions] = useState<Map<string, Position>>(new Map())
  const rafRef = useRef(0)

  useEffect(() => {
    if (!enabled || annotations.length === 0) {
      setPositions(new Map())
      return
    }

    function recalc() {
      const next = new Map<string, Position>()
      for (const ann of annotations) {
        const el = document.querySelector(`[data-annotation="${ann.id}"]`)
        if (el) {
          next.set(ann.id, computePosition(el, ann))
        }
      }
      setPositions(next)
    }

    function onScrollOrResize() {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(recalc)
    }

    // Initial calculation
    recalc()

    // Scroll (passive for performance)
    window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })

    // ResizeObserver on main content for layout shifts (sidebar/panel toggle)
    const main = document.getElementById('main-content')
    let resizeObserver: ResizeObserver | undefined
    if (main) {
      resizeObserver = new ResizeObserver(onScrollOrResize)
      resizeObserver.observe(main)
    }

    // Catch sidebar transition ends
    function onTransitionEnd(e: TransitionEvent) {
      if (e.propertyName === 'margin-left') {
        recalc()
      }
    }
    main?.addEventListener('transitionend', onTransitionEnd)

    // Fallback interval for lazy-loaded elements
    const interval = setInterval(recalc, 500)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('scroll', onScrollOrResize, { capture: true })
      window.removeEventListener('resize', onScrollOrResize)
      resizeObserver?.disconnect()
      main?.removeEventListener('transitionend', onTransitionEnd)
      clearInterval(interval)
    }
  }, [annotations, enabled])

  return positions
}
