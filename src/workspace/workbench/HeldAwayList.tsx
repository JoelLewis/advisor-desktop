import { useId } from 'react'
import { Tag } from '@/kit/tag/Tag'
import { fmtMoney } from '@/kit/measure'
import { useAccount } from '@/hooks/use-accounts'
import { useHeldAway } from '@/hooks/use-held-away'
import type { HeldAwayAsset } from '@/types/held-away'

/** A holding that can hold or buy a listed security: not property, not private company stock (the harvest scanner's test). */
const canHoldSecurities = (h: HeldAwayAsset) => !h.isPrivateCompanyStock && h.assetClasses.some((c) => c.assetClass !== 'real_estate')

/** The household's accounts held elsewhere that could hold a substantially identical security, which no check here can see. */
export function HeldAwayList({ accountId }: { accountId: string }) {
  const titleId = useId()
  const account = useAccount(accountId)
  const away = useHeldAway(account.data?.householdId ?? '')
  if (account.isError) return <p role="alert" className="text-body">{account.error.message}</p>
  if (away.isError) return <p role="alert" className="text-body">{away.error.message}</p>
  if (!away.data) return <p role="status" className="text-body text-ink-3">Loading held-away accounts…</p>
  const securities = away.data.filter(canHoldSecurities)
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2">
      <h3 id={titleId} className="text-label uppercase text-ink-2">Held-away accounts</h3>
      {securities.length === 0 ? <p className="text-body text-ink-3">None on record that can hold securities.</p> : (
        <>
          <ul className="flex flex-col gap-1.5 text-body">
            {securities.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span>{`${h.institutionName} · ${h.accountType}`}</span>
                <span className="tabular">{fmtMoney(h.estimatedValue)} <span className="text-label text-ink-3">USD</span></span>
                <Tag>NOT VISIBLE TO WASH-SALE CHECKS</Tag>
              </li>
            ))}
          </ul>
          <p className="text-label text-ink-3">The household's accounts at other firms. A purchase in one of them within the window would wash a loss sold here.</p>
        </>
      )}
    </section>
  )
}
