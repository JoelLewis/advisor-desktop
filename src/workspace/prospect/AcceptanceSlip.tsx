import { useActs } from '@/hooks/use-workspace'
import { ActRecordSlip } from '@/workspace/thread/ActRecordSlip'
import type { Directory } from '@/types/workspace'

type Props = { threadId: string; actId: string; directory: Directory }

/** The act that opened the onboarding, recorded in her own thread, shown here as the same record slip the thread and the archive carry. */
export function AcceptanceSlip({ threadId, actId, directory }: Props) {
  const acts = useActs(threadId)
  if (acts.isError) return <p role="alert" className="text-body">{acts.error.message}</p>
  const act = acts.data?.find((a) => a.id === actId)
  if (!act) return <p role="status" className="text-body text-ink-3">Loading her acceptance…</p>
  return <ActRecordSlip act={act} directory={directory} />
}
