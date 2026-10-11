import { useQuery } from '@tanstack/react-query'
import { getAccount, getTaxLots, getOpenWashSaleWindows } from '@/services/custodian'
import { getDrift, getPositions } from '@/services/pms'
import { previewRebalance } from '@/services/oms'
import { getAlerts, getSupervisionRecords } from '@/services/compliance'

const ACCOUNT_ID = 'acc-002'

async function loadApproval(accountId: string) {
  const alerts = await getAlerts({ status: 'approved' })
  const alert = alerts.find((a) => a.entityId === accountId)
  if (!alert) throw new Error('The engine holds no approved compliance review for this account')
  const records = await getSupervisionRecords(alert.id)
  const record = records.find((r) => r.action === 'Approved')
  if (!record) throw new Error(`The compliance review "${alert.title}" has no approval on record`)
  return { alert, record }
}

async function loadKitData() {
  const [account, positions, drift, lots, windows, previews, approval] = await Promise.all([
    getAccount(ACCOUNT_ID), getPositions(ACCOUNT_ID), getDrift(ACCOUNT_ID), getTaxLots(ACCOUNT_ID),
    getOpenWashSaleWindows(ACCOUNT_ID), previewRebalance({ accountIds: [ACCOUNT_ID], taxAware: true }), loadApproval(ACCOUNT_ID),
  ])
  const preview = previews.find((p) => p.accountId === ACCOUNT_ID)
  if (!preview) throw new Error(`No rebalance preview returned for ${account.name}`)
  return { account, positions, drift, lots, windows, preview, approval }
}

export type KitData = Awaited<ReturnType<typeof loadKitData>>
export type KitState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: KitData }

export function useKitData(): KitState {
  const q = useQuery({ queryKey: ['kit', ACCOUNT_ID], queryFn: loadKitData, staleTime: Infinity })
  if (q.isPending) return { status: 'loading' }
  if (q.isError) return { status: 'error', error: q.error }
  return { status: 'ready', data: q.data }
}
