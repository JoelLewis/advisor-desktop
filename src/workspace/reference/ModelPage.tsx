import { Link, useParams, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtDayMonthYear, fmtMoney, fmtQuantity, fmtEasternStamp, fmtTolerance, fmtWeight } from '@/kit/measure'
import { useReferenceModel } from '@/hooks/use-reference'
import { accountFullViewHref } from '@/workspace/full-views/full-view-href'
import type { ModelDetail } from '@/types/reference-models'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { StackedCell } from './StackedCell'
import { TakeToTeamThread } from './TakeToTeamThread'
import { FREQUENCY_WORDS, sleeveLabel, versionWords, wordFor } from './reference-words'
import { TABLE_LINK_TARGET } from '@/kit/link-target'

export function ModelPage() {
  const { modelId } = useParams()
  if (!modelId) throw new Error('The model route needs a model id')
  return <ModelGate key={modelId} modelId={modelId} />
}

function ModelGate({ modelId }: { modelId: string }) {
  const model = useReferenceModel(modelId)
  return <ReferenceGate query={model} subject="Model">{(view) => <Model view={view} />}</ReferenceGate>
}

function Model({ view }: { view: ModelDetail }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <ReferencePage title={view.name} from={params.get('from')} methods={view.methods}
      lead={(
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="text-body text-ink-2">{`${view.description} · ${view.riskLabel} · against the ${view.benchmark.name} · ${versionWords(view)} · as of ${fmtEasternStamp(view.asOf)}`}</p>
          <TakeToTeamThread view="models" rowId={view.id} rowLabel={view.name} />
        </div>
      )}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Accounts" value={fmtQuantity(view.assignedAccounts)} size="readout-md" />
        <Reading label="Value" value={fmtMoney(view.totalValue)} unit={UNIT.usd} size="readout-md" />
        <Reading label="Equity" value={fmtWeight(view.equityShare)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Volatility" value={fmtWeight(view.volatility)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Drift band" value={fmtTolerance(view.driftTolerance)} unit={UNIT.pp} size="readout-md" limit={wordFor(FREQUENCY_WORDS, view.rebalanceFrequency)} />
      </div>
      <Pane title="Targets">
        <DataTable caption="Targets" rows={view.targets} getRowId={(t) => t.assetClass} noun={{ singular: 'sleeve', plural: 'sleeves' }} density="dense"
          columns={[
            { id: 'class', header: 'Sleeve', cell: (t) => sleeveLabel(t.assetClass) },
            { id: 'target', header: 'Target', unit: UNIT.pct, align: 'right', cell: (t) => <Num text={fmtWeight(t.targetWeight)} /> },
            { id: 'vehicle', header: 'Vehicle', cell: (t) => t.implementationSymbol ?? 'Cash' },
            { id: 'index', header: 'Benchmark index', cell: (t) => t.index },
          ]} />
      </Pane>
      <Pane title="Version history" meta="Investment Committee record">
        <DataTable caption="Version history" rows={[...view.versions].reverse()} getRowId={(v) => `v${v.version}`} noun={{ singular: 'version', plural: 'versions' }}
          columns={[
            { id: 'version', header: 'Version', wrap: true, cell: (v) => <StackedCell primary={`v${v.version}`} action={<TakeToTeamThread inline view="models" rowId={`${view.id}:v${v.version}`} rowLabel={`${view.name} v${v.version}`} />} /> },
            { id: 'status', header: 'Status', cell: (v) => <Tag tone={v.status === 'approved' ? 'outline' : 'solid'}>{v.status === 'approved' ? 'APPROVED' : 'PENDING APPROVAL'}</Tag> },
            { id: 'proposed', header: 'Proposed by', cell: (v) => v.proposedByName },
            { id: 'approved', header: 'Approved', cell: (v) => (v.approvedBy && v.approvedOn ? `${v.approvedBy}, ${fmtDayMonthYear(v.approvedOn)}` : 'Not yet') },
            { id: 'effective', header: 'Effective', cell: (v) => fmtDayMonthYear(v.effectiveDate) },
            { id: 'changes', header: 'Changes', wrap: true, cell: (v) => v.changes.map((c) => c.description).join('; ') },
          ]} />
      </Pane>
      <Pane title="Accounts on this model">
        <DataTable caption="Accounts on this model" rows={view.accounts} getRowId={(a) => a.accountId} noun={{ singular: 'account', plural: 'accounts' }}
          columns={[
            { id: 'account', header: 'Account', wrap: true, cell: (a) => <Link to={accountFullViewHref(a.accountId, from)} className={`${TABLE_LINK_TARGET} underline decoration-rule-2 underline-offset-4 hover:decoration-ink`}>{a.accountName}</Link> },
            { id: 'client', header: 'Client', cell: (a) => a.clientName },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (a) => <Num text={fmtMoney(a.value)} />, sortValue: (a) => a.value },
            { id: 'drift', header: 'Largest drift', unit: UNIT.pp, align: 'right', cell: (a) => <Num text={fmtWeight(a.maxAbsDrift)} /> },
            { id: 'band', header: 'Band', cell: (a) => (a.withinBand ? <Tag>WITHIN BAND</Tag>
              : <StackedCell primary={<Tag tone="solid">OUTSIDE BAND</Tag>}
                  secondary={a.transition ? <span title={a.transition.note}>in transition since {fmtDayMonthYear(a.transition.since)}</span> : undefined} />) },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
