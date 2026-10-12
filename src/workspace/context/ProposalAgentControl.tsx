import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useCreateProposal, useProposals } from '@/hooks/use-workspace'
import type { AgentProfile, Thread } from '@/types/workspace'

/** Asks the drafting agent for v1 on the thread's account. The engine returns the existing proposal rather than drafting twice. */
export function ProposalAgentControl({ thread, agent }: { thread: Thread; agent: AgentProfile }) {
  const create = useCreateProposal(thread.id)
  const proposals = useProposals(thread.id)
  const [report, setReport] = useState<string>()
  const subject = thread.subject
  if (subject?.type !== 'account') return null
  const ask = () => {
    const drafted = (proposals.data ?? []).some((p) => p.accountId === subject.id)
    setReport(undefined)
    create.mutate(subject.id, {
      onSuccess: () => setReport(drafted ? `${agent.name} has already drafted this proposal; it is in the thread.` : `${agent.name} posted v1 in the thread.`),
    })
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <Button rank="secondary" disabled={create.isPending} onClick={ask}>{`Ask ${agent.name}`}</Button>
      {create.isError ? <p role="alert" className="text-body">{create.error.message}</p> : null}
      {report ? <p role="status" className="text-body text-ink-2">{report}</p> : null}
    </div>
  )
}
