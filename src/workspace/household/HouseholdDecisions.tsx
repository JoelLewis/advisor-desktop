import { Link } from 'react-router-dom'
import { LINK_TARGET } from '@/kit/link-target'
import { figureText } from '@/kit/figure-text'
import type { HouseholdDecision } from '@/types/workspace-household'

const LINK = `${LINK_TARGET} text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

/** This household's decide items, as the Brief groups them, and its proposals waiting for approval; each opens its thread. */
export function HouseholdDecisions({ decisions }: { decisions: HouseholdDecision[] }) {
  if (decisions.length === 0) return <p className="text-body text-ink-3">Nothing waits on a decision.</p>
  return (
    <ul aria-label="Needs a decision" className="flex flex-col gap-3">
      {decisions.map((d) => (d.kind === 'proposal' ? (
        <li key={d.proposalId} className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-body">{`${d.title} · v${d.latestVersion} awaits approval`}</span>
          <Link to={`/t/${d.threadId}`} className={LINK}>Open its thread</Link>
        </li>
      ) : (
        <li key={d.item.key} className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-body">{[d.item.title, d.item.readings.map((r) => (r.figure ? `${r.line} · ${figureText(r.figure)}` : r.line)).join('; ')].filter((x): x is string => x !== undefined).join(': ')}</span>
          <Link to={`/t/${d.threadId}`} className={LINK}>Open the Brief</Link>
        </li>
      )))}
    </ul>
  )
}
