import { useRef, useState, useEffect } from 'react'

/**
 * Measures a container element's width using ResizeObserver.
 * Returns a ref to attach to the container and the current width.
 */
export function useContainerWidth(defaultWidth = 600) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(defaultWidth)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setWidth(entry.contentRect.width)
      }
    })

    observer.observe(el)
    // Set initial width
    setWidth(el.clientWidth || defaultWidth)

    return () => observer.disconnect()
  }, [defaultWidth])

  return { containerRef, width }
}
