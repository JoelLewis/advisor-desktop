import { fmtEasternStamp } from '@/kit/measure'
import type { CommunicationRow } from '@/types/workspace-household'
import { CHANNEL_WORDS } from './household-words'

/** The CRM's record of communications, latest first, as logged. */
export function CommunicationsList({ communications }: { communications: CommunicationRow[] }) {
  if (communications.length === 0) return <p className="text-body text-ink-3">No communications on file.</p>
  return (
    <ol aria-label="Communications" className="flex min-w-0 flex-col">
      {communications.map((c) => (
        <li key={c.id} className="flex min-w-0 flex-col gap-1 border-b border-rule py-3 first:pt-0 last:border-b-0">
          <span className="flex flex-wrap items-baseline gap-x-3 text-label text-ink-3">
            <span className="uppercase">{`${CHANNEL_WORDS[c.channel]} · ${c.direction === 'inbound' ? 'from' : 'to'} ${c.clientName}`}</span>
            <span className="tabular ml-auto">{fmtEasternStamp(c.at)}</span>
          </span>
          <span className="text-body font-semibold">{c.subject}</span>
          <span className="text-copy text-ink-2">{c.summary}</span>
        </li>
      ))}
    </ol>
  )
}
