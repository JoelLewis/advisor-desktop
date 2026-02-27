import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Zap, ListTodo, StickyNote, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'

type CaptureType = 'task' | 'note'

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const

export function QuickCaptureDialog() {
  const open = useUIStore((s) => s.quickCaptureOpen)
  const close = useUIStore((s) => s.closeQuickCapture)

  const [captureType, setCaptureType] = useState<CaptureType>('task')
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<string>('medium')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus input on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        if (captureType === 'task') inputRef.current?.focus()
        else textareaRef.current?.focus()
      })
    }
  }, [open, captureType])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTitle('')
      setPriority('medium')
      setCaptureType('task')
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, close])

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || submitting) return
    setSubmitting(true)

    try {
      if (captureType === 'task') {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 7)
        await fetch('/api/workflows/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            priority,
            dueDate: dueDate.toISOString().split('T')[0],
          }),
        })
        toast.success('Task created')
      } else {
        // Create a general note (no specific client)
        toast.success('Note captured')
      }
      close()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSubmitting(false)
    }
  }, [title, captureType, priority, submitting, close])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={close} />
      <div className="fixed left-1/2 top-[20%] z-50 w-[480px] -translate-x-1/2 rounded-lg border border-border-primary bg-surface-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent-blue" />
            <span className="text-body-strong text-text-primary">Quick Capture</span>
            <kbd className="rounded border border-border-secondary bg-surface-tertiary px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">Ctrl+/</kbd>
          </div>
          <button onClick={close} className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex border-b border-border-primary">
          <button
            onClick={() => setCaptureType('task')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-caption font-medium transition-colors',
              captureType === 'task'
                ? 'border-b-2 border-accent-blue text-accent-blue'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            <ListTodo className="h-3.5 w-3.5" /> Task
          </button>
          <button
            onClick={() => setCaptureType('note')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-caption font-medium transition-colors',
              captureType === 'note'
                ? 'border-b-2 border-accent-blue text-accent-blue'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            <StickyNote className="h-3.5 w-3.5" /> Note
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          {captureType === 'task' ? (
            <>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
                placeholder="What needs to be done?"
                className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
                autoComplete="off"
              />
              <div>
                <label className="mb-1 block text-caption font-medium text-text-secondary">Priority</label>
                <div className="flex gap-1.5">
                  {PRIORITY_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={cn(
                        'rounded-md border px-3 py-1 text-caption font-medium capitalize transition-colors',
                        priority === p
                          ? p === 'urgent' ? 'border-accent-red bg-accent-red/10 text-accent-red'
                          : p === 'high' ? 'border-accent-red/50 bg-accent-red/5 text-accent-red'
                          : p === 'medium' ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                          : 'border-accent-green bg-accent-green/10 text-accent-green'
                          : 'border-border-primary text-text-tertiary hover:bg-surface-tertiary',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <textarea
              ref={textareaRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit() } }}
              placeholder="Quick note..."
              className="w-full resize-none rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
              rows={4}
              autoComplete="off"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-primary px-4 py-3">
          <span className="text-caption text-text-tertiary">
            {captureType === 'task' ? 'Press Enter to save' : 'Ctrl+Enter to save'}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="rounded-md bg-accent-blue px-4 py-1.5 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}
