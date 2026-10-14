import { Link, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Select } from '@/kit/select/Select'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtDate, fmtMoney, fmtPrice, fmtQuantity, fmtTimestamp } from '@/kit/measure'
import { useBlotter } from '@/hooks/use-reference'
import { SIDE_WORDS } from '@/workspace/proposal/leg-status'
import { BLOTTER_STATUSES, isBlotterStatus, type BlotterFilters, type BlotterRow, type BlotterView } from '@/types/reference-blotter'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { StackedCell } from './StackedCell'
import { TakeToTeamThread } from './TakeToTeamThread'
import { BLOTTER_STATUS_TAG, BLOTTER_STATUS_WORDS } from './reference-words'

type FilterKey = 'status' | 'accountId' | 'since' | 'until'

/** "1,200 sh", "5 contracts", "50,000 USD par". */
const quantityText = (r: BlotterRow) => (r.quantityUnit === 'par' ? `${fmtMoney(r.quantity)} ${UNIT.usd} ${UNIT.par}` : `${fmtQuantity(r.quantity)} ${UNIT[r.quantityUnit === 'sh' ? 'shares' : 'contracts']}`)

function filtersFrom(params: URLSearchParams): BlotterFilters {
  const read = (key: string) => params.get(key) || undefined
  const status = read('status')
  return {
    ...(isBlotterStatus(status) ? { status } : {}),
    ...(read('accountId') ? { accountId: read('accountId') } : {}),
    ...(read('since') ? { since: read('since') } : {}),
    ...(read('until') ? { until: read('until') } : {}),
  }
}

export function BlotterPage() {
  const [params] = useSearchParams()
  const blotter = useBlotter(filtersFrom(params))
  return <ReferenceGate query={blotter} subject="Blotter">{(view) => <Blotter view={view} />}</ReferenceGate>
}

function Blotter({ view }: { view: BlotterView }) {
  const [params, setParams] = useSearchParams()
  const set = (key: FilterKey) => (value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const dayOptions = (none: string) => [{ value: '', label: none }, ...view.days.map((d) => ({ value: d, label: fmtDate(d) }))]
  return (
    <ReferencePage title="Blotter" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Every order across accounts · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Select label="Status" value={view.filters.status ?? ''} onChange={set('status')}
          options={[{ value: '', label: 'All statuses' }, ...BLOTTER_STATUSES.map((s) => ({ value: s, label: BLOTTER_STATUS_WORDS[s] }))]} />
        <Select label="Account" value={view.filters.accountId ?? ''} onChange={set('accountId')}
          options={[{ value: '', label: 'All accounts' }, ...view.accounts.map((a) => ({ value: a.id, label: a.name }))]} />
        <Select label="Since" value={view.filters.since ?? ''} onChange={set('since')} options={dayOptions('Any day')} />
        <Select label="Through" value={view.filters.until ?? ''} onChange={set('until')} options={dayOptions('Any day')} />
        <Reading label="Orders shown" value={fmtQuantity(view.rows.length)} />
      </div>
      <Pane title="Orders">
        <DataTable caption="Orders" rows={view.rows} getRowId={(r) => r.id} noun={{ singular: 'order', plural: 'orders' }} density="dense"
          columns={[
            { id: 'id', header: 'Order', wrap: true, cell: (r) => <StackedCell primary={r.id} action={<TakeToTeamThread inline view="blotter" rowId={r.id} rowLabel={r.id} />} /> },
            { id: 'status', header: 'Status', cell: (r) => <Tag tone={r.status === 'filled' ? 'solid' : 'outline'}>{BLOTTER_STATUS_TAG[r.status]}</Tag> },
            { id: 'account', header: 'Account', wrap: true, cell: (r) => r.accountName },
            {
              id: 'submitted', header: 'Submitted · filled', wrap: true, sortValue: (r) => r.submittedAt,
              cell: (r) => <StackedCell primary={fmtTimestamp(r.submittedAt)} secondary={r.filledAt ? `Filled ${fmtTimestamp(r.filledAt)}` : undefined} />,
            },
            { id: 'side', header: 'Side', cell: (r) => SIDE_WORDS[r.side] },
            { id: 'symbol', header: 'Symbol', cell: (r) => r.symbol },
            { id: 'qty', header: 'Qty', align: 'right', cell: (r) => <span className="whitespace-nowrap"><Num text={quantityText(r)} /></span> },
            { id: 'price', header: 'Price', align: 'right', cell: (r) => (r.price === undefined ? null : <span className="whitespace-nowrap"><Num text={fmtPrice(r.price)} />{` ${r.currency}`}{r.priceKind === 'limit' ? ' limit' : ''}</span>) },
            { id: 'value', header: 'Value', align: 'right', cell: (r) => (r.value === undefined ? null : <span className="whitespace-nowrap"><Num text={fmtMoney(r.value)} />{` ${r.currency}`}</span>) },
            {
              id: 'source', header: 'Source · REC', wrap: true, cell: (r) => (
                <StackedCell primary={r.source.kind === 'ticket' ? 'Ticket' : (
                  <Link to={`/t/${encodeURIComponent(r.source.threadId)}`} className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink">{`${r.source.title} v${r.source.version}`}</Link>
                )} secondary={r.recId} />
              ),
            },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
