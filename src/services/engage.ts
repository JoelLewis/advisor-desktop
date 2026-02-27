import type { Campaign, SocialOpportunity, Newsletter, ComposeEmailRequest, LogCallRequest, CreateCampaignRequest } from '@/types/engage'
import type { ClientComm } from '@/types/client-comms'

type ListResponse<T> = { items: T[]; total: number }

export async function getCampaigns(): Promise<ListResponse<Campaign>> {
  const res = await fetch('/api/engage/campaigns')
  if (!res.ok) throw new Error('Failed to fetch campaigns')
  return res.json()
}

export async function getSocialOpportunities(): Promise<ListResponse<SocialOpportunity>> {
  const res = await fetch('/api/engage/social')
  if (!res.ok) throw new Error('Failed to fetch social opportunities')
  return res.json()
}

export async function getNewsletters(): Promise<ListResponse<Newsletter>> {
  const res = await fetch('/api/engage/newsletters')
  if (!res.ok) throw new Error('Failed to fetch newsletters')
  return res.json()
}

export async function getAllClientComms(): Promise<ListResponse<ClientComm>> {
  const res = await fetch('/api/engage/comms')
  if (!res.ok) throw new Error('Failed to fetch client communications')
  return res.json()
}

export async function composeEmail(data: ComposeEmailRequest): Promise<{ success: boolean }> {
  const res = await fetch('/api/engage/compose-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to send email')
  return res.json()
}

export async function logCall(data: LogCallRequest): Promise<{ success: boolean }> {
  const res = await fetch('/api/engage/log-call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to log call')
  return res.json()
}

export async function createCampaign(data: CreateCampaignRequest): Promise<Campaign> {
  const res = await fetch('/api/engage/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create campaign')
  return res.json()
}

export async function updateCampaignStatus(id: string, status: string): Promise<Campaign> {
  const res = await fetch(`/api/engage/campaigns/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  if (!res.ok) throw new Error('Failed to update campaign')
  return res.json()
}

export async function scheduleSocialPost(id: string): Promise<SocialOpportunity> {
  const res = await fetch(`/api/engage/social/${id}/schedule`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to schedule post')
  return res.json()
}

export async function requestSocialApproval(id: string): Promise<SocialOpportunity> {
  const res = await fetch(`/api/engage/social/${id}/request-approval`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to request approval')
  return res.json()
}
