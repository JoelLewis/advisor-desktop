import type { ReactNode } from 'react'
import { fmtTimestamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { authorName } from '@/workspace/proposal/author-name'
import type { AgentId, Directory, Message } from '@/types/workspace'

const agentName = (directory: Directory, id: AgentId) => directory.agents.find((a) => a.id === id)?.name ?? id

/** One message, as the workbench's live thread shows it: who, when, and one line. */
export function CompactMessage({ message, directory }: { message: Message; directory: Directory }) {
  switch (message.kind) {
    case 'text': return <Line who={personIn(directory, message.authorId).name} at={message.at}>{message.body}</Line>
    case 'agent_finding': return <Line who={agentName(directory, message.agentId)} at={message.at}>{message.claim}</Line>
    case 'embed': return <Line who={personIn(directory, message.authorId).name} at={message.at}>{message.embed === 'drift' ? 'Shared the drift reading.' : 'Shared a rebalance preview.'}</Line>
    case 'proposal': return <Line who={agentName(directory, message.agentId)} at={message.at}>Drafted the proposal (v1).</Line>
    case 'proposal_version': return <Line who={authorName(message.author, directory)} at={message.at}>{`v${message.version} · ${message.changeSummary}`}</Line>
    case 'act': return <Line who="Record" at={message.at}>{`Binding act recorded · ${message.actId}`}</Line>
    case 'carried': return <Line who={personIn(directory, message.carriedBy).name} at={message.at}>{`From the Brief: ${message.finding.claim}`}</Line>
    case 'brief_summary': return <Line who="Brief" at={message.at}>Ranked summary.</Line>
    case 'fills': return <Line who="Execution" at={message.at}>{`${message.fills.length} ${message.fills.length === 1 ? 'order' : 'orders'} filled from v${message.version}.`}</Line>
  }
}

function Line({ who, at, children }: { who: string; at: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline gap-2 text-label">
        <span className="font-semibold uppercase text-ink-2">{who}</span>
        <span className="tabular ml-auto text-ink-3">{fmtTimestamp(at)}</span>
      </div>
      <p className="whitespace-pre-line text-body">{children}</p>
    </div>
  )
}
