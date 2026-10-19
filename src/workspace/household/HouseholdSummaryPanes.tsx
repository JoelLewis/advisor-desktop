import { useId } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtDayMonthYear, fmtMoney, fmtResult, fmtWeight } from '@/kit/measure'
import type { HouseholdSummary } from '@/types/workspace-household'
import { AccountsTable } from './AccountsTable'
import { GOAL_STATUS_TAG, heldAwayPolicy, ipsLine } from './household-words'

/** The household as the engine measures it: managed accounts against their models, what is held away, the plan, the taxpayer's windows, the IPS. */
export function HouseholdSummaryPanes({ summary }: { summary: HouseholdSummary }) {
  const ipsTitleId = useId()
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Pane title="Managed accounts" meta={`${fmtMoney(summary.managedValue)} ${UNIT.usd}`}>
        <AccountsTable caption="Household accounts" accounts={summary.accounts} totalValue={summary.managedValue} totalLabel="Managed" tiesTo="the household total" />
      </Pane>
      <Pane title="Held away · outside the firm's view" meta={`${fmtMoney(summary.heldAwayValue)} ${UNIT.usd}`}>
        <p className="text-body text-ink-2">{heldAwayPolicy(summary.heldAway)}</p>
        <DataTable caption="Held-away accounts" rows={summary.heldAway} getRowId={(h) => h.id} total={summary.heldAway.length}
          noun={{ singular: 'account', plural: 'accounts' }}
          columns={[
            { id: 'owner', header: 'Owner', cell: (h) => h.ownerName },
            { id: 'institution', header: 'Institution', cell: (h) => h.institution },
            { id: 'plan', header: 'Plan', cell: (h) => h.accountType },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (h) => <Num text={fmtMoney(h.value)} />, sortValue: (h) => h.value },
            { id: 'reported', header: 'Reported', cell: (h) => fmtDayMonthYear(h.reportedOn) },
          ]} />
      </Pane>
      <Pane title="Plan goals" meta={summary.planProbability !== undefined ? `Plan probability ${fmtWeight(summary.planProbability)} ${UNIT.pct}` : undefined}>
        <DataTable caption="Plan goals" rows={summary.goals} getRowId={(g) => g.id} total={summary.goals.length} noun={{ singular: 'goal', plural: 'goals' }}
          columns={[
            { id: 'goal', header: 'Goal', cell: (g) => g.name },
            { id: 'probability', header: 'Probability', unit: UNIT.pct, align: 'right', cell: (g) => <Num text={fmtWeight(g.probability)} />, sortValue: (g) => g.probability },
            { id: 'funded', header: 'Funded', unit: UNIT.pct, align: 'right', cell: (g) => <Num text={fmtWeight(g.funded)} />, sortValue: (g) => g.funded },
            { id: 'status', header: 'Status', cell: (g) => <Tag tone={g.status === 'on_track' ? 'outline' : 'solid'}>{GOAL_STATUS_TAG[g.status]}</Tag> },
          ]} />
      </Pane>
      <Pane title="Wash-sale windows · the taxpayer">
        {summary.windows.length === 0 ? <p className="text-body text-ink-3">No open window.</p> : (
          <DataTable caption="Open wash-sale windows" rows={summary.windows} getRowId={(w) => w.saleId} total={summary.windows.length}
            noun={{ singular: 'window', plural: 'windows' }}
            columns={[
              { id: 'symbol', header: 'Symbol', cell: (w) => w.symbol },
              { id: 'account', header: 'Sold in', cell: (w) => w.accountName },
              { id: 'sold', header: 'Sold', cell: (w) => fmtDayMonthYear(w.saleDate) },
              { id: 'loss', header: 'Loss', unit: UNIT.usd, align: 'right', cell: (w) => <Num text={fmtResult(w.loss)} /> },
              { id: 'through', header: 'Through', cell: (w) => fmtDayMonthYear(w.through) },
            ]} />
        )}
      </Pane>
      <section aria-labelledby={ipsTitleId} className="flex min-w-0 flex-col gap-3">
        <div className="border-b border-ink pb-2"><h2 id={ipsTitleId} className="text-label uppercase text-ink-2">IPS and open items</h2></div>
        <p className="text-body">{ipsLine(summary.ips)}</p>
        {summary.openItems.length === 0 ? <p className="text-body text-ink-3">No open items.</p> : (
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {summary.openItems.map((i) => <li key={i.id} className="text-body">{i.text}</li>)}
          </ul>
        )}
      </section>
    </div>
  )
}
