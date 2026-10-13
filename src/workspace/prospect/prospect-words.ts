import type { PresenterPath } from '@/types/workspace'
import type { OnboardingItemStatus, ProspectStage } from '@/types/workspace-prospect'

export const STAGE_WORDS: Readonly<Record<ProspectStage, string>> = {
  contact: 'Contact', discovery: 'Discovery', proposal: 'Proposal sent', accepted: 'Accepted', onboarding: 'Onboarding',
}

export const ONBOARDING_STATUS_WORDS: Readonly<Record<OnboardingItemStatus, string>> = {
  open: 'Open', awaiting_signature: 'Awaiting her signature', delivered: 'Delivered', not_started: 'Not started',
}

/** The firm-only line that says how the one presenter performed a step recorded as someone else. */
export const PATH_WORDS: Readonly<Record<PresenterPath, (presenterName: string) => string>> = {
  shortcut: (name) => `Demo · recorded through the presenter shortcut by ${name}`,
  view_as: (name) => `Demo · performed by ${name} viewing as the prospect`,
  scripted: (name) => `Demo · a scripted step, run by ${name} on a clock jump`,
}
