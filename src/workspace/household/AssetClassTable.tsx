import { createContext, useContext, useState } from 'react'
import { DataTable } from '@/kit/data-table/DataTable'
import type { Column } from '@/kit/data-table/types'
import { Num } from '@/kit/data-table/Num'
import { StatusCode } from '@/kit/status/StatusCode'
import { Button } from '@/kit/button/Button'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtDayMonthYear, fmtDrift, fmtMoney, fmtTolerance, fmtWeight } from '@/kit/measure'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { AssetClassRow, HouseholdHoldings } from '@/types/workspace-household'
import { holdingOrderWords, ordersCellWords } from './holding-words'

type Disclosure = { open: AssetClassRow['assetClass'] | undefined; toggle: (assetClass: AssetClassRow['assetClass']) => void }
const DisclosureContext = createContext<Disclosure | undefined>(undefined)

/** The class name, as the button that opens its accounts. Read from context so the columns below keep one identity and the button keeps focus. */
function ClassToggle({ assetClass }: { assetClass: AssetClassRow['assetClass'] }) {
  const disclosure = useContext(DisclosureContext)
  if (!disclosure) throw new Error('A class toggle belongs inside the asset class table')
  return (
    <Button rank="quiet" className="coarse:min-w-11" aria-expanded={assetClass === disclosure.open} aria-controls={holdersId(assetClass)} onClick={() => disclosure.toggle(assetClass)}>
      {assetClassLabel(assetClass)}
    </Button>
  )
}

/**
 * Drift and its status follow the class name, so a phone that scrolls sideways shows how far off each class is before the figures.
 * The weight sits under the value and the class's order count under its name, so every column fits the main column at 1024px.
 */
const COLUMNS: Column<AssetClassRow>[] = [
  { id: 'class', header: 'Asset class', wrap: true, cell: (r) => (
    <span className="flex flex-col items-start">
      <ClassToggle assetClass={r.assetClass} />
      {ordersCellWords(r) ? <span className="tabular text-label text-ink-3">{ordersCellWords(r)}</span> : null}
    </span>
  ) },
  { id: 'drift', header: 'Drift', unit: UNIT.pp, align: 'right', cell: (r) => <Num text={fmtDrift(r.drift)} />, sortValue: (r) => Math.abs(r.drift) },
  { id: 'status', header: 'Status, band', cell: (r) => (
    <span className="inline-flex items-baseline gap-2">
      <StatusCode status={r.withinBand ? 'IN' : 'OUT'} label={r.withinBand ? 'inside its band' : 'outside its band'} />
      <span className="tabular">{`${fmtTolerance(r.band)} ${UNIT.pp}`}</span>
    </span>
  ) },
  { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (r) => (
    <span className="flex flex-col items-end">
      <Num text={fmtMoney(r.value)} />
      <span className="tabular text-label text-ink-3">{`${fmtWeight(r.weight)}${UNIT.pct} weight`}</span>
    </span>
  ), sortValue: (r) => r.value },
  { id: 'target', header: 'Target', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtWeight(r.target)} /> },
]

/** The household's model-managed holdings by asset class against its target; a class opens onto the accounts holding it. */
export function AssetClassTable({ holdings, asOf }: { holdings: HouseholdHoldings; asOf: string }) {
  const [open, setOpen] = useState<AssetClassRow['assetClass'] | undefined>(undefined)
  const expanded = holdings.rows.find((r) => r.assetClass === open)
  const disclosure: Disclosure = { open, toggle: (assetClass) => setOpen((o) => (o === assetClass ? undefined : assetClass)) }
  return (
    <DisclosureContext.Provider value={disclosure}>
      <div className="flex min-w-0 flex-col gap-3">
        <DataTable caption="Holdings by asset class" rows={holdings.rows} getRowId={(r) => r.assetClass} noun={{ singular: 'asset class', plural: 'asset classes' }}
          columns={COLUMNS}
          totals={{
            label: 'On a model',
            tiesTo: { label: `the household's model-managed accounts, ${fmtMoney(holdings.modelValue)} ${UNIT.usd}`, expected: holdings.modelValue, actual: holdings.rows.reduce((s, r) => s + r.value, 0) },
            cells: { value: fmtMoney(holdings.modelValue) },
          }} />
        <p className="text-label text-ink-3">A class name opens the accounts holding it.</p>
        {expanded ? <ClassHolders row={expanded} asOf={asOf} /> : null}
        {holdings.notInTarget.length > 0 ? (
          <ul aria-label="Outside the target" className="flex flex-col gap-2">
            {holdings.notInTarget.map((a) => (
              <li key={a.accountId} className="flex flex-col gap-1">
                <span className="tabular text-body text-ink-2">{`${a.name} · ${fmtMoney(a.value)} ${UNIT.usd} · custom mandate, outside the target: ${a.mandateSummary}`}</span>
                {a.orders.map((o) => <span key={o.id} className="tabular text-body text-ink-2">{holdingOrderWords(o, asOf)}</span>)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </DisclosureContext.Provider>
  )
}

const holdersId = (assetClass: AssetClassRow['assetClass']) => `holders-${assetClass}`

function ClassHolders({ row, asOf }: { row: AssetClassRow; asOf: string }) {
  const label = `${assetClassLabel(row.assetClass)} · accounts holding it`
  return (
    <section id={holdersId(row.assetClass)} aria-label={label} className="flex min-w-0 flex-col gap-2 border-l-2 border-ink pl-4">
      <h3 className="text-label uppercase text-ink-2">{label}</h3>
      <ul className="flex flex-col gap-2">
        {row.holders.map((h) => (h.kind === 'managed' ? (
          <li key={h.accountId} className="flex flex-col gap-1">
            <span className="tabular text-body">{`${h.name} · ${fmtMoney(h.value)} ${UNIT.usd} · ${fmtWeight(h.weightInAccount)}% of the account`}</span>
            {h.orders.map((o) => <span key={o.id} className="tabular text-body text-ink-2">{holdingOrderWords(o, asOf)}</span>)}
          </li>
        ) : (
          <li key={h.heldAwayId} className="flex flex-wrap items-baseline gap-2">
            <span className="tabular text-body text-ink-2">{`${h.name} (${h.ownerName}) · ${fmtMoney(h.value)} ${UNIT.usd} as reported ${fmtDayMonthYear(h.reportedOn)} · outside the firm's view, not in the total`}</span>
            <Tag>HELD AWAY</Tag>
          </li>
        )))}
      </ul>
    </section>
  )
}
