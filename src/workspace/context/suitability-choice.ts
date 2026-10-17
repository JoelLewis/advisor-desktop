import type { ProposalViolation } from '@/services/oms'
import type { ProposalVersion } from '@/types/workspace-proposal'
import { SUITABILITY_REASONS, bandText, reasonLabel, wholeAfterText, type SuitabilityReasonId } from '@/lib/suitability'

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

/** The three reasons, each in full. The accounts-as-a-whole reason is offered only where the whole sits within the band; the engine refuses it otherwise. */
export const reasonOptions = (check: ToleranceCheck): { value: SuitabilityReasonId; label: string; disabled: boolean }[] =>
  SUITABILITY_REASONS.map((r) => ({ value: r, label: reasonLabel(r, check.clientName), disabled: r === 'accounts_within_tolerance' && !wholeWithin(check) }))

/**
 * Where the client's accounts as a whole sit after the proposal, beside today, the figure the choice rests on:
 * "Robert Johnson's accounts as a whole: 46 pts after this proposal, from 51 pts today, within Moderate, 41–55 pts."
 * Outside the band, it is the stronger warning.
 */
export function wholeAfterSentence(check: ToleranceCheck): string {
  const figure = `${check.clientName}'s accounts as a whole: ${wholeAfterText(check.wholeAfterScore, check.wholeTodayScore)}`
  const band = bandText({ toleranceBand: check.toleranceBand, floor: check.floor, ceiling: check.ceiling })
  const noneChosen = 'No reason is chosen for you: record why this account is still suitable.'
  switch (check.wholeAfterStatus) {
    case 'within': return `${figure}, within ${band}.`
    case 'above': return `${figure}, above ${band}. ${noneChosen}`
    case 'below': return `${figure}, below ${band}. ${noneChosen}`
  }
}
