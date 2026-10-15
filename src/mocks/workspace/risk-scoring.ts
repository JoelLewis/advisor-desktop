import type { RiskAnswer } from '@/types/onboarding'
import type { ProfileResult, ProspectRecord } from '@/types/workspace-prospect'
import { riskQuestions } from '@/mocks/data/onboarding'
import { modelDisplayName } from '@/mocks/handlers/pms'
import { bandFor } from '@/lib/risk-profile'

/** Every question answered once, inside its options: the rounded average of the option scores, read through the firm's table. */
export function scoreAnswers(answers: readonly RiskAnswer[]): { ok: true; result: ProfileResult } | { ok: false; message: string } {
  const ids = answers.map((a) => a.questionId)
  if (ids.length !== riskQuestions.length || new Set(ids).size !== ids.length || riskQuestions.some((q) => !ids.includes(q.id))) {
    return { ok: false, message: 'Answer every question once.' }
  }
  let total = 0
  for (const answer of answers) {
    const option = Number.isInteger(answer.selectedOption) ? riskQuestions.find((q) => q.id === answer.questionId)?.options[answer.selectedOption] : undefined
    if (!option) return { ok: false, message: `${answer.questionId} has no option ${answer.selectedOption}.` }
    total += option.score
  }
  const score = Math.round(total / answers.length)
  const band = bandFor(score)
  return { ok: true, result: { score, profileLabel: band.label, floor: band.floor, ceiling: band.ceiling, modelId: band.modelId, modelName: modelDisplayName(band.modelId) } }
}

export function profileOf(record: ProspectRecord): ProfileResult | undefined {
  if (!record.questionnaire) return undefined
  const scored = scoreAnswers(record.questionnaire.answers)
  if (!scored.ok) throw new Error(`The answers on file for ${record.id} do not score: ${scored.message}`)
  return scored.result
}
