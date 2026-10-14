import { Link } from 'react-router-dom'
import { fmtEasternStamp } from '@/kit/measure'
import { Reading } from '@/kit/reading/Reading'
import { SourceChips } from '@/kit/source-chips/SourceChips'
import { personIn } from '@/workspace/people/directory-people'
import { REFERENCE_VIEW_TITLE, referenceRowHref } from '@/workspace/full-views/reference-href'
import type { Directory, Message } from '@/types/workspace'
import { formatFigure } from './figure-format'

type ReferenceRow = Extract<Message, { kind: 'reference_row' }>

/** A row from a reference view quoted into a team thread: its claim, its figures with their sources, and the way back to the view. */
export function ReferenceRowView({ message, directory }: { message: ReferenceRow; directory: Directory }) {
  const view = REFERENCE_VIEW_TITLE[message.view]
  return (
    <article aria-label={`From ${view}: ${message.claim}`} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-label text-ink-3">
          {'From '}
          <Link to={referenceRowHref(message.view, message.rowId, message.threadId, message.subject)} className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink">{view}</Link>
          {` · taken by ${personIn(directory, message.takenBy).name}`}
        </span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtEasternStamp(message.at)}</span>
      </div>
      <blockquote className="flex min-w-0 flex-col gap-3 border-l-2 border-rule-2 pl-4">
        <p className="text-copy">{message.claim}</p>
        {message.figures.length > 0 ? (
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            {message.figures.map((fig, i) => {
              const { value, unit } = formatFigure(fig)
              return <Reading key={`${i}:${fig.label}`} label={fig.label} value={value} unit={unit} />
            })}
          </div>
        ) : null}
        <SourceChips sources={message.citations.map((c) => ({ label: c.source, asOf: c.asOf }))} />
      </blockquote>
    </article>
  )
}
