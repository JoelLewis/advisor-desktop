import { useId } from 'react'
import { WindowRuler } from '@/kit/window-ruler/WindowRuler'
import { todayISO } from '@/lib/clock'
import { restrictionSource } from '@/workspace/proposal/restriction-words'
import type { RepurchaseRestriction } from '@/services/oms'

const GROUPS = [
  { kind: 'recorded', title: 'Recorded · from loss sales already made', event: 'Loss sale' },
  { kind: 'projected', title: "Projected · from this proposal's loss sales", event: 'Proposed sale' },
] as const

/** The taxpayer's repurchase windows, the recorded ones apart from the ones this proposal would open, each with its source. */
export function RestrictionRulers({ restrictions }: { restrictions: RepurchaseRestriction[] }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4">
      <h3 id={titleId} className="text-label uppercase text-ink-2">Repurchase restrictions</h3>
      {restrictions.length === 0 ? <p className="text-body text-ink-3">None for this taxpayer.</p> : GROUPS.map((group) => {
        const shown = restrictions.filter((r) => r.source.kind === group.kind)
        if (shown.length === 0) return null
        return (
          <div key={group.kind} className="flex min-w-0 flex-col gap-3">
            <h4 className="text-label text-ink-3">{group.title}</h4>
            {shown.map((r) => (
              <div key={`${r.symbol}:${r.source.kind}:${r.until}`} className="flex min-w-0 flex-col gap-1">
                <WindowRuler label={r.symbol} start={r.start} end={r.until} today={todayISO()}
                  events={[{ date: r.source.saleDate, label: group.event }]} />
                <p className="text-label text-ink-3">{restrictionSource(r)}</p>
              </div>
            ))}
          </div>
        )
      })}
    </section>
  )
}
