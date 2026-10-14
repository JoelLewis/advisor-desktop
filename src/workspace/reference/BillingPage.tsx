import { useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Select } from '@/kit/select/Select'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtDate, fmtMoney, fmtRate, fmtTimestamp } from '@/kit/measure'
import { useBilling } from '@/hooks/use-reference'
import type { BillingView, HouseholdBilling } from '@/types/reference-billing'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { StackedCell } from './StackedCell'
import { TakeToTeamThread } from './TakeToTeamThread'
import { BILLING_METHOD_WORDS, SEGMENT_WORDS, wordFor } from './reference-words'

export function BillingPage() {
  const billing = useBilling()
  return <ReferenceGate query={billing} subject="Billing">{(view) => <Billing view={view} />}</ReferenceGate>
}

const usd = (v: number) => <Num text={fmtMoney(v)} />

function Billing({ view }: { view: BillingView }) {
  const [params, setParams] = useSearchParams()
  const set = (key: string) => (value: string) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }
  const household = view.households.find((h) => h.householdId === params.get('household')) ?? view.households[0]
  const run = view.runs.find((r) => r.id === params.get('run')) ?? view.runs[0]
  return (
    <ReferencePage title="Billing" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`${view.schedule.name} schedule · billed quarterly · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Annual fees on today's value" value={fmtMoney(view.totals.annualFee)} unit={UNIT.usd} size="readout-md" />
        <Reading label="A quarter" value={fmtMoney(view.totals.quarterlyFee)} unit={UNIT.usd} size="readout-md" />
        <Reading label="Effective rate" value={fmtRate(view.totals.effectiveRate)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Value billed on" value={fmtMoney(view.totals.value)} unit={UNIT.usd} size="readout-md" />
      </div>
      <Pane title="The schedule">
        <DataTable caption="Fee schedule" rows={view.schedule.tiers} getRowId={(t) => `tier-${t.rate}`} noun={{ singular: 'tier', plural: 'tiers' }} density="dense"
          columns={[
            { id: 'from', header: 'From', unit: UNIT.usd, align: 'right', cell: (t) => usd(t.from) },
            { id: 'upTo', header: 'Up to', unit: UNIT.usd, align: 'right', cell: (t) => (t.upTo === null ? 'and above' : usd(t.upTo)) },
            { id: 'rate', header: 'Rate', unit: UNIT.pct, align: 'right', cell: (t) => <Num text={fmtRate(t.rate)} /> },
          ]} />
      </Pane>
      <Pane title="Households" meta="On today's value">
        <DataTable caption="Households" rows={view.households} getRowId={(h) => h.householdId} noun={{ singular: 'household', plural: 'households' }}
          totals={{
            label: 'Total',
            tiesTo: { label: 'Σ household annual fees', expected: view.totals.annualFee, actual: view.households.reduce((s, h) => s + h.annualFee, 0) },
            cells: { value: usd(view.totals.value), annual: usd(view.totals.annualFee), quarterly: usd(view.totals.quarterlyFee) },
          }}
          columns={[
            { id: 'name', header: 'Household', wrap: true, cell: (h) => <StackedCell primary={h.householdName} action={<TakeToTeamThread inline view="billing" rowId={h.householdId} rowLabel={h.householdName} />} /> },
            { id: 'segment', header: 'Segment', cell: (h) => wordFor(SEGMENT_WORDS, h.segment) },
            { id: 'method', header: 'Billing', cell: (h) => BILLING_METHOD_WORDS[h.method] },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.value), sortValue: (h) => h.value },
            { id: 'annual', header: 'Annual fee', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.annualFee), sortValue: (h) => h.annualFee },
            { id: 'rate', header: 'Effective', unit: UNIT.pct, align: 'right', cell: (h) => <Num text={fmtRate(h.effectiveRate)} />, sortValue: (h) => h.effectiveRate },
            { id: 'quarterly', header: 'A quarter', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.quarterlyFee) },
            { id: 'exceptions', header: 'Exceptions', cell: (h) => (h.openExceptionIds.length > 0 ? <Tag>{h.openExceptionIds.join(' · ')}</Tag> : null) },
          ]} />
      </Pane>
      {household ? <TierBreakdown households={view.households} household={household} onPick={set('household')} /> : null}
      <Pane title="Billing runs" meta="Modeled, not realized">
        <DataTable caption="Billing runs" rows={view.runs} getRowId={(r) => r.id} noun={{ singular: 'run', plural: 'runs' }} density="dense"
          columns={[
            { id: 'run', header: 'Run', cell: (r) => fmtDate(r.runDate) },
            { id: 'valued', header: 'Valued at', cell: (r) => fmtDate(r.valuationDate) },
            { id: 'advance', header: 'In advance', cell: (r) => r.advanceQuarter },
            { id: 'arrears', header: 'In arrears', cell: (r) => r.arrearsQuarter },
            { id: 'total', header: 'Total', unit: UNIT.usd, align: 'right', cell: (r) => usd(r.total) },
            { id: 'exceptions', header: 'Exceptions', cell: (r) => r.exceptionIds.join(' · ') },
          ]} />
        {run ? (
          <>
            <Select label="Run" value={run.id} onChange={set('run')} options={view.runs.map((r) => ({ value: r.id, label: `Run of ${fmtDate(r.runDate)}` }))} />
            <DataTable caption={`Run of ${fmtDate(run.runDate)}`} rows={run.households} getRowId={(h) => h.householdId} noun={{ singular: 'household', plural: 'households' }} density="dense"
              totals={{ label: 'Run total', tiesTo: { label: 'Σ household fees', expected: run.total, actual: run.households.reduce((s, h) => s + h.fee, 0) }, cells: { fee: usd(run.total) } }}
              columns={[
                { id: 'name', header: 'Household', cell: (h) => h.householdName },
                { id: 'method', header: 'Billing', cell: (h) => BILLING_METHOD_WORDS[h.method] },
                { id: 'covers', header: 'Covers', cell: (h) => h.covers },
                { id: 'valuation', header: 'Modeled valuation', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.valuation) },
                { id: 'fee', header: 'Fee', unit: UNIT.usd, align: 'right', cell: (h) => usd(h.fee) },
              ]} />
          </>
        ) : null}
      </Pane>
      <Pane title="Exceptions">
        <ul aria-label="Billing exceptions" className="flex flex-col gap-3">
          {view.exceptions.map((e) => (
            <li key={e.id} className="flex min-w-0 flex-col gap-1 border-b border-rule pb-3 last:border-b-0">
              <span className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-body font-semibold">{`${e.id} · ${e.householdName}`}</span>
                <Tag tone={e.resolvedAt ? 'outline' : 'solid'}>{e.resolvedAt ? 'RESOLVED' : 'OPEN'}</Tag>
                <span className="tabular ml-auto text-label text-ink-3">{`Opened ${fmtTimestamp(e.openedAt)}${e.resolvedAt ? ` · resolved ${fmtTimestamp(e.resolvedAt)}` : ''}`}</span>
              </span>
              <span className="text-copy text-ink-2">{e.description}</span>
            </li>
          ))}
        </ul>
      </Pane>
    </ReferencePage>
  )
}

function TierBreakdown({ households, household, onPick }: { households: HouseholdBilling[]; household: HouseholdBilling; onPick: (id: string) => void }) {
  return (
    <Pane title="Tier breakdown" meta={household.householdName}>
      <Select label="Household" value={household.householdId} onChange={onPick} options={households.map((h) => ({ value: h.householdId, label: h.householdName }))} />
      <DataTable caption={`Tier breakdown · ${household.householdName}`} rows={household.tiers} getRowId={(t) => `tier-${t.rate}`} noun={{ singular: 'tier', plural: 'tiers' }} density="dense"
        totals={{ label: 'Annual fee', tiesTo: { label: 'Σ tier fees', expected: household.annualFee, actual: household.tiers.reduce((s, t) => s + t.fee, 0) }, cells: { fee: usd(household.annualFee) } }}
        columns={[
          { id: 'tier', header: 'Tier', cell: (t) => (t.upTo === null ? `${fmtMoney(t.from)} and above` : `${fmtMoney(t.from)} to ${fmtMoney(t.upTo)}`) },
          { id: 'rate', header: 'Rate', unit: UNIT.pct, align: 'right', cell: (t) => <Num text={fmtRate(t.rate)} /> },
          { id: 'slice', header: 'Slice', unit: UNIT.usd, align: 'right', cell: (t) => usd(t.slice) },
          { id: 'fee', header: 'Fee', unit: UNIT.usd, align: 'right', cell: (t) => usd(t.fee) },
        ]} />
      {household.nextTier ? (
        <p className="tabular text-body text-ink-2">{`Next tier at ${fmtMoney(household.nextTier.at)} ${UNIT.usd}: ${fmtRate(household.nextTier.rate)}${UNIT.pct} on the slice above it.`}</p>
      ) : null}
    </Pane>
  )
}
