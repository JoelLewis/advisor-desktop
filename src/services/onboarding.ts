import { get, post } from './api-client'
import type { RiskQuestion, RiskResult, RiskAnswer, AccountRequirement, OnboardingApplication } from '@/types/onboarding'

export function getRiskQuestions() {
  return get<RiskQuestion[]>('/onboarding/risk-questions')
}

export function calculateRisk(answers: RiskAnswer[]) {
  return post<RiskResult>('/onboarding/calculate-risk', { answers })
}

export function getAccountRequirements() {
  return get<AccountRequirement[]>('/onboarding/account-requirements')
}

export function submitOnboarding(application: OnboardingApplication) {
  return post<{ success: boolean; applicationId: string; workflowTrackerId: string; message: string }>(
    '/onboarding/submit',
    application,
  )
}
