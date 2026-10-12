import type { ReactNode } from 'react'
import { fmtTimestamp } from '@/kit/measure'
import { useActs } from '@/hooks/use-workspace'
import { personIn } from '@/workspace/people/directory-people'
import { ROLE_LABEL } from '@/workspace/people/role-label'
import type { Directory, Message, Person, Thread } from '@/types/workspace'
import { ActRecordSlip } from './ActRecordSlip'
import { AgentFindingView } from './AgentFindingView'
import { BriefSummaryView } from './BriefSummaryView'
import { CarriedFindingView } from './CarriedFindingView'
import { CarryControl } from './CarryControl'
import { ProposalVersionLine } from './ProposalVersionLine'
import { ProposalEmbed } from './embeds/ProposalEmbed'
import { embedFor } from './embeds/embed-registry'
import { findingAnchorId } from './finding-anchor'

export function MessageView({ message, thread, directory }: { message: Message; thread: Thread; directory: Directory }) {
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
      const footer = thread.visibility === 'private' ? <CarryControl thread={thread} findingId={message.id} /> : undefined
      return <AgentFindingView finding={message} agent={agent} anchorId={findingAnchorId(message.id)} footer={footer} />
    }
    case 'embed': {
      const Embed = embedFor(message.embed)
      return <Authored author={personIn(directory, message.authorId)} at={message.at}><Embed subject={message.subject} threadId={message.threadId} /></Authored>
    }
    case 'act':
      return <ActSlip threadId={message.threadId} actId={message.actId} directory={directory} />
    case 'proposal': {
      const agent = directory.agents.find((a) => a.id === message.agentId)
      if (!agent) throw new Error(`No agent "${message.agentId}" in the directory`)
      return <ByAgent name={agent.name} at={message.at}><ProposalEmbed proposalId={message.proposalId} threadId={message.threadId} /></ByAgent>
    }
    case 'proposal_version':
      return <ProposalVersionLine message={message} directory={directory} />
    case 'carried':
      return <CarriedFindingView message={message} directory={directory} />
    case 'brief_summary':
      return <BriefSummaryView summary={message} directory={directory} />
    default:
      return unknownKind(message)
  }
}

/** Every message kind has a view: a kind added to `Message` without one fails to compile here. */
function unknownKind(message: never): never {
  throw new Error(`No view for message kind "${(message as { kind: string }).kind}"`)
}

function ByAgent({ name, at, children }: { name: string; at: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-body font-semibold">{name}</span>
        <span className="text-label uppercase text-ink-3">Agent</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(at)}</span>
      </div>
      {children}
    </div>
  )
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
