import { Link } from 'react-router-dom'
import type { Message } from '@/types/workspace'

type NextAction = Extract<Message, { kind: 'next_action' }>

/** The Brief's line for a next-best action: what it is, why now, and the way to the thread where it is worked. */
export function NextActionView({ action }: { action: NextAction }) {
  return (
    <article aria-label={`Next best action · ${action.title}`} className="flex min-w-0 flex-col gap-2 border border-ink p-4">
      <p className="text-label uppercase text-ink-2">Next best action</p>
      <p className="text-copy font-semibold">{action.title}</p>
      <p className="text-copy">{action.detail}</p>
      <Link to={`/t/${encodeURIComponent(action.targetThreadId)}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        {action.linkLabel} <span aria-hidden="true">↗</span>
      </Link>
    </article>
  )
}
