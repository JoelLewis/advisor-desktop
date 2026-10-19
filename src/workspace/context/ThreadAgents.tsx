import { AgentScope } from '@/workspace/people/AgentScope'
import type { Directory, Thread } from '@/types/workspace'
import { ContextSection } from './ContextSection'

/** The agents working in the thread and what each may do. Only the firm is shown them. */
export function ThreadAgents({ thread, directory }: { thread: Thread; directory: Directory }) {
  const agents = directory.agents.filter((a) => thread.agentIds.includes(a.id))
  if (agents.length === 0) return null
  return (
    <ContextSection title="Agents">
      <ul aria-label="Agents" className="flex flex-col gap-4">
        {agents.map((a) => <li key={a.id}><AgentScope agent={a} /></li>)}
      </ul>
    </ContextSection>
  )
}
