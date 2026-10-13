import { useParams } from 'react-router-dom'
import { useDirectory, useProposal } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import { useGoHomeWhenHidden } from '@/workspace/full-views/use-go-home-when-hidden'
import { Workbench } from './Workbench'

export function WorkbenchPage() {
  const { proposalId } = useParams()
  if (!proposalId) throw new Error('The workbench route needs a proposal id')
  return <WorkbenchGate key={proposalId} proposalId={proposalId} />
}

/** Firm-only: a client is told the proposal is not found, and a switch to someone who cannot see it goes home. */
function WorkbenchGate({ proposalId }: { proposalId: string }) {
  const proposal = useProposal(proposalId)
  const directory = useDirectory()
  const hiddenFromNewViewer = useGoHomeWhenHidden(proposal)

  if (hiddenFromNewViewer || proposal.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the proposal…</p>
  if (proposal.isError) return isNotFound(proposal.error) ? <FullViewNotFound subject="Proposal" /> : <p role="alert" className="text-body">{proposal.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  return <Workbench detail={proposal.data} directory={directory.data} />
}
