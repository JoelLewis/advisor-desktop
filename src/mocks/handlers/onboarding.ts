import { http, HttpResponse, delay } from 'msw'
import { nextRecordNumber } from './event-clock'
import { modelDisplayName } from './pms'
import { bandFor } from '@/lib/risk-profile'
import { riskQuestions, accountRequirements } from '../data/onboarding'
import type { RiskResult, OnboardingApplication } from '@/types/onboarding'

function calculateRiskProfile(answers: { questionId: string; selectedOption: number }[]): RiskResult {
  const totalScore = answers.reduce((sum, a) => {
    const question = riskQuestions.find((q) => q.id === a.questionId)
    if (!question || a.selectedOption >= question.options.length) return sum
    return sum + (question.options[a.selectedOption]?.score ?? 0)
  }, 0)

  const avgScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 50

  // The firm's one table names the model; the label is the model's own name, never an invented blend.
  const band = bandFor(avgScore)
  return { score: avgScore, profile: band.profile, label: band.label, recommendedModel: modelDisplayName(band.modelId) }
}

export const onboardingHandlers = [
  // GET /api/onboarding/risk-questions
  http.get('/api/onboarding/risk-questions', () => {
    return HttpResponse.json(riskQuestions)
  }),

  // POST /api/onboarding/calculate-risk
  http.post('/api/onboarding/calculate-risk', async ({ request }) => {
    const body = (await request.json()) as { answers: { questionId: string; selectedOption: number }[] }
    const result = calculateRiskProfile(body.answers)
    return HttpResponse.json(result)
  }),

  // GET /api/onboarding/account-requirements
  http.get('/api/onboarding/account-requirements', () => {
    return HttpResponse.json(accountRequirements)
  }),

  // POST /api/onboarding/submit
  http.post('/api/onboarding/submit', async ({ request }) => {
    const body = (await request.json()) as OnboardingApplication
    await delay(800)

    return HttpResponse.json({
      success: true,
      applicationId: `app-${nextRecordNumber()}`,
      workflowTrackerId: `wf-onboard-${nextRecordNumber()}`,
      message: `Onboarding application submitted for ${body.clientInfo.firstName} ${body.clientInfo.lastName}. A process tracker has been created in Workflow Center.`,
    })
  }),
]
