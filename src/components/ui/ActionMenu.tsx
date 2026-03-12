import { useState, useRef, useEffect } from 'react'
import { Sparkles, ChevronDown, Bot, MessageSquare } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'

type ActionMenuContext = {
  entityType: string
  entityId: string
  entityName: string
  actionDescription: string
}

type ActionMenuProps = {
  context: ActionMenuContext
  variant?: 'primary' | 'compact'
}

export function ActionMenu({ context, variant = 'primary' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const setInitialMessage = useUIStore((s) => s.setInitialMessage)
  const toggleMessaging = useUIStore((s) => s.toggleMessaging)

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

  function handleAskAI() {
    setInitialMessage(`${context.actionDescription} for ${context.entityName}`)
    setOpen(false)
  }

  function handleDelegateAI() {
    setInitialMessage(`Delegate: ${context.actionDescription} for ${context.entityName}. Please handle this autonomously and report back when complete.`)
    setOpen(false)
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleAskAI}
        className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-accent-purple transition-colors hover:bg-accent-purple/10"
      >
        <Sparkles className="h-3 w-3" />
        Ask AI
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center">
        <button
          onClick={handleAskAI}
          className="flex items-center gap-1.5 rounded-l-md border border-r-0 border-accent-purple/30 bg-accent-purple/10 px-3 py-1.5 text-caption font-medium text-accent-purple transition-colors hover:bg-accent-purple/15"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Take Action
        </button>
        <button
          onClick={() => setOpen(!open)}
          className="flex h-[30px] items-center rounded-r-md border border-l-0 border-accent-purple/30 bg-accent-purple/10 px-1.5 text-accent-purple transition-colors hover:bg-accent-purple/15"
          aria-label="More actions"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-border-primary bg-surface-primary py-1 shadow-lg animate-scale-in">
          <button
            onClick={handleDelegateAI}
            className="flex w-full items-center gap-2 px-3 py-2 text-caption text-accent-purple transition-colors hover:bg-accent-purple/5"
          >
            <Bot className="h-3.5 w-3.5" />
            Delegate to AI
          </button>
          <button
            onClick={() => { toggleMessaging(); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-caption text-accent-blue transition-colors hover:bg-accent-blue/5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Delegate to Team
          </button>
        </div>
      )}
    </div>
  )
}
