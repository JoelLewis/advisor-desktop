export type CampaignChannel = 'email' | 'sms' | 'both'
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'completed'

export type Campaign = {
  id: string
  name: string
  channel: CampaignChannel
  status: CampaignStatus
  nbaTriggered: boolean
  audienceCount: number
  sentCount: number
  openRate: number
  clickRate: number
  complianceApproved: boolean
  scheduledDate?: string
  completedDate?: string
}

export type SocialPlatform = 'linkedin' | 'twitter'
export type SocialType = 'market_commentary' | 'thought_leadership' | 'client_education' | 'firm_update'
export type ComplianceStatus = 'pending' | 'approved' | 'rejected'

export type SocialOpportunity = {
  id: string
  platform: SocialPlatform
  type: SocialType
  title: string
  suggestedContent: string
  complianceStatus: ComplianceStatus
  aiGenerated: boolean
  scheduledDate?: string
}

export type NewsletterStatus = 'draft' | 'scheduled' | 'sent'
export type AudienceSegment = 'all_clients' | 'platinum' | 'gold' | 'prospects' | 'retirees'

export type Newsletter = {
  id: string
  title: string
  status: NewsletterStatus
  audienceSegment: AudienceSegment
  audienceCount: number
  openRate: number
  scheduledDate?: string
  sentDate?: string
}

export type ComposeEmailRequest = {
  clientId: string
  subject: string
  body: string
  complianceReview: boolean
}

export type LogCallRequest = {
  clientId: string
  duration: number
  summary: string
  direction: 'inbound' | 'outbound'
}

export type CreateCampaignRequest = {
  name: string
  channel: CampaignChannel
  audience: string
  message: string
}
