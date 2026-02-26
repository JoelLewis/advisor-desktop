import { http, HttpResponse, delay } from 'msw'
import { riskQuestions, accountRequirements } from '../data/onboarding'
import type { RiskResult, OnboardingApplication } from '@/types/onboarding'

function calculateRiskProfile(answers: { questionId: string; selectedOption: number }[]): RiskResult {
  const totalScore = answers.reduce((sum, a) => {
    const question = riskQuestions.find((q) => q.id === a.questionId)
    if (!question || a.selectedOption >= question.options.length) return sum
    return sum + (question.options[a.selectedOption]?.score ?? 0)
  }, 0)

  const avgScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 50

  if (avgScore <= 25) return { score: avgScore, profile: 'conservative', label: 'Conservative', recommendedModel: 'Conservative Income (20/80)' }
  if (avgScore <= 40) return { score: avgScore, profile: 'moderate_conservative', label: 'Moderate Conservative', recommendedModel: 'Balanced Conservative (40/60)' }
  if (avgScore <= 55) return { score: avgScore, profile: 'moderate', label: 'Moderate', recommendedModel: 'Balanced Growth (60/40)' }
  if (avgScore <= 75) return { score: avgScore, profile: 'moderate_aggressive', label: 'Moderate Aggressive', recommendedModel: 'Growth (75/25)' }
  return { score: avgScore, profile: 'aggressive', label: 'Aggressive', recommendedModel: 'Aggressive Growth (90/10)' }
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
      applicationId: `app-${Date.now()}`,
      workflowTrackerId: `wf-onboard-${Date.now()}`,
      message: `Onboarding application submitted for ${body.clientInfo.firstName} ${body.clientInfo.lastName}. A process tracker has been created in Workflow Center.`,
    })
  }),
]
