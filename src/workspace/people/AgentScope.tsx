import type { AgentProfile } from '@/types/workspace'

export function AgentScope({ agent }: { agent: AgentProfile }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-body font-semibold">{agent.name}</span>
      <ScopeLine verb="may" acts={agent.scope.may} />
      <ScopeLine verb="may not" acts={agent.scope.mayNot} />
    </div>
  )
}

function ScopeLine({ verb, acts }: { verb: string; acts: string[] }) {
  return (
    <p className="text-body text-ink-2">
      <span className="text-label uppercase text-ink-3">{verb}</span> {acts.join(' · ')}
    </p>
  )
}
