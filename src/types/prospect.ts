type ProspectStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'onboarding'

type ProspectActivity = {
  id: string
  type: 'call' | 'email' | 'meeting' | 'note'
  description: string
  date: string
}

type Prospect = {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  estimatedAUM: number
  source: 'referral' | 'event' | 'website' | 'cold_outreach' | 'existing_client'
  stage: ProspectStage
  probability: number
  assignedAdvisor: string
  nextAction: string
  nextActionDate: string
  activities: ProspectActivity[]
  createdAt: string
  notes?: string
}

export type { Prospect, ProspectStage, ProspectActivity }
