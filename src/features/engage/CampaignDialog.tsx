import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { useCreateCampaign } from '@/hooks/use-engage'
import type { CampaignChannel } from '@/types/engage'

type CampaignDialogProps = {
  open: boolean
  onClose: () => void
}

export function CampaignDialog({ open, onClose }: CampaignDialogProps) {
  const [name, setName] = useState('')
  const [channel, setChannel] = useState<CampaignChannel>('email')
  const [audience, setAudience] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const createMutation = useCreateCampaign()

  const isValid = name.trim() !== '' && audience.trim() !== '' && message.trim() !== ''

  function handleSubmit() {
    if (!isValid) return
    createMutation.mutate(
      { name, channel, audience, message },
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
    setName('')
    setChannel('email')
    setAudience('')
    setMessage('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <CheckCircle2 className="h-10 w-10 text-accent-green" />
            <p className="text-body-strong text-text-primary">Campaign created successfully</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 px-5 py-4">
              <div>
                <label htmlFor="campaign-name" className="mb-1 block text-caption font-medium text-text-secondary">Name</label>
                <input
                  id="campaign-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Campaign name..."
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-caption font-medium text-text-secondary">Channel</legend>
                <div className="flex items-center gap-4">
                  {(['email', 'sms', 'both'] as const).map((ch) => (
                    <label key={ch} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="campaign-channel"
                        value={ch}
                        checked={channel === ch}
                        onChange={() => setChannel(ch)}
                        className="h-4 w-4 border-border-secondary text-accent-blue focus:ring-accent-blue"
                      />
                      <span className="text-body text-text-primary">{ch === 'both' ? 'Both' : ch.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="campaign-audience" className="mb-1 block text-caption font-medium text-text-secondary">Audience</label>
                <input
                  id="campaign-audience"
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g., All platinum clients, Retirees, etc."
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                />
              </div>

              <div>
                <label htmlFor="campaign-message" className="mb-1 block text-caption font-medium text-text-secondary">Message</label>
                <textarea
                  id="campaign-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Campaign message content..."
                  rows={4}
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue resize-none"
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
                disabled={!isValid || createMutation.isPending}
                className="rounded-md bg-accent-blue px-4 py-2 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
