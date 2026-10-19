import { useId } from 'react'
import { Link } from 'react-router-dom'
import { LINK_TARGET } from '@/kit/link-target'
import { fmtWaited } from '@/kit/measure'
import { addressNameOf } from '@/lib/words'
import type { HouseholdView } from '@/types/workspace-household'
import { contactWords } from './holding-words'

const LINK = `${LINK_TARGET} text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

/** Who last spoke with the firm, when and where, and any client still waiting for a reply. */
export function LastContactLine({ view }: { view: Pick<HouseholdView, 'lastContact' | 'waiting' | 'asOf'> }) {
  const titleId = useId()
  const { lastContact, waiting, asOf } = view
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2">
      <div className="border-b border-ink pb-2"><h2 id={titleId} className="text-label uppercase text-ink-2">Last client contact</h2></div>
      {lastContact ? (
        <p className="flex flex-wrap items-baseline gap-x-3 text-body">
          <span>{contactWords(lastContact, asOf)}</span>
          {lastContact.where.kind === 'conversation' ? <Link to={`/t/${lastContact.where.threadId}`} className={LINK}>{`Open ${lastContact.where.title}`}</Link> : null}
        </p>
      ) : <p className="text-body text-ink-3">No contact on file.</p>}
      {waiting.map((w) => (
        <p key={w.threadId} className="flex flex-wrap items-baseline gap-x-3 text-body">
          <span className="font-semibold">{`${addressNameOf(w.clientName)} waiting ${fmtWaited(w.since, asOf)}`}</span>
          <Link to={`/t/${w.threadId}`} className={LINK}>Reply in their conversation</Link>
        </p>
      ))}
    </section>
  )
}
