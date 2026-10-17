import type { ReactNode } from 'react'
import { fmtEasternRange, fmtEasternStamp } from '@/kit/measure'
import { REFERENCE_VIEW_TITLE } from '@/workspace/full-views/reference-href'
import { personIn } from '@/workspace/people/directory-people'
import { authorName } from '@/workspace/proposal/author-name'
import { DISCLOSURE_TITLES } from '@/types/workspace-prospect'
import type { AgentId, Directory, Message } from '@/types/workspace'

const agentName = (directory: Directory, id: AgentId) => directory.agents.find((a) => a.id === id)?.name ?? id

/** One message, as the workbench's live thread shows it: who, when, and one line. */
export function CompactMessage({ message, directory }: { message: Message; directory: Directory }) {
  switch (message.kind) {
    case 'text': return <Line who={personIn(directory, message.authorId).name} at={message.at}>{message.body}</Line>
    case 'agent_finding': return <Line who={agentName(directory, message.agentId)} at={message.at}>{message.claim}</Line>
    case 'embed': return <Line who={personIn(directory, message.authorId).name} at={message.at}>{message.embed === 'drift' ? 'Shared the drift against the model.' : 'Shared a rebalance preview.'}</Line>
    case 'proposal': return <Line who={agentName(directory, message.agentId)} at={message.at}>Drafted the proposal (v1).</Line>
    case 'proposal_version': return <Line who={authorName(message.author, directory)} at={message.at}>{`v${message.version} · ${message.changeSummary}`}</Line>
    case 'act': return <Line who="Record" at={message.at}>{`Recorded · ${message.actId}`}</Line>
    case 'carried': return <Line who={personIn(directory, message.carriedBy).name} at={message.at}>{`From the Brief: ${message.finding.claim}`}</Line>
    case 'reference_row': return <Line who={personIn(directory, message.takenBy).name} at={message.at}>{`From ${REFERENCE_VIEW_TITLE[message.view]}: ${message.claim}`}</Line>
    case 'brief_today': return <Line who="Brief" at={message.at}>Today.</Line>
    case 'brief_summary': return <Line who="Brief" at={message.at}>Needs a decision · context.</Line>
    case 'fills': return <Line who="Execution" at={message.at}>{`${message.fills.length} ${message.fills.length === 1 ? 'order' : 'orders'} filled from v${message.version}.`}</Line>
    case 'agenda_version': return <Line who={authorName(message.author, directory)} at={message.at}>{`Agenda v${message.version} · ${message.changeSummary}`}</Line>
    case 'meeting_held': return <Line who="Record" at={message.at}>{`Meeting held · ${fmtEasternRange(message.start, message.end)} · transcript received`}</Line>
    case 'notes_drafted': return <Line who={agentName(directory, message.agentId)} at={message.at}>Drafted the notes from the transcript.</Line>
    case 'meeting_tasks': return <Line who="Record" at={message.at}>{`${message.tasks.length} follow-up ${message.tasks.length === 1 ? 'task' : 'tasks'} from ${message.filedActId}.`}</Line>
    case 'disclosure_delivered': return <Line who="Record" at={message.at}>{`Delivered · ${DISCLOSURE_TITLES[message.document]}`}</Line>
    case 'party_step': return <Line who={personIn(directory, message.authorId).name} at={message.at}>{message.summary}</Line>
    case 'prospect_note': return <Line who={personIn(directory, message.authorId).name} at={message.at}>{`Note · ${message.title}`}</Line>
    case 'prospect_proposal': return <Line who={agentName(directory, message.agentId)} at={message.at}>{`Drafted the ${message.title} (v1).`}</Line>
    case 'prospect_proposal_version': return <Line who={authorName(message.author, directory)} at={message.at}>{`v${message.version} · ${message.changeSummary}`}</Line>
    case 'onboarding_opened': return <Line who="Record" at={message.at}>{`Onboarding opened from ${message.acceptanceActId}.`}</Line>
  }
}

function Line({ who, at, children }: { who: string; at: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline gap-2 text-label">
        <span className="font-semibold text-ink-2">{who}</span>
        <span className="tabular ml-auto text-ink-3">{fmtEasternStamp(at)}</span>
      </div>
      <p className="whitespace-pre-line text-body">{children}</p>
    </div>
  )
}
