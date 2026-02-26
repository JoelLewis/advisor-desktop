import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClientInfoStep } from './steps/ClientInfoStep'
import { RiskProfileStep } from './steps/RiskProfileStep'
import { AccountSetupStep } from './steps/AccountSetupStep'
import { DocumentsStep } from './steps/DocumentsStep'
import { ReviewStep } from './steps/ReviewStep'
import { useCalculateRisk, useAccountRequirements, useSubmitOnboarding } from '@/hooks/use-onboarding'
import type { OnboardingApplication, AccountTypeOption, RiskAnswer, DocumentChecklistItem } from '@/types/onboarding'

type WizardStep = 'client_info' | 'risk_profile' | 'account_setup' | 'documents' | 'review'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'client_info', label: 'Client Info' },
  { id: 'risk_profile', label: 'Risk Profile' },
  { id: 'account_setup', label: 'Account Setup' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
]

function createEmptyApplication(prospectId?: string): OnboardingApplication {
  return {
    clientInfo: { firstName: '', lastName: '', email: '', phone: '', address: '', dateOfBirth: '' },
    riskProfile: null,
    riskAnswers: [],
    accountType: null,
    accountFields: {},
    documents: [],
    complianceChecklist: { identityVerified: false, suitabilityDocumented: false, disclosuresDelivered: false },
    prospectId,
  }
}

function stepIndicatorStyle(stepIndex: number, currentIndex: number): string {
  if (stepIndex < currentIndex) return 'bg-accent-green text-white'
  if (stepIndex === currentIndex) return 'bg-accent-blue text-white'
  return 'bg-surface-tertiary text-text-tertiary'
}

export function OnboardingWizard() {
  const { prospectId } = useParams<{ prospectId?: string }>()
  const navigate = useNavigate()

  const [step, setStep] = useState<WizardStep>('client_info')
  const [data, setData] = useState<OnboardingApplication>(() => createEmptyApplication(prospectId))
  const [submitted, setSubmitted] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{ applicationId: string; message: string } | null>(null)

  const calculateRisk = useCalculateRisk()
  const { data: accountRequirements } = useAccountRequirements()
  const submitMutation = useSubmitOnboarding()

  const currentStepIndex = STEPS.findIndex((s) => s.id === step)

  const canAdvance = useMemo(() => {
    switch (step) {
      case 'client_info':
        return data.clientInfo.firstName.trim() !== '' && data.clientInfo.lastName.trim() !== '' && data.clientInfo.email.trim() !== ''
      case 'risk_profile':
        return data.riskProfile !== null
      case 'account_setup':
        return data.accountType !== null
      case 'documents':
        return data.documents.filter((d) => d.required).every((d) => d.received)
      case 'review':
        return data.complianceChecklist.identityVerified && data.complianceChecklist.suitabilityDocumented && data.complianceChecklist.disclosuresDelivered
      default:
        return false
    }
  }, [step, data])

  const handleRiskAnswer = useCallback((questionId: string, selectedOption: number) => {
    setData((prev) => {
      const answers = prev.riskAnswers.filter((a) => a.questionId !== questionId)
      const newAnswers: RiskAnswer[] = [...answers, { questionId, selectedOption }]

      if (newAnswers.length >= 8) {
        calculateRisk.mutate(newAnswers, {
          onSuccess: (result) => {
            setData((d) => ({ ...d, riskProfile: result }))
          },
        })
      }

      return { ...prev, riskAnswers: newAnswers }
    })
  }, [calculateRisk])

  const handleSelectAccountType = useCallback((type: AccountTypeOption) => {
    const req = accountRequirements?.find((r) => r.accountType === type)
    const docs: DocumentChecklistItem[] = req
      ? req.requiredDocuments.map((name, i) => ({
          id: `doc-${type}-${i}`,
          name,
          required: true,
          received: false,
        }))
      : []

    setData((prev) => ({ ...prev, accountType: type, accountFields: {}, documents: docs }))
  }, [accountRequirements])

  const handleToggleDocument = useCallback((docId: string) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === docId ? { ...d, received: !d.received } : d,
      ),
    }))
  }, [])

  const handleComplianceToggle = useCallback((field: 'identityVerified' | 'suitabilityDocumented' | 'disclosuresDelivered') => {
    setData((prev) => ({
      ...prev,
      complianceChecklist: { ...prev.complianceChecklist, [field]: !prev.complianceChecklist[field] },
    }))
  }, [])

  function goNext() {
    const nextStep = STEPS[currentStepIndex + 1]
    if (nextStep) setStep(nextStep.id)
  }

  function goPrev() {
    const prevStep = STEPS[currentStepIndex - 1]
    if (prevStep) setStep(prevStep.id)
  }

  function handleSubmit() {
    submitMutation.mutate(data, {
      onSuccess: (result) => {
        setSubmitted(true)
        setSubmissionResult({ applicationId: result.applicationId, message: result.message })
      },
    })
  }

  if (submitted && submissionResult) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center rounded-xl border border-accent-green/30 bg-accent-green/5 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-green">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-h2 text-text-primary">Onboarding Submitted</h2>
          <p className="mt-3 max-w-md text-body text-text-secondary">{submissionResult.message}</p>
          <p className="mt-2 text-caption text-text-tertiary">Application ID: {submissionResult.applicationId}</p>
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => navigate('/workflows')}
              className="rounded-md bg-accent-blue px-4 py-2 text-body font-medium text-white transition-colors hover:bg-accent-blue/90"
            >
              View in Workflow Center
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-md border border-border-primary px-4 py-2 text-body font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderStepContent(): React.ReactNode {
    switch (step) {
      case 'client_info':
        return <ClientInfoStep data={data} onChange={setData} />
      case 'risk_profile':
        return <RiskProfileStep answers={data.riskAnswers} result={data.riskProfile} onAnswer={handleRiskAnswer} />
      case 'account_setup':
        return (
          <AccountSetupStep
            selectedType={data.accountType}
            fields={data.accountFields}
            onSelectType={handleSelectAccountType}
            onFieldChange={(name, value) => setData((prev) => ({ ...prev, accountFields: { ...prev.accountFields, [name]: value } }))}
          />
        )
      case 'documents':
        return <DocumentsStep documents={data.documents} onToggle={handleToggleDocument} />
      case 'review':
        return <ReviewStep data={data} onComplianceToggle={handleComplianceToggle} />
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
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
                'mx-2 h-0.5 w-16',
                i < currentStepIndex ? 'bg-accent-green' : 'bg-surface-tertiary',
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border-primary bg-surface-primary p-6">
        {renderStepContent()}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-2 rounded-md border border-border-primary px-4 py-2 text-body font-medium text-text-secondary transition-colors hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {step === 'review' ? (
          <button
            onClick={handleSubmit}
            disabled={!canAdvance || submitMutation.isPending}
            className="flex items-center gap-2 rounded-md bg-accent-green px-6 py-2 text-body font-medium text-white transition-colors hover:bg-accent-green/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              <><Check className="h-4 w-4" /> Submit Application</>
            )}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canAdvance}
            className="flex items-center gap-2 rounded-md bg-accent-blue px-6 py-2 text-body font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
