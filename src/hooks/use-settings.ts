import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAISettings, updateAISettings, getNBASettings, updateNBASettings, getNotificationSettings, updateNotificationSettings } from '@/services/settings'
import type { AISettings, NBASettings, NotificationSettings } from '@/types/settings'

export function useAISettings() {
  return useQuery({
    queryKey: ['settings', 'ai'],
    queryFn: getAISettings,
  })
}

export function useUpdateAISettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: AISettings) => updateAISettings(settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'ai'] }),
  })
}

export function useNBASettings() {
  return useQuery({
    queryKey: ['settings', 'nba'],
    queryFn: getNBASettings,
  })
}

export function useUpdateNBASettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: NBASettings) => updateNBASettings(settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'nba'] }),
  })
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: getNotificationSettings,
  })
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: NotificationSettings) => updateNotificationSettings(settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'notifications'] }),
  })
}
