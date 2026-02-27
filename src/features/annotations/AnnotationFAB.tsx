import { useEffect, useState } from 'react'
import { ScanSearch, X } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'

export function AnnotationFAB() {
  const enabled = useUIStore((s) => s.annotationsEnabled)
  const panelOpen = useUIStore((s) => s.annotationPanelOpen)
  const toggle = useUIStore((s) => s.toggleAnnotations)
  const [bottomOffset, setBottomOffset] = useState(24)

  // Track --drawer-height CSS custom property to position FAB above drawer
  useEffect(() => {
    if (!panelOpen) {
      setBottomOffset(24)
      return
    }

    function sync() {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--drawer-height').trim()
      const px = parseInt(raw, 10)
      setBottomOffset(Number.isFinite(px) ? px + 24 : 24)
    }

    sync()
    // Re-sync on resize (covers drag-to-resize updates)
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

    return () => observer.disconnect()
  }, [panelOpen])

  return (
    <button
      onClick={toggle}
      aria-label={enabled ? 'Close guided tour' : 'Guided Tour'}
      title={enabled ? 'Close guided tour' : 'Guided Tour'}
      className={cn(
        'fixed right-6 z-[55] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200',
        enabled
          ? 'bg-accent-amber text-white hover:bg-amber-600'
          : 'bg-accent-amber text-white hover:bg-amber-600 animate-fab-pulse',
      )}
      style={{ bottom: bottomOffset }}
    >
      {enabled ? <X className="h-5 w-5" /> : <ScanSearch className="h-5 w-5" />}
    </button>
  )
}
