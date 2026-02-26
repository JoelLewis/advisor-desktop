import { useQuery, useMutation } from '@tanstack/react-query'
import { getRiskQuestions, calculateRisk, getAccountRequirements, submitOnboarding } from '@/services/onboarding'
import type { RiskAnswer, OnboardingApplication } from '@/types/onboarding'

export function useRiskQuestions() {
  return useQuery({
    queryKey: ['onboarding', 'risk-questions'],
    queryFn: getRiskQuestions,
  })
}

export function useCalculateRisk() {
  return useMutation({
    mutationFn: (answers: RiskAnswer[]) => calculateRisk(answers),
  })
}

export function useAccountRequirements() {
  return useQuery({
    queryKey: ['onboarding', 'account-requirements'],
    queryFn: getAccountRequirements,
  })
}

export function useSubmitOnboarding() {
  return useMutation({
    mutationFn: (application: OnboardingApplication) => submitOnboarding(application),
  })
}
