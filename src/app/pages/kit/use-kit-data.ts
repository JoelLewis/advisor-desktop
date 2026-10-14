import { useQuery } from '@tanstack/react-query'
import { getAccount, getTaxLots, getOpenWashSaleWindows } from '@/services/custodian'
import { getDrift, getPositions } from '@/services/pms'
import { previewRebalance } from '@/services/oms'
import { getAlerts, getSupervisionRecords } from '@/services/compliance'
import { getDirectory, previewAgent } from '@/services/workspace'
import type { Message } from '@/types/workspace'

const ACCOUNT_ID = 'acc-002'
const ADVISOR_ID = 'user-001'
const REVIEW_THREAD_ID = 'th-johnson-review'
const DRIFT_MONITOR = 'drift-monitor'

type AgentFinding = Extract<Message, { kind: 'agent_finding' }>

/** A real Drift Monitor run on the Johnson review thread, previewed read-only: the gallery never writes conversation state. */
async function loadDriftFinding() {
  const [messages, directory] = await Promise.all([previewAgent(ADVISOR_ID, REVIEW_THREAD_ID, DRIFT_MONITOR), getDirectory(ADVISOR_ID)])
  const finding = messages.find((m): m is AgentFinding => m.kind === 'agent_finding' && m.agentId === DRIFT_MONITOR)
  if (!finding) throw new Error(`The Drift Monitor preview on ${REVIEW_THREAD_ID} produced no finding`)
  const agent = directory.agents.find((a) => a.id === DRIFT_MONITOR)
  if (!agent) throw new Error(`No agent "${DRIFT_MONITOR}" in the directory`)
  return { finding, agent }
}

async function loadApproval(accountId: string) {
  const alerts = await getAlerts(ADVISOR_ID, { status: 'approved' })
  const alert = alerts.find((a) => a.entityId === accountId)
  if (!alert) throw new Error('The engine holds no approved compliance review for this account')
  const records = await getSupervisionRecords(ADVISOR_ID, alert.id)
  const record = records.find((r) => r.action === 'Approved')
  if (!record) throw new Error(`The compliance review "${alert.title}" has no approval on record`)
  return { alert, record }
}

async function loadKitData() {
  const [account, positions, drift, lots, windows, previews, approval, agentFinding] = await Promise.all([
    getAccount(ADVISOR_ID, ACCOUNT_ID), getPositions(ADVISOR_ID, ACCOUNT_ID), getDrift(ADVISOR_ID, ACCOUNT_ID), getTaxLots(ADVISOR_ID, ACCOUNT_ID),
    getOpenWashSaleWindows(ADVISOR_ID, ACCOUNT_ID), previewRebalance(ADVISOR_ID, { accountIds: [ACCOUNT_ID], taxAware: true }), loadApproval(ACCOUNT_ID), loadDriftFinding(),
  ])
  const preview = previews.find((p) => p.accountId === ACCOUNT_ID)
  if (!preview) throw new Error(`No rebalance preview returned for ${account.name}`)
  return { account, positions, drift, lots, windows, preview, approval, agentFinding }
}

export type KitData = Awaited<ReturnType<typeof loadKitData>>
export type KitState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: KitData }

export function useKitData(): KitState {
  const q = useQuery({ queryKey: ['kit', ACCOUNT_ID], queryFn: loadKitData, staleTime: Infinity })
  if (q.isPending) return { status: 'loading' }
  if (q.isError) return { status: 'error', error: q.error }
  return { status: 'ready', data: q.data }
}
