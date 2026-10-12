import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useCreateProposal, useProposals } from '@/hooks/use-workspace'
import type { AgentProfile, Thread } from '@/types/workspace'

/** Asks the drafting agent for v1 on the thread's account. The engine returns the existing proposal rather than drafting twice. */
export function ProposalAgentControl({ thread, agent }: { thread: Thread; agent: AgentProfile }) {
  const create = useCreateProposal(thread.id)
  const proposals = useProposals(thread.id)
  const [asked, setAsked] = useState<{ proposalId: string; alreadyDrafted: boolean }>()
  const subject = thread.subject
  if (subject?.type !== 'account') return null
  const ask = () => {
    const alreadyDrafted = (proposals.data ?? []).some((p) => p.accountId === subject.id)
    setAsked(undefined)
    create.mutate(subject.id, { onSuccess: (detail) => setAsked({ proposalId: detail.id, alreadyDrafted }) })
  }
  // Read against the live proposal, so the line never names a version the thread has moved past.
  const latestN = asked ? proposals.data?.find((p) => p.id === asked.proposalId)?.versions.length : undefined
  const report = !asked || latestN === undefined ? undefined
    : asked.alreadyDrafted ? `${agent.name} has already drafted this proposal; v${latestN} is in the thread.`
    : latestN === 1 ? `${agent.name} posted v1 in the thread.` : undefined
  return (
    <div className="flex flex-col items-start gap-2">
      <Button rank="secondary" disabled={create.isPending} onClick={ask}>{`Ask ${agent.name}`}</Button>
      {create.isError ? <p role="alert" className="text-body">{create.error.message}</p> : null}
      {report ? <p role="status" className="text-body text-ink-2">{report}</p> : null}
    </div>
  )
}
