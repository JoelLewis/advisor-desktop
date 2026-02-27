import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { useCreateTask } from '@/hooks/use-workflows'

type QuickTaskDialogProps = {
  open: boolean
  onClose: () => void
  prefilledContext?: { clientId?: string; clientName?: string }
}

export function QuickTaskDialog({ open, onClose, prefilledContext }: QuickTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState(prefilledContext?.clientName ?? '')
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [success, setSuccess] = useState(false)
  const createTask = useCreateTask()

  const isValid = title.trim() !== '' && dueDate !== ''

  function handleSubmit() {
    if (!isValid) return
    createTask.mutate(
      {
        title,
        priority,
        dueDate,
        clientId: prefilledContext?.clientId,
        clientName: clientName || undefined,
      },
      {
        onSuccess: () => {
          setSuccess(true)
          setTimeout(() => {
            setSuccess(false)
            resetForm()
            onClose()
          }, 1500)
        },
      },
    )
  }

  function resetForm() {
    setTitle('')
    setClientName(prefilledContext?.clientName ?? '')
    setPriority('medium')
    setDueDate('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <CheckCircle2 className="h-10 w-10 text-accent-green" />
            <p className="text-body-strong text-text-primary">Task created successfully</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 px-5 py-4">
              <div>
                <label htmlFor="task-title" className="mb-1 block text-caption font-medium text-text-secondary">Title</label>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                />
              </div>

              <div>
                <label htmlFor="task-client" className="mb-1 block text-caption font-medium text-text-secondary">Client (optional)</label>
                <input
                  id="task-client"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client name..."
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-caption font-medium text-text-secondary">Priority</legend>
                <div className="flex items-center gap-4">
                  {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="task-priority"
                        value={p}
                        checked={priority === p}
                        onChange={() => setPriority(p)}
                        className="h-4 w-4 border-border-secondary text-accent-blue focus:ring-accent-blue"
                      />
                      <span className="text-body text-text-primary">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="task-due" className="mb-1 block text-caption font-medium text-text-secondary">Due Date</label>
                <input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-48 rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-body text-text-primary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                />
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => { resetForm(); onClose() }}
                className="rounded-md border border-border-secondary px-4 py-2 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValid || createTask.isPending}
                className="rounded-md bg-accent-blue px-4 py-2 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTask.isPending ? 'Creating...' : 'Create Task'}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
