import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useRunAgent, useThread } from '@/hooks/use-workspace'
import type { AgentProfile, Thread } from '@/types/workspace'
import { ContextSection } from './ContextSection'
import { ProposalAgentControl } from './ProposalAgentControl'

/**
 * Runs an agent on the thread's subject; its findings arrive in the conversation. A viewer who can post
 * in the thread may also ask the drafting agents, whose proposals arrive the same way.
 */
export function AskAgents({ thread, agents, canPost }: { thread: Thread; agents: AgentProfile[]; canPost: boolean }) {
  const run = useRunAgent(thread.id)
  const detail = useThread(thread.id)
  const [report, setReport] = useState<string>()
  const runnable = agents.filter((a) => a.produces === 'findings')
  const drafting = canPost && thread.subject?.type === 'account' ? agents.filter((a) => a.produces === 'proposals') : []

  // The engine returns the earlier findings when a run repeats for the same as-of, so compare against what was already here.
  const ask = (agent: AgentProfile) => {
    const before = new Set(detail.data?.messages.map((m) => m.id))
    setReport(undefined)
    run.mutate(agent.id, {
      onSuccess: (findings) => setReport(findings.length > 0 && findings.every((f) => before.has(f.id))
        ? `${agent.name} has already reported for this as-of.`
        : `${agent.name} reported in the thread.`),
    })
  }

  if (runnable.length === 0 && drafting.length === 0) return null

  return (
    <ContextSection title="Ask an agent">
      {runnable.length > 0 ? (
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
            {runnable.map((a) => (
              <Button key={a.id} rank="secondary" disabled={run.isPending} onClick={() => ask(a)}>{`Ask ${a.name}`}</Button>
            ))}
          </div>
          {run.isError ? <p role="alert" className="text-body">{run.error.message}</p> : null}
          {report ? <p role="status" className="text-body text-ink-2">{report}</p> : null}
        </div>
      ) : null}
      {drafting.map((a) => <ProposalAgentControl key={a.id} thread={thread} agent={a} />)}
    </ContextSection>
  )
}
