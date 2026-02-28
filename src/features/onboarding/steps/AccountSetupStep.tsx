import { cn } from '@/lib/utils'
import { useAccountRequirements } from '@/hooks/use-onboarding'
import { Skeleton } from '@/components/ui/Skeleton'
import type { AccountTypeOption } from '@/types/onboarding'


type AccountSetupStepProps = {
  selectedType: AccountTypeOption | null
  fields: Record<string, string>
  onSelectType: (type: AccountTypeOption) => void
  onFieldChange: (name: string, value: string) => void
}

export function AccountSetupStep({ selectedType, fields, onSelectType, onFieldChange }: AccountSetupStepProps) {
  const { data: requirements, isLoading } = useAccountRequirements()

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
  }

  if (!requirements) return <div className="py-8 text-center text-caption text-text-tertiary">Unable to load account requirements</div>

  const selectedReq = requirements.find((r) => r.accountType === selectedType)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h3 text-text-primary">Account Setup</h3>
        <p className="mt-1 text-caption text-text-secondary">
          Select the account type and fill in any additional required information.
        </p>
      </div>

      {/* Account type selection */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {requirements.map((req) => (
          <button
            key={req.accountType}
            onClick={() => onSelectType(req.accountType)}
            className={cn(
              'rounded-lg border p-4 text-left transition-colors',
              selectedType === req.accountType
                ? 'border-accent-blue bg-accent-blue/5 ring-1 ring-accent-blue'
                : 'border-border-primary hover:bg-surface-tertiary',
            )}
          >
            <p className="text-body-strong text-text-primary">{req.label}</p>
            <p className="mt-1 text-[10px] text-text-tertiary">{req.requiredDocuments.length} documents required</p>
          </button>
        ))}
      </div>

      {/* Additional fields for selected type */}
      {selectedReq && selectedReq.additionalFields.length > 0 && (
        <div className="rounded-lg border border-border-primary bg-surface-primary p-4">
          <p className="mb-4 text-body-strong text-text-primary">Additional Information for {selectedReq.label}</p>
          <div className="grid grid-cols-2 gap-4">
            {selectedReq.additionalFields.map((field) => (
              <div key={field.name}>
                <label htmlFor={`acct-field-${field.name}`} className="mb-1 block text-caption font-medium text-text-secondary">
                  {field.label} {field.required && '*'}
                </label>
                {field.type === 'select' ? (
                  <select
                    id={`acct-field-${field.name}`}
                    value={fields[field.name] ?? ''}
                    onChange={(e) => onFieldChange(field.name, e.target.value)}
                    className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`acct-field-${field.name}`}
                    type={field.type}
                    value={fields[field.name] ?? ''}
                    onChange={(e) => onFieldChange(field.name, e.target.value)}
                    className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required documents preview */}
      {selectedReq && (
        <div className="rounded-lg border border-border-primary bg-surface-tertiary/50 p-4">
          <p className="text-caption font-medium text-text-secondary">Required Documents for {selectedReq.label}:</p>
          <ul className="mt-2 space-y-1">
            {selectedReq.requiredDocuments.map((doc) => (
              <li key={doc} className="flex items-center gap-2 text-caption text-text-secondary">
                <span className="h-1 w-1 rounded-full bg-text-tertiary" />
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
