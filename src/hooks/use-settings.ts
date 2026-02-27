import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAISettings, updateAISettings, getNBASettings, updateNBASettings, getNotificationSettings, updateNotificationSettings, getDisplaySettings, updateDisplaySettings, getCustomPrompts, createCustomPrompt, updateCustomPrompt, deleteCustomPrompt, getStandingRules, createStandingRule, updateStandingRule, deleteStandingRule, getDelegationRules, createDelegationRule, updateDelegationRule, deleteDelegationRule, getAIPermissions, updateAIPermissions } from '@/services/settings'
import type { AISettings, NBASettings, NotificationSettings, DisplaySettings, CustomPrompt, DelegationRule } from '@/types/settings'
import type { StandingRule, AIPermissionMatrix } from '@/types/standing-rule'
import type { CurrencyCode } from '@/types/currency'

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

export function useDisplaySettings() {
  return useQuery({
    queryKey: ['settings', 'display'],
    queryFn: getDisplaySettings,
  })
}

export function useUpdateDisplaySettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: DisplaySettings) => updateDisplaySettings(settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'display'] }),
  })
}

/** Convenience hook — returns the user's reporting currency (defaults to USD) */
export function useReportingCurrency(): CurrencyCode {
  const { data } = useDisplaySettings()
  return data?.reportingCurrency ?? 'USD'
}

export function useCustomPrompts() {
  return useQuery({
    queryKey: ['settings', 'ai', 'prompts'],
    queryFn: getCustomPrompts,
  })
}

export function useCreateCustomPrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prompt: Pick<CustomPrompt, 'name' | 'text' | 'category'>) => createCustomPrompt(prompt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'ai', 'prompts'] }),
  })
}

export function useUpdateCustomPrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Pick<CustomPrompt, 'name' | 'text' | 'category'>>) =>
      updateCustomPrompt(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'ai', 'prompts'] }),
  })
}

export function useDeleteCustomPrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCustomPrompt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'ai', 'prompts'] }),
  })
}

// Standing Rules
export function useStandingRules() {
  return useQuery({
    queryKey: ['settings', 'standing-rules'],
    queryFn: getStandingRules,
  })
}

export function useCreateStandingRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rule: Pick<StandingRule, 'name' | 'triggerType' | 'triggerCondition' | 'action' | 'actionDescription'>) =>
      createStandingRule(rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'standing-rules'] }),
  })
}

export function useUpdateStandingRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<StandingRule>) =>
      updateStandingRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'standing-rules'] }),
  })
}

export function useDeleteStandingRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStandingRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'standing-rules'] }),
  })
}

// Delegation Rules
export function useDelegationRules() {
  return useQuery({
    queryKey: ['settings', 'delegation-rules'],
    queryFn: getDelegationRules,
  })
}

export function useCreateDelegationRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rule: Omit<DelegationRule, 'id'>) => createDelegationRule(rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'delegation-rules'] }),
  })
}

export function useUpdateDelegationRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<DelegationRule>) =>
      updateDelegationRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'delegation-rules'] }),
  })
}

export function useDeleteDelegationRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDelegationRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'delegation-rules'] }),
  })
}

// AI Permission Matrix
export function useAIPermissions() {
  return useQuery({
    queryKey: ['settings', 'ai-permissions'],
    queryFn: getAIPermissions,
  })
}

export function useUpdateAIPermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (matrix: AIPermissionMatrix) => updateAIPermissions(matrix),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'ai-permissions'] }),
  })
}
