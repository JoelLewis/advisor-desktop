import { useParams } from 'react-router-dom'
import { useProposal } from '@/hooks/use-workspace'
import { LiveThreadFeed } from '@/workspace/thread/LiveThreadFeed'

/** The proposal's team thread, live beside the workbench. */
export function WorkbenchThreadColumn() {
  const { proposalId } = useParams()
  if (!proposalId) throw new Error('The workbench needs a proposal id')
  const proposal = useProposal(proposalId)
  if (proposal.isPending) return <p role="status" className="text-body text-ink-3">Loading the thread…</p>
  if (proposal.isError) return null
  return <LiveThreadFeed threadId={proposal.data.threadId} />
}
