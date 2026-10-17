import type { ProposalViolation } from '@/services/oms'
import type { ProposalVersion } from '@/types/workspace-proposal'
import { SUITABILITY_REASONS, bandText, reasonLabel, type SuitabilityReasonId } from '@/lib/suitability'
import { fmtPoints } from '@/kit/measure'

export type ToleranceCheck = NonNullable<ProposalViolation['tolerance']>

/** The version's model-above-tolerance check, if it carries one. The engine's own helper lives in src/mocks, which the UI never imports. */
export function toleranceCheckOf(version: ProposalVersion): ToleranceCheck | undefined {
  const check = version.pretrade.violations.find((v) => v.category === 'model_above_tolerance')
  if (check && !check.tolerance) throw new Error(`v${version.n}'s tolerance check carries no tolerance`)
  return check?.tolerance
}

const wholeWithin = (check: ToleranceCheck) => check.wholeAfterStatus === 'within'

/** The reason chosen for the advisor: the accounts-as-a-whole reason where it holds, none where the whole sits outside too. */
export const preselectedReason = (check: ToleranceCheck): SuitabilityReasonId | '' => (wholeWithin(check) ? 'accounts_within_tolerance' : '')

/** The reasons offered: the accounts-as-a-whole reason only where the whole sits within the band; the engine refuses it otherwise. */
export const reasonOptions = (check: ToleranceCheck): { value: string; label: string }[] => [
  { value: '', label: 'Choose a reason' },
  ...SUITABILITY_REASONS
    .filter((r) => r !== 'accounts_within_tolerance' || wholeWithin(check))
    .map((r) => ({ value: r, label: reasonLabel(r, check.clientName) })),
]

/** Where the client's accounts as a whole sit after the proposal, the figure the choice rests on. Outside the band, it is the stronger warning. */
export function wholeAfterSentence(check: ToleranceCheck): string {
  const accounts = `${check.clientName}'s accounts as a whole`
  const score = `${fmtPoints(check.wholeAfterScore)} pts`
  const band = bandText({ toleranceBand: check.toleranceBand, floor: check.floor, ceiling: check.ceiling })
  switch (check.wholeAfterStatus) {
    case 'within': return `After this proposal, ${accounts} sit at ${score}, within ${band}.`
    case 'above': return `After this proposal, ${accounts} would sit above the tolerance too, at ${score} against ${band}. No reason is chosen for you: record why this account is still suitable.`
    case 'below': return `After this proposal, ${accounts} would sit below the tolerance, at ${score} against ${band}. No reason is chosen for you: record why this account is still suitable.`
  }
}
