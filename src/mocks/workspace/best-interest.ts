import type { BestInterestAlternative, BestInterestDraft } from '@/types/workspace-prospect'
import { inKindVsModelLine, type ProspectVersionContent } from '@/mocks/agents/prospect-proposal-agent'
import { modelDisplayName } from '@/mocks/handlers/pms'
import { bandFor, lowerRiskBand } from '@/lib/risk-profile'
import { clientMoney, fmtWeight } from '@/kit/measure'
import { modelMix } from './prospect-model'

export const ROLLOVER_LINE = 'Rollover of the former employer 403(b): asked about; comparison to follow.'

/** Firm only: what the approval of this version will file, before the advisor's own rationale is added. */
export function bestInterestDraftOf(v: ProspectVersionContent): BestInterestDraft {
  const band = bandFor(v.score)
  const lower = lowerRiskBand(band)
  const stocks = (modelId: string) => `${fmtWeight(modelMix(modelId).stocks)}%`
  const alternatives: BestInterestAlternative[] = [
    ...(lower ? [{
      kind: 'lower_risk_model' as const, name: modelDisplayName(lower.modelId), annualFee: v.fees.annual,
      why: `Considered ${modelDisplayName(lower.modelId)}, the firm's model one band less risky (${stocks(lower.modelId)} in stocks against ${stocks(v.modelId)}). Her answers score ${v.score}, inside the ${band.label} band (${band.floor}–${band.ceiling}); the lower-risk model holds less in stocks than her answers support. The fee is the same.`,
    }] : []),
    {
      kind: 'self_directed', name: 'Staying self-directed', annualFee: 0,
      why: `Considered leaving her accounts where they are, with no advisory fee. She asked for advice on ${v.concentration ? `the ${v.concentration.name} concentration` : 'her holdings'} and on the 403(b), and for a managed model portfolio; the fee of ${clientMoney(v.fees.annual)} a year pays for that advice.`,
    },
  ]
  return {
    profileLabel: v.profileLabel, score: v.score, modelId: v.modelId, modelName: v.modelName, alternatives,
    costs: { scheduleName: v.fees.scheduleName, annualFee: v.fees.annual, blendedRate: v.fees.blendedRate },
    ...(v.concentration ? { concentration: { symbol: v.concentration.symbol, name: v.concentration.name, weightOfAssets: v.concentration.weightOfAssets, unrealized: v.concentration.unrealized, taxIfSoldNow: v.concentration.taxIfSoldNow } } : {}),
    inKindVsModel: inKindVsModelLine(v, 'she'),
    rollover: ROLLOVER_LINE,
  }
}
