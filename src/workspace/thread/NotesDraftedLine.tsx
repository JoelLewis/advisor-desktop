import { Link } from 'react-router-dom'
import { fmtEasternStamp } from '@/kit/measure'
import { meetingFullViewHref } from '@/workspace/full-views/full-view-href'
import type { Directory, Message } from '@/types/workspace'

type Drafted = Extract<Message, { kind: 'notes_drafted' }>

export function NotesDraftedLine({ message, directory }: { message: Drafted; directory: Directory }) {
  const agent = directory.agents.find((a) => a.id === message.agentId)
  if (!agent) throw new Error(`No agent "${message.agentId}" in the directory`)
  return (
    <article aria-label={`Notes drafted · ${agent.name}`} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-body font-semibold">{agent.name}</span>
        <span className="text-label text-ink-3">Agent</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtEasternStamp(message.at)}</span>
      </div>
      <p className="text-copy">Drafted the notes from the transcript; every line cites the lines it records.</p>
      <Link to={meetingFullViewHref(message.eventId, message.threadId)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        Open the notes beside the transcript <span aria-hidden="true">↗</span>
      </Link>
    </article>
  )
}
