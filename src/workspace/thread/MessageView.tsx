import { useState, type ReactNode } from 'react'
import { Button } from '@/kit/button/Button'
import { fmtEasternStamp } from '@/kit/measure'
import { usePositions } from '@/hooks/use-portfolio'
import { useActs, useProposal } from '@/hooks/use-workspace'
import { useProspectProposals } from '@/hooks/use-prospect-work'
import { ReviseDialog } from '@/workspace/proposal/ReviseDialog'
import { ProspectProposalEmbed } from '@/workspace/prospect/ProspectProposalEmbed'
import { ReviseProspectDialog } from '@/workspace/prospect/ReviseProspectDialog'
import { personIn } from '@/workspace/people/directory-people'
import { ROLE_LABEL } from '@/lib/role-label'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Directory, Message, Person, Thread } from '@/types/workspace'
import { ActRecordSlip } from './ActRecordSlip'
import { AgentFindingView } from './AgentFindingView'
import { FillsView } from './FillsView'
import { AgendaVersionLine } from './AgendaVersionLine'
import { MeetingHeldLine } from './MeetingHeldLine'
import { MeetingTasksView } from './MeetingTasksView'
import { NotesDraftedLine } from './NotesDraftedLine'
import { BriefSummaryView } from './BriefSummaryView'
import { BriefTodayView } from './BriefTodayView'
import { CarriedFindingView } from './CarriedFindingView'
import { DisclosureLine } from './DisclosureLine'
import { OnboardingOpenedView } from './OnboardingOpenedView'
import { PartyStepLine } from './PartyStepLine'
import { ProspectNoteView } from './ProspectNoteView'
import { ProspectProposalVersionLine } from './ProspectProposalVersionLine'
import { CarryControl } from './CarryControl'
import { ReferenceRowView } from './ReferenceRowView'
import { canPostIn } from './can-post'
import { ProposalVersionLine } from './ProposalVersionLine'
import { ProposalEmbed } from './embeds/ProposalEmbed'
import { embedFor } from './embeds/embed-registry'
import { findingAnchorId } from './finding-anchor'

export function MessageView({ message, thread, directory }: { message: Message; thread: Thread; directory: Directory }) {
  const { viewerId } = useViewer()
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
      const actions = canPostIn(thread, viewerId, directory) ? <ReviseAction proposalId={message.proposalId} /> : undefined
      return <ByAgent name={agent.name} at={message.at}><ProposalEmbed proposalId={message.proposalId} threadId={message.threadId} actions={actions} /></ByAgent>
    }
    case 'proposal_version':
      return <ProposalVersionLine message={message} directory={directory} />
    case 'carried':
      return <CarriedFindingView message={message} directory={directory} />
    case 'reference_row':
      return <ReferenceRowView message={message} directory={directory} />
    case 'brief_today':
      return <BriefTodayView today={message} />
    case 'brief_summary':
      return <BriefSummaryView summary={message} directory={directory} />
    case 'fills':
      return <FillsView message={message} />
    case 'agenda_version':
      return <AgendaVersionLine message={message} directory={directory} />
    case 'meeting_held':
      return <MeetingHeldLine message={message} />
    case 'notes_drafted':
      return <NotesDraftedLine message={message} directory={directory} />
    case 'meeting_tasks':
      return <MeetingTasksView message={message} directory={directory} />
    case 'disclosure_delivered':
      return <DisclosureLine message={message} />
    case 'party_step':
      return <PartyStepLine message={message} directory={directory} />
    case 'prospect_note':
      return <ProspectNoteView note={message} directory={directory} />
    case 'prospect_proposal': {
      const agent = directory.agents.find((a) => a.id === message.agentId)
      if (!agent) throw new Error(`No agent "${message.agentId}" in the directory`)
      if (thread.subject?.type !== 'prospect') throw new Error(`Prospect proposal ${message.proposalId} sits outside a prospect thread`)
      const actions = canPostIn(thread, viewerId, directory) ? <ReviseProspectAction prospectId={thread.subject.id} proposalId={message.proposalId} /> : undefined
      return <ByAgent name={agent.name} at={message.at}><ProspectProposalEmbed prospectId={thread.subject.id} proposalId={message.proposalId} actions={actions} /></ByAgent>
    }
    case 'prospect_proposal_version':
      return <ProspectProposalVersionLine message={message} directory={directory} />
    case 'onboarding_opened':
      return <OnboardingOpenedView message={message} directory={directory} />
    default:
      return unknownKind(message)
  }
}

/** Every message kind has a view: a kind added to `Message` without one fails to compile here. */
function unknownKind(message: never): never {
  throw new Error(`No view for message kind "${(message as { kind: string }).kind}"`)
}

/** The dialog mounts only while open, so its form starts from the latest version each time. */
function ReviseAction({ proposalId }: { proposalId: string }) {
  const [open, setOpen] = useState(false)
  const proposal = useProposal(proposalId)
  // Warm the holdings the dialog's "Leave untouched" list reads, so it opens complete.
  usePositions(proposal.data?.accountId ?? '')
  if (!proposal.data || proposal.data.approval.kind === 'released') return null
  return (
    <>
      <Button rank="secondary" onClick={() => setOpen(true)}>Revise</Button>
      {open ? <ReviseDialog open={open} onOpenChange={setOpen} detail={proposal.data} /> : null}
    </>
  )
}

/** Mounts the dialog only while open, so it starts from the latest version; gone once the proposal is sent. */
function ReviseProspectAction({ prospectId, proposalId }: { prospectId: string; proposalId: string }) {
  const [open, setOpen] = useState(false)
  const proposals = useProspectProposals(prospectId)
  const detail = proposals.data?.find((p) => p.id === proposalId)
  if (!detail || detail.sent) return null
  return (
    <>
      <Button rank="secondary" onClick={() => setOpen(true)}>Revise</Button>
      {open ? <ReviseProspectDialog open={open} onOpenChange={setOpen} prospectId={prospectId} detail={detail} /> : null}
    </>
  )
}

function ByAgent({ name, at, children }: { name: string; at: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-body font-semibold">{name}</span>
        <span className="text-label text-ink-3">Agent</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtEasternStamp(at)}</span>
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
        <span className="text-label text-ink-3">{ROLE_LABEL[author.role]}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtEasternStamp(at)}</span>
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
