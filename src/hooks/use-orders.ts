import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, submitRebalance, executeRebalance, submitTrade, preTradeCheck } from '@/services/oms'
import { checkTradeCompliance } from '@/services/compliance'
import type { RebalanceRequest, TradeRequest, PreTradeCheckRequest } from '@/services/oms'
import type { TradeComplianceRequest } from '@/types/compliance'

export function useOrders(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => getOrders(params),
  })
}

export function useAccountOrders(accountId: string) {
  return useQuery({
    queryKey: ['orders', { accountId }],
    queryFn: () => getOrders({ accountId }),
    enabled: !!accountId,
  })
}

export function useRebalancePreview() {
  return useMutation({
    mutationFn: (request: RebalanceRequest) => submitRebalance(request),
  })
}

export function useExecuteRebalance() {
  return useMutation({
    mutationFn: (request: { accountIds: string[]; taxAware: boolean }) => executeRebalance(request),
  })
}

export function useSubmitTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: TradeRequest) => submitTrade(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useTradeComplianceCheck() {
  return useMutation({
    mutationFn: (accounts: TradeComplianceRequest[]) => checkTradeCompliance(accounts),
  })
}

export function usePreTradeCheck() {
  return useMutation({
    mutationFn: (request: PreTradeCheckRequest) => preTradeCheck(request),
  })
}
