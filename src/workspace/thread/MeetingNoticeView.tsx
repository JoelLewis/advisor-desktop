import { Link } from 'react-router-dom'
import { fmtEasternRange, fmtEasternTime } from '@/kit/measure'
import type { Message } from '@/types/workspace'

type Notice = Extract<Message, { kind: 'meeting_notice' }>

/** The Brief's line for a meeting today: when, which meeting, and the way to its thread. */
export function MeetingNoticeView({ notice }: { notice: Notice }) {
  return (
    <article aria-label={`Meeting · ${notice.title}`} className="flex min-w-0 flex-col gap-2 border border-ink p-4">
      <p className="text-label uppercase text-ink-2">{`Meeting at ${fmtEasternTime(notice.start)} ET`}</p>
      <p className="text-copy">{`${notice.title} · ${fmtEasternRange(notice.start, notice.end)}`}</p>
      <Link to={`/t/${encodeURIComponent(notice.meetingThreadId)}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        Open the meeting thread <span aria-hidden="true">↗</span>
      </Link>
    </article>
  )
}
