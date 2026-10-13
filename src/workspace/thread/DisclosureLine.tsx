import { Tag } from '@/kit/tag/Tag'
import { fmtTimestamp } from '@/kit/measure'
import type { Message } from '@/types/workspace'
import { DISCLOSURE_TITLES } from '@/types/workspace-prospect'

type Delivered = Extract<Message, { kind: 'disclosure_delivered' }>

/** A disclosure as it reached her: which document, and when. Its act's slip follows it. */
export function DisclosureLine({ message }: { message: Delivered }) {
  const title = DISCLOSURE_TITLES[message.document]
  return (
    <article aria-label={`Delivered · ${title}`} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
      <Tag>Delivered</Tag>
      <span className="text-copy">{title}</span>
      <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
    </article>
  )
}
