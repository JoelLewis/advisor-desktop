import { ScanSearch, X } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'

export function AnnotationFAB() {
  const enabled = useUIStore((s) => s.annotationsEnabled)
  const toggle = useUIStore((s) => s.toggleAnnotations)

  return (
    <button
      onClick={toggle}
      aria-label={enabled ? 'Close guided tour' : 'Guided Tour'}
      title={enabled ? 'Close guided tour' : 'Guided Tour'}
      className={cn(
        'fixed bottom-6 right-6 z-[55] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200',
        enabled
          ? 'bg-accent-amber text-white hover:bg-amber-600'
          : 'bg-accent-amber text-white hover:bg-amber-600 animate-fab-pulse',
      )}
    >
      {enabled ? <X className="h-5 w-5" /> : <ScanSearch className="h-5 w-5" />}
    </button>
  )
}
