import { useId } from 'react'
import { Tag } from '@/kit/tag/Tag'
import { fmtMoney } from '@/kit/measure'
import { useAccount } from '@/hooks/use-accounts'
import { useHeldAway } from '@/hooks/use-held-away'
import { useHousehold } from '@/hooks/use-households'
import type { HeldAwayAsset } from '@/types/held-away'
import { canHoldSecurities } from '@/lib/held-away'


/** The household's accounts held elsewhere that could hold a substantially identical security, which no check here can see. */
export function HeldAwayList({ accountId }: { accountId: string }) {
  const titleId = useId()
  const account = useAccount(accountId)
  const householdId = account.data?.householdId ?? ''
  const away = useHeldAway(householdId)
  const household = useHousehold(householdId)
  if (account.isError) return <p role="alert" className="text-body">{account.error.message}</p>
  if (away.isError) return <p role="alert" className="text-body">{away.error.message}</p>
  if (household.isError) return <p role="alert" className="text-body">{household.error.message}</p>
  if (!away.data || !household.data) return <p role="status" className="text-body text-ink-3">Loading held-away accounts…</p>
  const owners = new Map(household.data.members.map((m) => [m.clientId, m.name]))
  const ownerOf = (h: HeldAwayAsset) => {
    const name = owners.get(h.clientId)
    if (name === undefined) throw new Error(`Held-away account ${h.id} belongs to no member of household ${householdId}`)
    return name
  }
  const securities = away.data.filter(canHoldSecurities)
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2">
      <h3 id={titleId} className="text-label uppercase text-ink-2">Held-away accounts</h3>
      {securities.length === 0 ? <p className="text-body text-ink-3">None on record that can hold securities.</p> : (
        <>
          <ul className="flex flex-col gap-1.5 text-body">
            {securities.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span>{`${ownerOf(h)} · ${h.institutionName} · ${h.accountType}`}</span>
                <span className="tabular">{fmtMoney(h.estimatedValue)} <span className="text-label text-ink-3">USD</span></span>
                <Tag>NOT VISIBLE TO WASH-SALE CHECKS</Tag>
              </li>
            ))}
          </ul>
          <p className="text-label text-ink-3">A purchase in one of these accounts could wash a loss sold here for the same taxpayer (joint filers count as one). If it's a retirement account, the loss is permanently disallowed.</p>
        </>
      )}
    </section>
  )
}
