import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { OnboardingApplication } from '@/types/onboarding'

type ReviewStepProps = {
  data: OnboardingApplication
  onComplianceToggle: (field: 'identityVerified' | 'suitabilityDocumented' | 'disclosuresDelivered') => void
}

export function ReviewStep({ data, onComplianceToggle }: ReviewStepProps) {
  const { clientInfo, riskProfile, accountType, documents, complianceChecklist } = data
  const allDocsReceived = documents.filter((d) => d.required).every((d) => d.received)
  const allComplianceMet = complianceChecklist.identityVerified && complianceChecklist.suitabilityDocumented && complianceChecklist.disclosuresDelivered

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h3 text-text-primary">Review & Submit</h3>
        <p className="mt-1 text-caption text-text-secondary">
          Review all information before submitting the onboarding application.
        </p>
      </div>

      {/* Client info summary */}
      <div className="rounded-lg border border-border-primary bg-surface-primary p-4">
        <h4 className="text-body-strong text-text-primary">Client Information</h4>
        <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2">
          <div>
            <span className="text-[10px] text-text-tertiary">Name</span>
            <p className="text-caption text-text-primary">{clientInfo.firstName} {clientInfo.lastName}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-tertiary">Email</span>
            <p className="text-caption text-text-primary">{clientInfo.email}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-tertiary">Phone</span>
            <p className="text-caption text-text-primary">{clientInfo.phone}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-tertiary">Date of Birth</span>
            <p className="text-caption text-text-primary">{clientInfo.dateOfBirth || 'Not provided'}</p>
          </div>
        </div>
      </div>

      {/* Risk profile summary */}
      <div className="rounded-lg border border-border-primary bg-surface-primary p-4">
        <h4 className="text-body-strong text-text-primary">Risk Profile</h4>
        {riskProfile ? (
          <div className="mt-3 flex items-center gap-4">
            <Badge variant="blue">{riskProfile.label}</Badge>
            <span className="text-caption text-text-secondary">Score: {riskProfile.score}/100</span>
            <span className="text-caption text-text-secondary">Model: {riskProfile.recommendedModel}</span>
          </div>
        ) : (
          <p className="mt-2 text-caption text-accent-red">Risk profile not completed</p>
        )}
      </div>

      {/* Account type summary */}
      <div className="rounded-lg border border-border-primary bg-surface-primary p-4">
        <h4 className="text-body-strong text-text-primary">Account Type</h4>
        {accountType ? (
          <p className="mt-2 text-caption text-text-primary">{accountType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
        ) : (
          <p className="mt-2 text-caption text-accent-red">Account type not selected</p>
        )}
      </div>

      {/* Documents summary */}
      <div className="rounded-lg border border-border-primary bg-surface-primary p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-body-strong text-text-primary">Documents</h4>
          {allDocsReceived ? (
            <Badge variant="green">All received</Badge>
          ) : (
            <Badge variant="red">{documents.filter((d) => d.required && !d.received).length} missing</Badge>
          )}
        </div>
        <div className="mt-3 space-y-1">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 text-caption">
              {doc.received ? (
                <Check className="h-3.5 w-3.5 text-accent-green" />
              ) : (
                <X className="h-3.5 w-3.5 text-accent-red" />
              )}
              <span className={doc.received ? 'text-text-secondary' : 'text-accent-red'}>{doc.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance checklist */}
      <div className="rounded-lg border border-accent-purple/30 bg-accent-purple/5 p-4">
        <h4 className="text-body-strong text-accent-purple">Compliance Checklist</h4>
        <p className="mt-1 text-[10px] text-text-tertiary">All items must be confirmed before submission</p>
        <div className="mt-3 space-y-2">
          {([
            { key: 'identityVerified' as const, label: 'Client identity has been verified (KYC)' },
            { key: 'suitabilityDocumented' as const, label: 'Investment suitability has been documented' },
            { key: 'disclosuresDelivered' as const, label: 'All required disclosures have been delivered' },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => onComplianceToggle(item.key)}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                complianceChecklist[item.key]
                  ? 'border-accent-purple bg-accent-purple text-white'
                  : 'border-border-secondary bg-surface-primary',
              )}>
                {complianceChecklist[item.key] && <Check className="h-3 w-3" />}
              </div>
              <span className="text-caption text-text-primary">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Readiness indicator */}
      {!allComplianceMet && (
        <div className="rounded-md bg-amber-50 px-4 py-2 text-caption text-amber-700">
          Complete all compliance checklist items to enable submission.
        </div>
      )}
    </div>
  )
}
