import type { Account } from '@/types/account'
import type { WholeStatus } from '@/types/reference-risk'
import type { PreTradeCheckProposalResult, ProposalViolation } from '@/services/oms'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { holdingsAfterTrades, type HoldingMove, type ProposedTradeLeg } from '@/mocks/handlers/oms'
import { modelDisplayName } from '@/mocks/handlers/pms'
import { clientOf, clientRiskOf, modelScoreOf, scoreOfHoldings } from '@/mocks/reference/risk'
import { bandFor, type ProfileBand } from '@/lib/risk-profile'
import { fmtPoints } from '@/kit/measure'
import { wholeAfterText } from '@/lib/suitability'
import { store } from '@/mocks/data/workspace-store'

export type ToleranceGap = {
  modelName: string; modelBand: ProfileBand; modelScore: number; clientName: string; tolerance: ProfileBand
  /** The client's accounts as a whole (`clientRiskOf`) as they would stand after the legs, against the same band. */
  wholeAfter: { score: number; status: WholeStatus }
  /** The same whole as it stands today, before any leg. */
  wholeToday: number
}

/**
 * Whether the account's model sits in a riskier band than its client's tolerance, and where the client's
 * accounts as a whole would sit once `legs` are traded. One moment: the model is what the proposal moves
 * the account toward, so the whole is read after the proposal too. The model's band is its σ on the
 * questionnaire's scale, read through the same table as the client's score. A glide path changes its mix
 * by design and a custom mandate has no model, so neither is measured.
 */
export function modelAboveTolerance(account: Account, legs: readonly ProposedTradeLeg[], working: readonly HoldingMove[] = []): ToleranceGap | undefined {
  const modelScore = modelScoreOf(account)
  if (modelScore === undefined || account.mandate !== 'model') return undefined
  const client = clientOf(account)
  const tolerance = bandFor(client.riskProfile.score)
  if (modelScore <= tolerance.ceiling) return undefined
  const after = scoreOfHoldings(holdingsAfterTrades(account, getPositionsForAccount(account.id, account.totalValue), [...working, ...legs]))
  const whole = clientRiskOf(client.id, new Map([[account.id, after]]))
  const today = clientRiskOf(client.id)
  if (!whole || !today) throw new Error(`${account.id} is measured, yet ${client.id} has no accounts as a whole`)
  const { score, status } = whole.posture
  if (status === 'glide_path') throw new Error(`${client.id}'s accounts as a whole carry a glide-path status`)
  return {
    modelName: modelDisplayName(account.modelId), modelBand: bandFor(modelScore), modelScore, clientName: client.fullName, tolerance,
    wholeAfter: { score, status }, wholeToday: today.posture.score,
  }
}

/** When the whole is read: after a version's own legs, or after the agents' full rebalance to the model. */
export type WholeMoment = 'proposal' | 'rebalance'
const MOMENT_WORDS: Readonly<Record<WholeMoment, string>> = { proposal: 'after this proposal', rebalance: 'after a full rebalance to the model' }

/** What the check says of the model: "sits above Robert Johnson's Moderate tolerance for this account; after this proposal, Robert Johnson's accounts as a whole would sit within it". */
export function tolerancePhrase(clientName: string, tolerance: string, whole: WholeStatus, moment: WholeMoment): string {
  const base = `sits above ${clientName}'s ${tolerance} tolerance for this account`
  const when = MOMENT_WORDS[moment]
  const accounts = `${clientName}'s accounts as a whole`
  switch (whole) {
    case 'within': return `${base}; ${when}, ${accounts} would sit within it`
    case 'above': return `${base}, and ${when} ${accounts} would sit above it too`
    case 'below': return `${base}; ${when}, ${accounts} would sit below it`
  }
}

/** The check in words, the same on the pre-trade list, in the agents' claims and on the Brief. Digit-free when the model's name is. */
export const toleranceLine = (model: string, clientName: string, tolerance: string, whole: WholeStatus, moment: WholeMoment): string =>
  `${model} ${tolerancePhrase(clientName, tolerance, whole, moment)}`

function toleranceViolation(gap: ToleranceGap): ProposalViolation {
  const pts = (n: number) => `${fmtPoints(n)} pts`
  const band = `${fmtPoints(gap.tolerance.floor)}–${pts(gap.tolerance.ceiling)}`
  return {
    category: 'model_above_tolerance',
    constraint: "Model above the client's risk tolerance",
    severity: 'warning',
    currentValue: `${gap.modelBand.label}, ${pts(gap.modelScore)}`,
    limit: `${gap.tolerance.label}, ${band}`,
    message: `${toleranceLine(gap.modelName, gap.clientName, gap.tolerance.label, gap.wholeAfter.status, 'proposal')}. `
      + `The model scores ${pts(gap.modelScore)} against a ${gap.tolerance.label} band of ${band}; the accounts as a whole read ${wholeAfterText(gap.wholeAfter.score, gap.wholeToday)}. `
      + 'Approving it needs a suitability reason.',
    legs: [],
    preExisting: true,
    tolerance: {
      modelName: gap.modelName, modelBand: gap.modelBand.label, modelScore: gap.modelScore, clientName: gap.clientName,
      toleranceBand: gap.tolerance.label, floor: gap.tolerance.floor, ceiling: gap.tolerance.ceiling,
      wholeAfterScore: gap.wholeAfter.score, wholeAfterStatus: gap.wholeAfter.status, wholeTodayScore: gap.wholeToday,
    },
  }
}

/** A proposal's pre-trade results with the tolerance check added. `evaluateProposal` itself, shared with the trade ticket, is untouched. */
export function withSuitability(result: PreTradeCheckProposalResult, account: Account, legs: readonly ProposedTradeLeg[], working: readonly HoldingMove[] = []): PreTradeCheckProposalResult {
  const gap = modelAboveTolerance(account, legs, working)
  return gap ? { ...result, violations: [...result.violations, toleranceViolation(gap)] } : result
}

/** Accounts whose proposal is approved (or released) with a recorded suitability reason. */
export function suitablyApprovedAccounts(): ReadonlySet<string> {
  const s = store()
  return new Set(s.approvals
    .filter((a) => (a.status === 'active' || a.status === 'released') && a.suitability !== undefined)
    .flatMap((a) => s.proposals.filter((p) => p.id === a.proposalId).map((p) => p.accountId)))
}
