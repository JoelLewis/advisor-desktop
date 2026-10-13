import { fmtEasternRange, fmtTimestamp } from '@/kit/measure'
import type { Message } from '@/types/workspace'

type Held = Extract<Message, { kind: 'meeting_held' }>

export function MeetingHeldLine({ message }: { message: Held }) {
  return (
    <article aria-label="Meeting held" className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-label uppercase text-ink-2">Record</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-copy">{`Meeting held · ${fmtEasternRange(message.start, message.end)} · transcript received`}</p>
    </article>
  )
}
