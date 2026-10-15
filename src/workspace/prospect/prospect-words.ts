import type { PresenterPath } from '@/types/workspace'
import type { DisclosureDocument, OnboardingItemStatus, ProspectStage } from '@/types/workspace-prospect'

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

/** The archive's short note of how the one presenter made a record that names someone else. */
export const PATH_NOTE: Readonly<Record<PresenterPath, string>> = {
  shortcut: 'via the presenter shortcut', view_as: 'via the presenter, viewing as her', scripted: 'via a scripted clock jump',
}

export const DISCLOSURE_SHORT: Readonly<Record<DisclosureDocument, string>> = {
  form_crs: 'Form CRS', adv_2a: 'ADV Part 2A', adv_2b: 'ADV Part 2B', privacy_notice: 'privacy notice',
}

/** When each document is due. Form CRS and ADV 2A timing is the firm's own policy (an adviser's Form CRS trigger is the advisory contract, Rule 204-5), and says so. */
export const DISCLOSURE_TIMING: Readonly<Record<DisclosureDocument, string>> = {
  form_crs: 'Firm policy: before or at the first recommendation', adv_2a: 'Firm policy: with the proposal, unless delivered before',
  adv_2b: 'At onboarding', privacy_notice: 'At onboarding',
}

/** What the presenter starts from when recording the coffee; it is Adrian's note and he may change any of it. */
export const COFFEE_NOTE_DRAFT =
  "Coffee with Dr. Pell after James Thompson's introduction. She holds a taxable brokerage account at Fidelity, with a large, low-basis Stryker position from early in her career, and a 403(b) from her former hospital employer. She asked about rolling over the 403(b); I said a comparison would follow. I gave her the risk questionnaire and asked for her statements."

/** What the presenter starts from when approving; it is Adrian's own reasoning and he may change any of it. */
export const RATIONALE_DRAFT =
  'Growth matches her questionnaire and her long horizon. Her Stryker position moves in kind; any sale is staged with her CPA. The 403(b) stays where it is until the comparison.'

export const TRANCHE_OPTIONS: readonly { value: '' | '2' | '3'; label: string }[] = [
  { value: '', label: 'Not staged' }, { value: '2', label: 'Over two tax years' }, { value: '3', label: 'Over three tax years' },
]
