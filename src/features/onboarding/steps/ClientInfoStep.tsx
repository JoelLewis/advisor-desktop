import type { OnboardingApplication } from '@/types/onboarding'

type ClientInfoStepProps = {
  data: OnboardingApplication
  onChange: (data: OnboardingApplication) => void
}

export function ClientInfoStep({ data, onChange }: ClientInfoStepProps) {
  const info = data.clientInfo

  function update(field: keyof typeof info, value: string) {
    onChange({
      ...data,
      clientInfo: { ...info, [field]: value },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h3 text-text-primary">Client Information</h3>
        <p className="mt-1 text-caption text-text-secondary">
          Enter the client&apos;s contact information. Fields marked with * are required.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="onboard-first-name" className="mb-1 block text-caption font-medium text-text-secondary">First Name *</label>
          <input
            id="onboard-first-name"
            type="text"
            value={info.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
            placeholder="First name"
          />
        </div>
        <div>
          <label htmlFor="onboard-last-name" className="mb-1 block text-caption font-medium text-text-secondary">Last Name *</label>
          <input
            id="onboard-last-name"
            type="text"
            value={info.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
            placeholder="Last name"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="onboard-email" className="mb-1 block text-caption font-medium text-text-secondary">Email *</label>
          <input
            id="onboard-email"
            type="email"
            value={info.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
            placeholder="email@example.com"
          />
        </div>
        <div>
          <label htmlFor="onboard-phone" className="mb-1 block text-caption font-medium text-text-secondary">Phone *</label>
          <input
            id="onboard-phone"
            type="tel"
            value={info.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div>
        <label htmlFor="onboard-dob" className="mb-1 block text-caption font-medium text-text-secondary">Date of Birth *</label>
        <input
          id="onboard-dob"
          type="date"
          value={info.dateOfBirth}
          onChange={(e) => update('dateOfBirth', e.target.value)}
          className="w-full max-w-xs rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
        />
      </div>

      <div>
        <label htmlFor="onboard-address" className="mb-1 block text-caption font-medium text-text-secondary">Address</label>
        <input
          id="onboard-address"
          type="text"
          value={info.address}
          onChange={(e) => update('address', e.target.value)}
          className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
          placeholder="Street address, City, State ZIP"
        />
      </div>
    </div>
  )
}
