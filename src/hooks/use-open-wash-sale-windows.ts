import { useQuery } from '@tanstack/react-query'
import { getOpenWashSaleWindows } from '@/services/custodian'

export function useOpenWashSaleWindows(accountId: string) {
  return useQuery({
    queryKey: ['open-wash-sale-windows', accountId],
    queryFn: () => getOpenWashSaleWindows(accountId),
    enabled: !!accountId,
  })
}
