import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { useLogCall } from '@/hooks/use-engage'

const CLIENT_OPTIONS = [
  { id: 'cli-001', name: 'Robert Johnson' },
  { id: 'cli-003', name: 'Margaret Chen' },
  { id: 'cli-004', name: 'David Williams' },
  { id: 'cli-005', name: 'Sarah Thompson' },
  { id: 'cli-006', name: 'James Anderson' },
  { id: 'cli-007', name: 'Patricia Davis' },
] as const

type LogCallDialogProps = {
  open: boolean
  onClose: () => void
  prefilledClientId?: string
}

export function LogCallDialog({ open, onClose, prefilledClientId }: LogCallDialogProps) {
  const [clientId, setClientId] = useState(prefilledClientId ?? '')
  const [duration, setDuration] = useState(15)
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [summary, setSummary] = useState('')
  const [success, setSuccess] = useState(false)
  const logCallMutation = useLogCall()

  const isValid = clientId !== '' && duration > 0 && summary.trim() !== ''

  function handleSubmit() {
    if (!isValid) return
    logCallMutation.mutate(
      { clientId, duration, summary, direction },
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
    setClientId(prefilledClientId ?? '')
    setDuration(15)
    setDirection('outbound')
    setSummary('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Call</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <CheckCircle2 className="h-10 w-10 text-accent-green" />
            <p className="text-body-strong text-text-primary">Call logged successfully</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 px-5 py-4">
              <div>
                <label htmlFor="call-client" className="mb-1 block text-caption font-medium text-text-secondary">Client</label>
                <select
                  id="call-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
                >
                  <option value="">Select client...</option>
                  {CLIENT_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="call-duration" className="mb-1 block text-caption font-medium text-text-secondary">Duration (minutes)</label>
                <input
                  id="call-duration"
                  type="number"
                  min={1}
                  max={300}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-32 rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-caption font-medium text-text-secondary">Direction</legend>
                <div className="flex items-center gap-4">
                  {(['outbound', 'inbound'] as const).map((dir) => (
                    <label key={dir} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="call-direction"
                        value={dir}
                        checked={direction === dir}
                        onChange={() => setDirection(dir)}
                        className="h-4 w-4 border-border-secondary text-accent-blue focus:ring-accent-blue"
                      />
                      <span className="text-body text-text-primary">{dir.charAt(0).toUpperCase() + dir.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="call-summary" className="mb-1 block text-caption font-medium text-text-secondary">Summary</label>
                <textarea
                  id="call-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief summary of the call..."
                  rows={4}
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue resize-none"
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
                disabled={!isValid || logCallMutation.isPending}
                className="rounded-md bg-accent-blue px-4 py-2 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {logCallMutation.isPending ? 'Logging...' : 'Log Call'}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
