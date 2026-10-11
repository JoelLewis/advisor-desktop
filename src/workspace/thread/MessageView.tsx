import type { ReactNode } from 'react'
import { fmtTimestamp } from '@/kit/measure'
import { RecordSlip } from '@/kit/record-slip/RecordSlip'
import { useActs } from '@/hooks/use-workspace'
import { ROLE_LABEL } from '@/workspace/people/role-label'
import type { BindingActKind, Directory, Message, Person } from '@/types/workspace'
import { AgentFindingView } from './AgentFindingView'
import { embedFor } from './embeds/embed-registry'

const ACT_KIND_LABEL: Readonly<Record<BindingActKind, string>> = {
  approve_proposal: 'Approve proposal · binding',
  withdraw_approval: 'Withdraw approval · binding',
  dispose_exception: 'Dispose exception · binding',
  send_to_client: 'Send to client · binding',
}

function personIn(directory: Directory, id: string): Person {
  const person = directory.people.find((p) => p.id === id)
  if (!person) throw new Error(`No person "${id}" in the directory`)
  return person
}

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
      return <Authored author={personIn(directory, message.authorId)} at={message.at}><Embed subject={message.subject} /></Authored>
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
  const actor = personIn(directory, act.actorId)
  return (
    <RecordSlip kind={ACT_KIND_LABEL[act.kind]} title={act.summary} recordId={act.id} fingerprint={act.fingerprint}
      recordedBy={{ name: actor.name, role: ROLE_LABEL[actor.role] }} at={act.at} archive="Supervisory review" />
  )
}
