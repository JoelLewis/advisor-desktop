import { useParams } from 'react-router-dom'
import { useDirectory, useProposal } from '@/hooks/use-workspace'

/** The live thread shows only while the proposal is readable; the page itself reports why not. */
export function useWorkbenchThreadAvailable(): boolean {
  const { proposalId } = useParams()
  if (!proposalId) throw new Error('The workbench needs a proposal id')
  const proposal = useProposal(proposalId)
  const directory = useDirectory()
  return !proposal.isError && !directory.isError
}
