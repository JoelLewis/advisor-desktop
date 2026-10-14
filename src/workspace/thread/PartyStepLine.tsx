import { fmtEasternStamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { ROLE_LABEL } from '@/workspace/people/role-label'
import type { Directory, Message } from '@/types/workspace'

type Step = Extract<Message, { kind: 'party_step' }>

/** A step she took in her own thread: answered the questionnaire, shared her statements. */
export function PartyStepLine({ message, directory }: { message: Step; directory: Directory }) {
  const author = personIn(directory, message.authorId)
  return (
    <article aria-label={`${author.name} · ${message.summary}`} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-body font-semibold">{author.name}</span>
        <span className="text-label text-ink-3">{ROLE_LABEL[author.role]}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtEasternStamp(message.at)}</span>
      </div>
      <p className="text-copy">{message.summary}</p>
    </article>
  )
}
