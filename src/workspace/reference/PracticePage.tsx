import { useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { Reading } from '@/kit/reading/Reading'
import { UNIT, fmtBasisPoints, fmtDayMonthYear, fmtMoney, fmtQuantity, fmtRatio, fmtEasternStamp, fmtWeight } from '@/kit/measure'
import { usePractice } from '@/hooks/use-reference'
import type { PracticeView } from '@/types/reference-practice'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { StackedCell } from './StackedCell'
import { TakeToTeamThread } from './TakeToTeamThread'
import { SEGMENT_WORDS, wordFor } from './reference-words'

export function PracticePage() {
  const practice = usePractice()
  return <ReferenceGate query={practice} subject="Practice">{(view) => <Practice view={view} />}</ReferenceGate>
}

const usd = (v: number) => <Num text={fmtMoney(v)} />

function Practice({ view }: { view: PracticeView }) {
  const [params] = useSearchParams()
  return (
    <ReferencePage title="Practice" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Revenue and the book of business · as of ${fmtEasternStamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Book value" value={fmtMoney(view.book.value)} unit={UNIT.usd} size="readout-md" />
        <Reading label="Annual revenue, run rate" value={fmtMoney(view.revenue.annual)} unit={UNIT.usd} size="readout-md" />
        <Reading label="Effective fee" value={fmtBasisPoints(view.revenue.effectiveRate)} unit={UNIT.bps} size="readout-md" />
        <Reading label="Households" value={fmtQuantity(view.book.households)} size="readout-md" />
        <Reading label="Clients" value={fmtQuantity(view.book.clients)} size="readout-md" />
        <Reading label="Accounts" value={fmtQuantity(view.book.accounts)} size="readout-md" />
      </div>
      <p className="tabular flex flex-wrap items-baseline gap-x-3 text-body text-ink-2">
        <span>{`Latest billing run, ${fmtDayMonthYear(view.revenue.lastRun.runDate)}: ${fmtMoney(view.revenue.lastRun.total)} ${UNIT.usd}, on quarter-end values.`}</span>
        <Tag>MODELED</Tag>
      </p>
      <Pane title="Households">
        <DataTable caption="Households by value" rows={view.households} getRowId={(h) => h.householdId} noun={{ singular: 'household', plural: 'households' }}
          columns={[
            { id: 'name', header: 'Household', wrap: true, cell: (h) => <StackedCell primary={h.name} action={<TakeToTeamThread inline view="practice" rowId={h.householdId} rowLabel={h.name} />} /> },
            { id: 'segment', header: 'Segment', cell: (h) => wordFor(SEGMENT_WORDS, h.segment) },
            { id: 'since', header: 'Client since', cell: (h) => fmtDayMonthYear(h.since), sortValue: (h) => h.since },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.value), sortValue: (h) => h.value },
            { id: 'fee', header: 'Annual fee', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.annualFee), sortValue: (h) => h.annualFee },
            { id: 'rate', header: 'Effective', unit: UNIT.bps, align: 'right', cell: (h) => <Num text={fmtBasisPoints(h.effectiveRate)} /> },
            { id: 'share', header: 'Of revenue', unit: UNIT.pct, align: 'right', cell: (h) => <Num text={fmtWeight(h.shareOfRevenue)} />, proportion: (h) => h.shareOfRevenue },
          ]} />
      </Pane>
      <Pane title="By segment">
        <DataTable caption="By segment" rows={view.bySegment} getRowId={(s) => s.segment} noun={{ singular: 'segment', plural: 'segments' }} density="dense"
          columns={[
            { id: 'segment', header: 'Segment', cell: (s) => wordFor(SEGMENT_WORDS, s.segment) },
            { id: 'households', header: 'Households', align: 'right', cell: (s) => <Num text={fmtQuantity(s.households)} /> },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (s) => usd(s.value) },
            { id: 'fee', header: 'Annual fee', unit: UNIT.usd, align: 'right', cell: (s) => usd(s.annualFee) },
            { id: 'rate', header: 'Effective', unit: UNIT.bps, align: 'right', cell: (s) => <Num text={fmtBasisPoints(s.effectiveRate)} /> },
          ]} />
      </Pane>
      <div className="grid gap-6 split:grid-cols-2">
        <Pane title="By account type">
          <DataTable caption="By account type" rows={view.byAccountType} getRowId={(r) => r.type} noun={{ singular: 'type', plural: 'types' }} density="dense"
            columns={[
              { id: 'type', header: 'Type', cell: (r) => r.type },
              { id: 'accounts', header: 'Accounts', align: 'right', cell: (r) => <Num text={fmtQuantity(r.accounts)} /> },
              { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (r) => usd(r.value) },
            ]} />
        </Pane>
        <Pane title="By custodian">
          <DataTable caption="By custodian" rows={view.byCustodian} getRowId={(r) => r.custodian} noun={{ singular: 'custodian', plural: 'custodians' }} density="dense"
            columns={[
              { id: 'custodian', header: 'Custodian', cell: (r) => r.custodian },
              { id: 'accounts', header: 'Accounts', align: 'right', cell: (r) => <Num text={fmtQuantity(r.accounts)} /> },
              { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (r) => usd(r.value) },
            ]} />
        </Pane>
        <Pane title="Tenure">
          <DataTable caption="Tenure" rows={view.tenure} getRowId={(t) => t.bucket} noun={{ singular: 'bucket', plural: 'buckets' }} density="dense"
            columns={[
              { id: 'bucket', header: 'With the firm', cell: (t) => t.bucket },
              { id: 'households', header: 'Households', align: 'right', cell: (t) => <Num text={fmtQuantity(t.households)} /> },
            ]} />
        </Pane>
        <Pane title="Concentration">
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <Reading label="HHI of household shares" value={fmtQuantity(view.concentration.hhi)} />
            <Reading label="Effective number of households" value={fmtRatio(view.concentration.effectiveN)} />
          </div>
        </Pane>
      </div>
    </ReferencePage>
  )
}
