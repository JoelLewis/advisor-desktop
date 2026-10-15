import { AgentScope } from '@/workspace/people/AgentScope'
import { personIn } from '@/workspace/people/directory-people'
import { personWithRole } from '@/workspace/people/role-label'
import type { Directory, Thread } from '@/types/workspace'
import { ContextSection } from './ContextSection'

/**
 * Everyone who can read the thread: its members, compliance (who supervises every firm and client thread) and
 * the agents working in it. The thread's client sees only the people in their thread, from their own directory.
 */
export function WhoCanSee({ thread, directory, viewerIsExternal }: { thread: Thread; directory: Directory; viewerIsExternal: boolean }) {
  const memberIds = [...new Set([...(thread.ownerId ? [thread.ownerId] : []), ...thread.memberIds])]
  const members = memberIds.map((id) => personIn(directory, id))
  const supervisors = thread.visibility === 'private' || viewerIsExternal ? []
    : directory.people.filter((p) => p.role === 'compliance' && !memberIds.includes(p.id))
  const agents = viewerIsExternal ? [] : directory.agents.filter((a) => thread.agentIds.includes(a.id))
  return (
    <ContextSection title="Who can see">
      <ul className="flex flex-col gap-1 text-body">
        {members.map((p) => <li key={p.id}>{personWithRole(p)}</li>)}
        {supervisors.map((p) => <li key={p.id}>{`${p.name} · Compliance (supervision)`}</li>)}
      </ul>
      {agents.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-rule pt-3">
          <span className="text-label uppercase text-ink-3">Agents</span>
          <ul aria-label="Agents" className="flex flex-col gap-4">
            {agents.map((a) => <li key={a.id}><AgentScope agent={a} /></li>)}
          </ul>
        </div>
      ) : null}
    </ContextSection>
  )
}
