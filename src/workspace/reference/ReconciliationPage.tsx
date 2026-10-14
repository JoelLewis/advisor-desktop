import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtMoney, fmtQuantity, fmtResult, fmtTimestamp, fmtWeight } from '@/kit/measure'
import { useDirectory } from '@/hooks/use-workspace'
import { useReconciliation } from '@/hooks/use-reference'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { RESOLUTION_WORDS, type ReconBreakView, type ReconciliationView } from '@/types/reference-reconciliation'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { ResolveBreak } from './ResolveBreak'
import { TakeToTeamThread } from './TakeToTeamThread'
import { INTEGRATION_STATUS_TAG, MATCH_KIND_WORDS, SEVERITY_WORDS } from './reference-words'

export function ReconciliationPage() {
  const recon = useReconciliation()
  return <ReferenceGate query={recon} subject="Reconciliation">{(view) => <Reconciliation view={view} />}</ReferenceGate>
}

const figure = (b: ReconBreakView, v: number) => <Num text={b.unit === 'USD' ? fmtMoney(v) : fmtQuantity(v)} />

function Reconciliation({ view }: { view: ReconciliationView }) {
  const [params] = useSearchParams()
  const { viewerId } = useViewer()
  const directory = useDirectory()
  const canResolve = directory.data?.permissions[viewerId]?.includes('resolve_break') === true
  const [recorded, setRecorded] = useState<string>()
  return (
    <ReferencePage title="Reconciliation" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Book against custodian · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Open breaks" value={fmtQuantity(view.summary.openBreaks)} size="readout-md" />
        <Reading label="Resolved today" value={fmtQuantity(view.summary.resolvedToday)} size="readout-md" />
        {view.summary.rates.map((r) => (
          <Reading key={r.kind} label={`${MATCH_KIND_WORDS[r.kind]} matched`} value={fmtWeight(r.rate)} unit={UNIT.pct} size="readout-md"
            limit={`${fmtQuantity(r.checked)} checked · ${fmtQuantity(r.open)} open`} />
        ))}
      </div>
      {!canResolve ? <p className="text-body text-ink-2">Resolving a break is for the advisor and client service; you can read the breaks and take one to a team thread.</p> : null}
      {recorded ? <p role="status" className="text-body">{`Resolved · ${recorded}`}</p> : null}
      <Pane title="Breaks">
        <DataTable caption="Breaks" rows={view.breaks} getRowId={(b) => b.id} noun={{ singular: 'break', plural: 'breaks' }}
          mutedRow={(b) => b.status === 'resolved'}
          columns={[
            { id: 'id', header: 'Break', cell: (b) => b.id },
            { id: 'account', header: 'Account', wrap: true, cell: (b) => b.accountName },
            { id: 'custodian', header: 'Custodian', cell: (b) => b.custodian },
            { id: 'field', header: 'Field', cell: (b) => (b.symbol ? `${b.fieldLabel} · ${b.symbol}` : b.fieldLabel) },
            { id: 'book', header: 'Book', align: 'right', cell: (b) => figure(b, b.book) },
            { id: 'theirs', header: 'Custodian says', align: 'right', cell: (b) => figure(b, b.custodianValue) },
            { id: 'difference', header: 'Difference', align: 'right', cell: (b) => <Num text={fmtResult(b.difference)} /> },
            { id: 'severity', header: 'Severity', cell: (b) => SEVERITY_WORDS[b.severity] },
            { id: 'detected', header: 'Detected', cell: (b) => fmtTimestamp(b.detectedAt), sortValue: (b) => b.detectedAt },
            {
              id: 'status', header: 'Status', wrap: true, cell: (b) => (
                <span className="flex flex-col gap-1">
                  <Tag tone={b.status === 'open' ? 'solid' : 'outline'}>{b.status === 'open' ? 'OPEN' : 'RESOLVED'}</Tag>
                  {b.resolution ? <span className="text-label text-ink-2">{`${RESOLUTION_WORDS[b.resolution.resolution]} · ${b.resolution.actorName} · ${b.resolution.actId}`}</span>
                    : b.resolvedAt ? <span className="text-label text-ink-3">{`Before this session · ${fmtTimestamp(b.resolvedAt)}`}</span> : null}
                </span>
              ),
            },
            {
              id: 'actions', header: 'Actions', cell: (b) => (
                <span className="flex flex-wrap gap-2">
                  {b.status === 'open' && canResolve ? <ResolveBreak brk={b} onRecorded={setRecorded} /> : null}
                  <TakeToTeamThread view="reconciliation" rowId={b.id} rowLabel={b.id} />
                </span>
              ),
            },
          ]} />
      </Pane>
      <Pane title="Integrations">
        <DataTable caption="Integrations" rows={view.integrations} getRowId={(i) => i.name} noun={{ singular: 'integration', plural: 'integrations' }} density="dense"
          columns={[
            { id: 'name', header: 'Feed', cell: (i) => i.name },
            { id: 'kind', header: 'Kind', cell: (i) => (i.kind === 'custodian' ? 'Custodian' : 'Planning') },
            { id: 'status', header: 'Status', cell: (i) => <Tag tone={i.status === 'synced' ? 'outline' : 'solid'}>{INTEGRATION_STATUS_TAG[i.status]}</Tag> },
            { id: 'sync', header: 'Last sync', cell: (i) => (i.lastSync ? fmtTimestamp(i.lastSync) : 'Never') },
            { id: 'open', header: 'Open breaks', align: 'right', cell: (i) => <Num text={fmtQuantity(i.openBreaks)} /> },
          ]} />
        <ol aria-label="Integration log" className="flex flex-col gap-2">
          {view.integrations.flatMap((i) => i.log).sort((a, b) => b.at.localeCompare(a.at)).map((e) => (
            <li key={`${e.integration}-${e.at}`} className="flex min-w-0 flex-wrap items-baseline gap-x-3 text-body">
              <span className="tabular text-label text-ink-3">{fmtTimestamp(e.at)}</span>
              <span className="font-semibold">{e.integration}</span>
              <Tag>{INTEGRATION_STATUS_TAG[e.status]}</Tag>
              <span className="text-ink-2">{e.detail}</span>
            </li>
          ))}
        </ol>
      </Pane>
      <Pane title="30-day trend" meta="End of day; today as it stands">
        <DataTable caption="30-day trend" rows={[...view.trend].reverse()} getRowId={(p) => p.date} noun={{ singular: 'day', plural: 'days' }} density="dense"
          columns={[
            { id: 'date', header: 'Day', cell: (p) => p.date },
            { id: 'open', header: 'Open breaks', align: 'right', cell: (p) => <Num text={fmtQuantity(p.openBreaks)} /> },
            { id: 'positions', header: 'Positions', unit: UNIT.pct, align: 'right', cell: (p) => <Num text={fmtWeight(p.positions)} /> },
            { id: 'cash', header: 'Cash', unit: UNIT.pct, align: 'right', cell: (p) => <Num text={fmtWeight(p.cash)} /> },
            { id: 'transactions', header: 'Transactions', unit: UNIT.pct, align: 'right', cell: (p) => <Num text={fmtWeight(p.transactions)} /> },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
