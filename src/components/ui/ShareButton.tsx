import { useState, useRef, useEffect } from 'react'
import { Share2, Sparkles, MessageSquare } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import type { RichCardData } from '@/types/rich-card'

type ShareButtonProps = {
  card: RichCardData
  className?: string
}

export function ShareButton({ card, className }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const shareWithAI = useUIStore((s) => s.shareWithAI)
  const shareWithTeam = useUIStore((s) => s.shareWithTeam)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
        aria-label="Share"
        title="Share"
      >
        <Share2 className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border-primary bg-surface-primary py-1 shadow-lg animate-fade-in">
          <button
            onClick={() => {
              shareWithAI(card)
              setOpen(false)
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-caption text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent-purple" />
            Share with AI
          </button>
          <button
            onClick={() => {
              shareWithTeam(card)
              setOpen(false)
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-caption text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary"
          >
            <MessageSquare className="h-3.5 w-3.5 text-accent-blue" />
            Share with Team
          </button>
        </div>
      )}
    </div>
  )
}
