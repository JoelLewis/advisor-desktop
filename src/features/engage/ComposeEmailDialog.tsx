import { useState } from 'react'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { useComposeEmail } from '@/hooks/use-engage'
import { useUIStore } from '@/store/ui-store'

const CLIENT_OPTIONS = [
  { id: 'cli-001', name: 'Robert Johnson' },
  { id: 'cli-003', name: 'Margaret Chen' },
  { id: 'cli-004', name: 'David Williams' },
  { id: 'cli-005', name: 'Sarah Thompson' },
  { id: 'cli-006', name: 'James Anderson' },
  { id: 'cli-007', name: 'Patricia Davis' },
] as const

type ComposeEmailDialogProps = {
  open: boolean
  onClose: () => void
  prefilledClientId?: string
}

export function ComposeEmailDialog({ open, onClose, prefilledClientId }: ComposeEmailDialogProps) {
  const [clientId, setClientId] = useState(prefilledClientId ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [complianceReview, setComplianceReview] = useState(false)
  const [success, setSuccess] = useState(false)
  const compose = useComposeEmail()

  const clientName = CLIENT_OPTIONS.find((c) => c.id === clientId)?.name ?? ''

  const isValid = clientId !== '' && subject.trim() !== '' && body.trim() !== ''

  function handleSubmit() {
    if (!isValid) return
    compose.mutate(
      { clientId, subject, body, complianceReview },
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
    setSubject('')
    setBody('')
    setComplianceReview(false)
  }

  function handleAIDraft() {
    useUIStore.getState().setInitialMessage(
      `Draft an email for ${clientName || 'client'}${subject ? ` about "${subject}"` : ''}. Suggest a professional, concise message.`,
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <CheckCircle2 className="h-10 w-10 text-accent-green" />
            <p className="text-body-strong text-text-primary">Email sent successfully</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 px-5 py-4">
              <div>
                <label htmlFor="compose-client" className="mb-1 block text-caption font-medium text-text-secondary">Client</label>
                <select
                  id="compose-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                >
                  <option value="">Select client...</option>
                  {CLIENT_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="compose-subject" className="mb-1 block text-caption font-medium text-text-secondary">Subject</label>
                <input
                  id="compose-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="compose-body" className="text-caption font-medium text-text-secondary">Body</label>
                  <button
                    type="button"
                    onClick={handleAIDraft}
                    disabled={!clientId}
                    className="flex items-center gap-1 rounded px-2 py-1 text-caption font-medium text-accent-purple transition-colors hover:bg-accent-purple/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-3 w-3" />
                    AI Draft
                  </button>
                </div>
                <textarea
                  id="compose-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email..."
                  rows={5}
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={complianceReview}
                  onChange={(e) => setComplianceReview(e.target.checked)}
                  className="h-4 w-4 rounded border-border-secondary text-accent-blue focus:ring-accent-blue"
                />
                <span className="text-caption text-text-secondary">Send for compliance review before delivery</span>
              </label>
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
                disabled={!isValid || compose.isPending}
                className="rounded-md bg-accent-blue px-4 py-2 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {compose.isPending ? 'Sending...' : 'Send'}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
