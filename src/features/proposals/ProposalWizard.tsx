import { useState, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TemplateDataStep } from './steps/TemplateDataStep'
import { ReviewEditStep } from './steps/ReviewEditStep'
import { ComplianceStep } from './steps/ComplianceStep'
import { FinalizeStep } from './steps/FinalizeStep'
import { useCreateProposal, useProposal } from '@/hooks/use-proposals'

type WizardStep = 'template_select' | 'review_edit' | 'compliance' | 'finalize'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'template_select', label: 'Template & Data' },
  { id: 'review_edit', label: 'Review & Edit' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'finalize', label: 'Finalize' },
]

function stepIndicatorStyle(stepIndex: number, currentIndex: number): string {
  if (stepIndex < currentIndex) return 'bg-accent-green text-white'
  if (stepIndex === currentIndex) return 'bg-accent-blue text-white'
  return 'bg-surface-tertiary text-text-tertiary'
}

export function ProposalWizard() {
  const { clientId } = useParams<{ clientId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Available for future prospect-to-proposal flow
  void searchParams.get('prospectId')

  const resolvedClientId = clientId ?? ''

  const [step, setStep] = useState<WizardStep>('template_select')
  const [proposalId, setProposalId] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const createProposal = useCreateProposal()
  const { data: proposal, isLoading: proposalLoading } = useProposal(proposalId ?? '')

  const currentStepIndex = STEPS.findIndex((s) => s.id === step)

  const canAdvance = useMemo(() => {
    switch (step) {
      case 'template_select':
        return selectedTemplateId !== null
      case 'review_edit':
        return proposal?.sections.every((s) => s.content.trim() !== '') ?? false
      case 'compliance':
        return (proposal?.complianceChecks.length ?? 0) > 0 &&
          !proposal?.complianceChecks.some((c) => c.status === 'fail')
      case 'finalize':
        return false // finalize step has its own button
      default:
        return false
    }
  }, [step, selectedTemplateId, proposal])

  function goNext() {
    if (step === 'template_select' && selectedTemplateId && !proposalId) {
      // Create the proposal — sections are auto-generated server-side
      createProposal.mutate(
        { templateId: selectedTemplateId, clientId: resolvedClientId },
        {
          onSuccess: (draft) => {
            setProposalId(draft.id)
            setStep('review_edit')
          },
        },
      )
      return
    }
    const nextStep = STEPS[currentStepIndex + 1]
    if (nextStep) setStep(nextStep.id)
  }

  function goPrev() {
    const prevStep = STEPS[currentStepIndex - 1]
    if (prevStep) setStep(prevStep.id)
  }

  function renderStepContent(): React.ReactNode {
    switch (step) {
      case 'template_select':
        return (
          <TemplateDataStep
            clientId={resolvedClientId}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
          />
        )
      case 'review_edit':
        return proposalId ? (
          <ReviewEditStep proposalId={proposalId} />
        ) : null
      case 'compliance':
        return proposalId ? (
          <ComplianceStep proposalId={proposalId} />
        ) : null
      case 'finalize':
        return proposalId ? (
          <FinalizeStep proposalId={proposalId} clientId={resolvedClientId} />
        ) : null
    }
  }

  const isCreating = createProposal.isPending

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-caption text-text-tertiary hover:text-text-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h1 className="text-h3 font-semibold text-text-primary">
          Investment Proposal
        </h1>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-caption font-medium transition-colors',
                stepIndicatorStyle(i, currentStepIndex),
              )}>
                {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                'mt-1.5 text-[10px] font-medium',
                i <= currentStepIndex ? 'text-text-primary' : 'text-text-tertiary',
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'mx-2 h-0.5 w-12 xl:w-16',
                i < currentStepIndex ? 'bg-accent-green' : 'bg-surface-tertiary',
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border-primary bg-surface-primary p-6">
        {proposalLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
          </div>
        ) : (
          renderStepContent()
        )}
      </div>

      {/* Navigation buttons — not shown on finalize step */}
      {step !== 'finalize' && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 rounded-md border border-border-primary px-4 py-2 text-body font-medium text-text-secondary transition-colors hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <button
            onClick={goNext}
            disabled={!canAdvance || isCreating}
            className="flex items-center gap-2 rounded-md bg-accent-blue px-6 py-2 text-body font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating proposal...</>
            ) : (
              <>Next <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
