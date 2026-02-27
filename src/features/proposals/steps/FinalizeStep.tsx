import { useState } from 'react'
import { Check, FileText, Loader2, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProposal, useFinalizeProposal } from '@/hooks/use-proposals'
import { formatDate } from '@/lib/utils'

type FinalizeStepProps = {
  proposalId: string
  clientId: string
}

export function FinalizeStep({ proposalId, clientId }: FinalizeStepProps) {
  const navigate = useNavigate()
  const { data: proposal } = useProposal(proposalId)
  const finalizeMutation = useFinalizeProposal(proposalId)
  const [finalized, setFinalized] = useState(false)
  const [result, setResult] = useState<{ documentId: string; message: string } | null>(null)

  if (!proposal) return null

  const isAlreadyFinalized = proposal.status === 'finalized'

  function handleFinalize() {
    finalizeMutation.mutate(undefined, {
      onSuccess: (data) => {
        setFinalized(true)
        setResult({ documentId: data.documentId, message: data.message })
      },
    })
  }

  if (finalized || isAlreadyFinalized) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-green">
          <Check className="h-8 w-8 text-white" />
        </div>
        <h3 className="mt-6 text-h3 font-semibold text-text-primary">Proposal Finalized</h3>
        <p className="mt-2 max-w-md text-body text-text-secondary">
          {result?.message ?? 'The proposal has been finalized and is ready for client presentation.'}
        </p>
        {result?.documentId && (
          <p className="mt-1 text-caption text-text-tertiary">
            Document ID: {result.documentId}
          </p>
        )}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => navigate(`/clients/${clientId}`)}
            className="flex items-center gap-2 rounded-md bg-accent-blue px-4 py-2 text-body font-medium text-white hover:bg-accent-blue/90"
          >
            <ArrowRight className="h-4 w-4" /> Return to Client
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-md border border-border-primary px-4 py-2 text-body font-medium text-text-secondary hover:bg-surface-tertiary"
          >
            Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Pre-finalize summary
  const sectionCount = proposal.sections.length
  const editedCount = proposal.sections.filter((s) => s.status === 'edited').length
  const checks = proposal.complianceChecks
  const allPassed = checks.length > 0 && !checks.some((c) => c.status === 'fail')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-body font-semibold text-text-primary">Finalize Proposal</h3>
        <p className="text-caption text-text-secondary">
          Review the summary below, then finalize to generate the client-ready document.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-lg border border-border-primary p-4 space-y-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-accent-blue" />
          <span className="text-body font-semibold text-text-primary">{proposal.templateName}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-caption">
          <div>
            <span className="text-text-tertiary">Client</span>
            <p className="font-medium text-text-primary">{proposal.clientData.clientName}</p>
          </div>
          <div>
            <span className="text-text-tertiary">Created</span>
            <p className="font-medium text-text-primary">{formatDate(proposal.createdAt)}</p>
          </div>
          <div>
            <span className="text-text-tertiary">Sections</span>
            <p className="font-medium text-text-primary">{sectionCount} total, {editedCount} edited</p>
          </div>
          <div>
            <span className="text-text-tertiary">Compliance</span>
            <p className={allPassed ? 'font-medium text-accent-green' : 'font-medium text-accent-red'}>
              {allPassed ? 'All checks passed' : 'Issues remain'}
            </p>
          </div>
        </div>
      </div>

      {/* Finalize button */}
      <div className="flex justify-center">
        <button
          onClick={handleFinalize}
          disabled={finalizeMutation.isPending || !allPassed}
          className="flex items-center gap-2 rounded-md bg-accent-green px-8 py-3 text-body font-semibold text-white hover:bg-accent-green/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {finalizeMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Finalizing...</>
          ) : (
            <><Check className="h-4 w-4" /> Finalize Proposal</>
          )}
        </button>
      </div>

      {!allPassed && (
        <p className="text-center text-caption text-accent-red">
          Please resolve all compliance failures before finalizing.
        </p>
      )}
    </div>
  )
}
