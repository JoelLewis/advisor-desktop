import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useDirectory, useProposal } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { Workbench } from './Workbench'

export function WorkbenchPage() {
  const { proposalId } = useParams()
  if (!proposalId) throw new Error('The workbench route needs a proposal id')
  return <WorkbenchGate key={proposalId} proposalId={proposalId} />
}

/** Firm-only: a client is told the proposal is not found, and a switch to someone who cannot see it goes home. */
function WorkbenchGate({ proposalId }: { proposalId: string }) {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const proposal = useProposal(proposalId)
  const directory = useDirectory()
  const hiddenFromNewViewer = viewerId !== openedAs && proposal.isError && isNotFound(proposal.error)
  useEffect(() => {
    if (hiddenFromNewViewer) navigate('/', { replace: true })
  }, [hiddenFromNewViewer, navigate])

  if (hiddenFromNewViewer || proposal.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the proposal…</p>
  if (proposal.isError) return isNotFound(proposal.error) ? <ProposalNotFound /> : <p role="alert" className="text-body">{proposal.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  return <Workbench detail={proposal.data} directory={directory.data} />
}

function ProposalNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Proposal not found</h1>
      <p className="text-body text-ink-2">It may not exist, or this viewer may not be able to see it.</p>
      <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>
    </div>
  )
}
