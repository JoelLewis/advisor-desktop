import { fmtTimestamp } from '@/kit/measure'
import { authorName } from '@/workspace/proposal/author-name'
import type { Directory, Message } from '@/types/workspace'

type VersionMessage = Extract<Message, { kind: 'prospect_proposal_version' }>

export function ProspectProposalVersionLine({ message, directory }: { message: VersionMessage; directory: Directory }) {
  const name = authorName(message.author, directory)
  return (
    <article aria-label={`v${message.version} · ${name}`} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tabular text-body font-semibold">{`v${message.version}`}</span>
        <span className="text-body">{name}</span>
        <span className="text-label uppercase text-ink-3">{message.author.kind === 'agent' ? 'Agent' : 'Person'}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-copy">{message.changeSummary}</p>
    </article>
  )
}
