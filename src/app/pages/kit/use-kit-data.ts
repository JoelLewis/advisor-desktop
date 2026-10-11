import { useQuery } from '@tanstack/react-query'
import { getAccount, getTaxLots, getOpenWashSaleWindows } from '@/services/custodian'
import { getDrift, getPositions } from '@/services/pms'
import { previewRebalance } from '@/services/oms'

const ACCOUNT_ID = 'acc-002'

async function loadKitData() {
  const [account, positions, drift, lots, windows, previews] = await Promise.all([
    getAccount(ACCOUNT_ID), getPositions(ACCOUNT_ID), getDrift(ACCOUNT_ID), getTaxLots(ACCOUNT_ID),
    getOpenWashSaleWindows(ACCOUNT_ID), previewRebalance({ accountIds: [ACCOUNT_ID], taxAware: true }),
  ])
  const preview = previews.find((p) => p.accountId === ACCOUNT_ID)
  if (!preview) throw new Error(`No rebalance preview returned for ${ACCOUNT_ID}`)
  return { account, positions, drift, lots, windows, preview }
}

export type KitData = Awaited<ReturnType<typeof loadKitData>>
export type KitState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: KitData }

export function useKitData(): KitState {
  const q = useQuery({ queryKey: ['kit', ACCOUNT_ID], queryFn: loadKitData, staleTime: Infinity })
  if (q.isPending) return { status: 'loading' }
  if (q.isError) return { status: 'error', error: q.error }
  return { status: 'ready', data: q.data }
}
