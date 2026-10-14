import { Link } from 'react-router-dom'
import { fmtEasternStamp } from '@/kit/measure'
import { authorName } from '@/workspace/proposal/author-name'
import { meetingFullViewHref } from '@/workspace/full-views/full-view-href'
import type { Directory, Message } from '@/types/workspace'

type AgendaMessage = Extract<Message, { kind: 'agenda_version' }>

export function AgendaVersionLine({ message, directory }: { message: AgendaMessage; directory: Directory }) {
  const name = authorName(message.author, directory)
  return (
    <article aria-label={`Agenda v${message.version} · ${name}`} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tabular text-body font-semibold">{`Agenda v${message.version}`}</span>
        <span className="text-body">{name}</span>
        <span className="text-label text-ink-3">{message.author.kind === 'agent' ? 'Agent' : 'Advisor'}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtEasternStamp(message.at)}</span>
      </div>
      <p className="text-copy">{message.changeSummary}</p>
      <Link to={meetingFullViewHref(message.eventId, message.threadId)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        Open the meeting view <span aria-hidden="true">↗</span>
      </Link>
    </article>
  )
}
