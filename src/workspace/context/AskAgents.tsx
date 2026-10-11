import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useRunAgent, useThread } from '@/hooks/use-workspace'
import type { AgentProfile, Thread } from '@/types/workspace'
import { ContextSection } from './ContextSection'

/** Runs an agent on the thread's subject; its findings arrive in the conversation. */
export function AskAgents({ thread, agents }: { thread: Thread; agents: AgentProfile[] }) {
  const run = useRunAgent(thread.id)
  const detail = useThread(thread.id)
  const [report, setReport] = useState<string>()

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

  return (
    <ContextSection title="Ask an agent">
      <div className="flex flex-wrap gap-2">
        {agents.map((a) => (
          <Button key={a.id} rank="secondary" disabled={run.isPending} onClick={() => ask(a)}>{`Ask ${a.name}`}</Button>
        ))}
      </div>
      {run.isError ? <p role="alert" className="text-body">{run.error.message}</p> : null}
      {report ? <p role="status" className="text-body text-ink-2">{report}</p> : null}
    </ContextSection>
  )
}
