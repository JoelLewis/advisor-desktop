import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { useWorkflowTemplates, useStartWorkflow } from '@/hooks/use-workflows'

type StartWorkflowDialogProps = {
  open: boolean
  onClose: () => void
  prefilledContext?: { clientId?: string; clientName?: string }
  prefilledTemplateId?: string
}

export function StartWorkflowDialog({ open, onClose, prefilledContext, prefilledTemplateId }: StartWorkflowDialogProps) {
  const { data: templates, isLoading } = useWorkflowTemplates()
  const startWorkflow = useStartWorkflow()
  const [templateId, setTemplateId] = useState(prefilledTemplateId ?? '')
  const [priority, setPriority] = useState<string>('medium')
  const [success, setSuccess] = useState(false)

  const selectedTemplate = templates?.find((t) => t.id === templateId)
  const isValid = templateId !== ''

  function handleSubmit() {
    if (!isValid) return
    startWorkflow.mutate(
      {
        templateId,
        clientId: prefilledContext?.clientId,
        clientName: prefilledContext?.clientName,
        priority,
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
    setTemplateId(prefilledTemplateId ?? '')
    setPriority('medium')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Workflow</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <CheckCircle2 className="h-10 w-10 text-accent-green" />
            <p className="text-body-strong text-text-primary">Workflow started successfully</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 px-5 py-4">
              {isLoading ? (
                <Skeleton className="h-10" />
              ) : (
                <div>
                  <label htmlFor="wf-template" className="mb-1 block text-caption font-medium text-text-secondary">Template</label>
                  <select
                    id="wf-template"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                  >
                    <option value="">Select template...</option>
                    {templates?.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="mt-1 text-caption text-text-secondary">{selectedTemplate.description}</p>
                  )}
                </div>
              )}

              {prefilledContext?.clientName && (
                <div>
                  <label className="mb-1 block text-caption font-medium text-text-secondary">Client / Household</label>
                  <p className="rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-body text-text-primary">
                    {prefilledContext.clientName}
                  </p>
                </div>
              )}

              <fieldset>
                <legend className="mb-2 text-caption font-medium text-text-secondary">Priority</legend>
                <div className="flex items-center gap-4">
                  {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="wf-priority"
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

              {selectedTemplate && (
                <div>
                  <p className="mb-1 text-caption font-medium text-text-secondary">Steps ({selectedTemplate.steps.length})</p>
                  <div className="space-y-1">
                    {selectedTemplate.steps.map((step) => (
                      <div key={step.order} className="flex items-center gap-2 text-caption text-text-secondary">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-tertiary font-mono text-[10px]">{step.order}</span>
                        <span>{step.name}</span>
                        <span className="ml-auto font-mono text-text-tertiary">{step.estimatedMinutes}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                disabled={!isValid || startWorkflow.isPending}
                className="rounded-md bg-accent-blue px-4 py-2 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startWorkflow.isPending ? 'Starting...' : 'Start Workflow'}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
