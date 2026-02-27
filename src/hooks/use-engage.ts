import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCampaigns, getSocialOpportunities, getNewsletters, getAllClientComms,
  composeEmail, logCall, createCampaign, updateCampaignStatus,
  scheduleSocialPost, requestSocialApproval,
} from '@/services/engage'
import type { ComposeEmailRequest, LogCallRequest, CreateCampaignRequest } from '@/types/engage'

export function useCampaigns() {
  return useQuery({
    queryKey: ['engage', 'campaigns'],
    queryFn: getCampaigns,
  })
}

export function useSocialOpportunities() {
  return useQuery({
    queryKey: ['engage', 'social'],
    queryFn: getSocialOpportunities,
  })
}

export function useNewsletters() {
  return useQuery({
    queryKey: ['engage', 'newsletters'],
    queryFn: getNewsletters,
  })
}

export function useAllClientComms() {
  return useQuery({
    queryKey: ['engage', 'comms'],
    queryFn: getAllClientComms,
  })
}

export function useComposeEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ComposeEmailRequest) => composeEmail(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engage', 'comms'] }),
  })
}

export function useLogCall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LogCallRequest) => logCall(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engage', 'comms'] }),
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => createCampaign(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engage', 'campaigns'] }),
  })
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateCampaignStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engage', 'campaigns'] }),
  })
}

export function useScheduleSocialPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => scheduleSocialPost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engage', 'social'] }),
  })
}

export function useRequestSocialApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => requestSocialApproval(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engage', 'social'] }),
  })
}
