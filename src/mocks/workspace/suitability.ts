import type { Account } from '@/types/account'
import type { HouseholdStatus } from '@/types/reference-risk'
import type { PreTradeCheckProposalResult, ProposalViolation } from '@/services/oms'
import { GLIDE_PATH_MODELS } from '@/mocks/data/model-governance'
import { modelDisplayName } from '@/mocks/handlers/pms'
import { modelVolatility } from '@/mocks/reference/models'
import { riskScoreOf } from '@/mocks/reference/risk-score'
import { clientOf, householdRiskOf } from '@/mocks/reference/risk'
import { RISK_PROFILE_TABLE, bandFor, type ProfileBand } from '@/lib/risk-profile'
import { fmtPoints } from '@/kit/measure'

export type ToleranceGap = {
  modelName: string; modelBand: ProfileBand; modelScore: number; clientName: string; tolerance: ProfileBand
  /** The client's household (`householdRiskOf`) against the same band. */
  household: { score: number; status: HouseholdStatus }
}

const rankOf = (band: ProfileBand) => RISK_PROFILE_TABLE.findIndex((b) => b.profile === band.profile)

/**
 * Whether the account's model sits in a riskier band than its client's tolerance, and where the client's
 * household sits against that band. The model's band is its σ on the questionnaire's scale (`riskScoreOf`),
 * read through the same table as the client's score. A glide path changes its mix by design and a custom
 * mandate has no model, so neither is measured.
 */
export function modelAboveTolerance(account: Account): ToleranceGap | undefined {
  if (account.mandate !== 'model' || GLIDE_PATH_MODELS.has(account.modelId)) return undefined
  const client = clientOf(account)
  const modelScore = riskScoreOf(modelVolatility(account.modelId))
  const modelBand = bandFor(modelScore)
  const tolerance = bandFor(client.riskProfile.score)
  if (rankOf(modelBand) <= rankOf(tolerance)) return undefined
  const household = householdRiskOf(client.id)
  if (!household) throw new Error(`${account.id} is measured, yet ${client.id} has no household score`)
  const { score, status } = household.posture
  if (status === 'glide_path') throw new Error(`The household of ${client.id} carries a glide-path status`)
  return { modelName: modelDisplayName(account.modelId), modelBand, modelScore, clientName: client.fullName, tolerance, household: { score, status } }
}

const HOUSEHOLD_WORDS: Readonly<Record<HouseholdStatus, string>> = {
  within: '; the household as a whole is within it',
  above: ', and the household as a whole is above it too',
  below: '; the household as a whole is below it',
}

/** What the check says of the model: "sits above Robert Johnson's Moderate tolerance for this account; the household as a whole is within it". */
export const tolerancePhrase = (clientName: string, tolerance: string, household: HouseholdStatus): string =>
  `sits above ${clientName}'s ${tolerance} tolerance for this account${HOUSEHOLD_WORDS[household]}`

/** The check in words, the same on the pre-trade list, in the agents' claims and on the Brief. Digit-free when the model's name is. */
export const toleranceLine = (model: string, clientName: string, tolerance: string, household: HouseholdStatus): string =>
  `${model} ${tolerancePhrase(clientName, tolerance, household)}`

function toleranceViolation(gap: ToleranceGap): ProposalViolation {
  const pts = (n: number) => `${fmtPoints(n)} pts`
  const band = `${fmtPoints(gap.tolerance.floor)}–${pts(gap.tolerance.ceiling)}`
  return {
    category: 'model_above_tolerance',
    constraint: "Model above the client's risk tolerance",
    severity: 'warning',
    currentValue: `${gap.modelBand.label}, ${pts(gap.modelScore)}`,
    limit: `${gap.tolerance.label}, ${band}`,
    message: `${toleranceLine(gap.modelName, gap.clientName, gap.tolerance.label, gap.household.status)}. `
      + `The model scores ${pts(gap.modelScore)} and the household ${pts(gap.household.score)}, against a ${gap.tolerance.label} band of ${band}. `
      + 'Approving it needs a suitability reason.',
    legs: [],
    preExisting: true,
    tolerance: {
      modelName: gap.modelName, modelBand: gap.modelBand.label, modelScore: gap.modelScore, clientName: gap.clientName,
      toleranceBand: gap.tolerance.label, floor: gap.tolerance.floor, ceiling: gap.tolerance.ceiling,
      householdScore: gap.household.score, householdStatus: gap.household.status,
    },
  }
}

/** A proposal's pre-trade results with the tolerance check added. `evaluateProposal` itself, shared with the trade ticket, is untouched. */
export function withSuitability(result: PreTradeCheckProposalResult, account: Account): PreTradeCheckProposalResult {
  const gap = modelAboveTolerance(account)
  return gap ? { ...result, violations: [...result.violations, toleranceViolation(gap)] } : result
}

export const needsSuitabilityReason = (pretrade: PreTradeCheckProposalResult): boolean =>
  pretrade.violations.some((v) => v.category === 'model_above_tolerance')
