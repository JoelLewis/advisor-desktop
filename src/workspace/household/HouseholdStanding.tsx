import { Link } from 'react-router-dom'
import { Tag } from '@/kit/tag/Tag'
import { LINK_TARGET } from '@/kit/link-target'
import { fmtDayMonthYear } from '@/kit/measure'
import { TOLERANCE_TAG } from '@/workspace/reference/reference-words'
import { clientFullViewHref } from '@/workspace/full-views/full-view-href'
import type { HouseholdView } from '@/types/workspace-household'
import { standingWords } from './holding-words'

const LINK = `${LINK_TARGET} text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

/** Each member, a client in their own right: their tolerance and their own accounts as a whole. Nothing pooled. */
export function HouseholdStanding({ view, from }: { view: Pick<HouseholdView, 'members' | 'standing'>; from: string | undefined }) {
  return (
    <ul aria-label="Members" className="flex flex-col gap-2">
      {view.standing.map((m) => {
        const words = standingWords(m)
        const born = view.members.find((x) => x.clientId === m.clientId)?.dateOfBirth
        return (
          <li key={m.clientId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link to={clientFullViewHref(m.clientId, from)} className={LINK}>{m.name}</Link>
            {born ? <span className="tabular text-body text-ink-3">{`born ${fmtDayMonthYear(born)}`}</span> : null}
            <span className="tabular text-body text-ink-2">{words.whole ? `${words.tolerance} · ${words.whole}` : `${words.tolerance} · no measured account`}</span>
            {m.whole ? <Tag tone={m.whole.status === 'above' ? 'solid' : 'outline'}>{TOLERANCE_TAG[m.whole.status]}</Tag> : null}
          </li>
        )
      })}
    </ul>
  )
}
