import { Button } from '@/kit/button/Button'
import { useRunAgent } from '@/hooks/use-workspace'
import type { AgentProfile, Thread } from '@/types/workspace'
import { ContextSection } from './ContextSection'

/** Runs an agent on the thread's subject; its findings arrive in the conversation. */
export function AskAgents({ thread, agents }: { thread: Thread; agents: AgentProfile[] }) {
  const run = useRunAgent(thread.id)
  const lastAsked = agents.find((a) => a.id === run.variables)
  return (
    <ContextSection title="Ask an agent">
      <div className="flex flex-wrap gap-2">
        {agents.map((a) => (
          <Button key={a.id} rank="secondary" disabled={run.isPending} onClick={() => run.mutate(a.id)}>{`Ask ${a.name}`}</Button>
        ))}
      </div>
      {run.isError ? <p role="alert" className="text-body">{run.error.message}</p> : null}
      {run.isSuccess && lastAsked ? <p role="status" className="text-body text-ink-2">{`${lastAsked.name} reported in the thread.`}</p> : null}
    </ContextSection>
  )
}
