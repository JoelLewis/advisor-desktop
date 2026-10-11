import type { ReactNode } from 'react'
import { fmtTimestamp } from '@/kit/measure'
import { useActs } from '@/hooks/use-workspace'
import { personIn } from '@/workspace/people/directory-people'
import { ROLE_LABEL } from '@/workspace/people/role-label'
import type { Directory, Message, Person } from '@/types/workspace'
import { ActRecordSlip } from './ActRecordSlip'
import { AgentFindingView } from './AgentFindingView'
import { embedFor } from './embeds/embed-registry'

export function MessageView({ message, directory }: { message: Message; directory: Directory }) {
  switch (message.kind) {
    case 'text':
      return (
        <Authored author={personIn(directory, message.authorId)} at={message.at}>
          <p className="whitespace-pre-line text-copy">{message.body}</p>
        </Authored>
      )
    case 'agent_finding': {
      const agent = directory.agents.find((a) => a.id === message.agentId)
      if (!agent) throw new Error(`No agent "${message.agentId}" in the directory`)
      return <AgentFindingView finding={message} agent={agent} />
    }
    case 'embed': {
      const Embed = embedFor(message.embed)
      return <Authored author={personIn(directory, message.authorId)} at={message.at}><Embed subject={message.subject} threadId={message.threadId} /></Authored>
    }
    case 'act':
      return <ActSlip threadId={message.threadId} actId={message.actId} directory={directory} />
  }
}

function Authored({ author, at, children }: { author: Person; at: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-body font-semibold">{author.name}</span>
        <span className="text-label uppercase text-ink-3">{ROLE_LABEL[author.role]}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(at)}</span>
      </div>
      {children}
    </div>
  )
}

function ActSlip({ threadId, actId, directory }: { threadId: string; actId: string; directory: Directory }) {
  const acts = useActs(threadId)
  if (acts.isPending) return <p role="status" className="text-body text-ink-3">Loading the record…</p>
  if (acts.isError) return <p role="alert" className="text-body">{acts.error.message}</p>
  const act = acts.data.find((a) => a.id === actId)
  if (!act) return <p role="alert" className="text-body">{`Record ${actId} is not on file for this thread.`}</p>
  return <ActRecordSlip act={act} directory={directory} />
}
