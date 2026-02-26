type RiskAnswer = {
  questionId: string
  selectedOption: number
}

type RiskQuestion = {
  id: string
  text: string
  options: {
    label: string
    score: number
  }[]
}

type RiskResult = {
  score: number
  profile: 'conservative' | 'moderate_conservative' | 'moderate' | 'moderate_aggressive' | 'aggressive'
  label: string
  recommendedModel: string
}

type AccountTypeOption = 'individual' | 'joint' | 'trust' | 'traditional_ira' | 'roth_ira' | 'entity'

type AccountRequirement = {
  accountType: AccountTypeOption
  label: string
  additionalFields: {
    name: string
    label: string
    type: 'text' | 'date' | 'select'
    required: boolean
    options?: string[]
  }[]
  requiredDocuments: string[]
}

type DocumentChecklistItem = {
  id: string
  name: string
  required: boolean
  received: boolean
}

type OnboardingApplication = {
  clientInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
    dateOfBirth: string
  }
  riskProfile: RiskResult | null
  riskAnswers: RiskAnswer[]
  accountType: AccountTypeOption | null
  accountFields: Record<string, string>
  documents: DocumentChecklistItem[]
  complianceChecklist: {
    identityVerified: boolean
    suitabilityDocumented: boolean
    disclosuresDelivered: boolean
  }
  prospectId?: string
}

export type {
  RiskAnswer,
  RiskQuestion,
  RiskResult,
  AccountTypeOption,
  AccountRequirement,
  DocumentChecklistItem,
  OnboardingApplication,
}
