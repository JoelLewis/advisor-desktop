import { useState, useRef, useEffect } from 'react'
import { Play, Plus, ChevronDown } from 'lucide-react'
import { StartWorkflowDialog } from '@/features/workflows/StartWorkflowDialog'
import { QuickTaskDialog } from '@/features/workflows/QuickTaskDialog'

type WorkflowLaunchButtonProps = {
  clientId?: string
  clientName?: string
}

export function WorkflowLaunchButton({ clientId, clientName }: WorkflowLaunchButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [startWorkflowOpen, setStartWorkflowOpen] = useState(false)
  const [quickTaskOpen, setQuickTaskOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const context = clientId || clientName
    ? { clientId, clientName }
    : undefined

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-md border border-border-secondary px-3 py-1.5 text-caption font-medium text-text-primary transition-colors hover:bg-surface-tertiary"
        >
          <Play className="h-3.5 w-3.5" />
          Workflow
          <ChevronDown className="h-3 w-3 text-text-tertiary" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border-primary bg-surface-primary py-1 shadow-lg">
            <button
              onClick={() => { setMenuOpen(false); setStartWorkflowOpen(true) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-caption text-text-primary transition-colors hover:bg-surface-tertiary"
            >
              <Play className="h-3.5 w-3.5 text-accent-blue" />
              Start Workflow
            </button>
            <button
              onClick={() => { setMenuOpen(false); setQuickTaskOpen(true) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-caption text-text-primary transition-colors hover:bg-surface-tertiary"
            >
              <Plus className="h-3.5 w-3.5 text-accent-green" />
              New Task
            </button>
          </div>
        )}
      </div>

      <StartWorkflowDialog
        open={startWorkflowOpen}
        onClose={() => setStartWorkflowOpen(false)}
        prefilledContext={context}
      />
      <QuickTaskDialog
        open={quickTaskOpen}
        onClose={() => setQuickTaskOpen(false)}
        prefilledContext={context}
      />
    </>
  )
}
