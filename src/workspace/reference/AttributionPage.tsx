import { useParams, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Select } from '@/kit/select/Select'
import { SeriesLines } from '@/kit/series/SeriesLines'
import { UNIT, fmtEffect, fmtPrice, fmtReturn, fmtEasternStamp, fmtWeight } from '@/kit/measure'
import { useReferenceAttribution } from '@/hooks/use-reference'
import { isAttributionPeriod, type AttributionPeriod, type AttributionView } from '@/types/reference-attribution'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { StackedCell } from './StackedCell'
import { TakeToTeamThread } from './TakeToTeamThread'
import { BENCHMARK_KIND_WORDS, sleeveLabel } from './reference-words'

/** Half the last displayed place of fmtEffect (0.01 pp = 0.0001 as a fraction). */
const EFFECT_TIE_TOLERANCE = 0.00005

export function AttributionPage() {
  const { accountId } = useParams()
  const [params] = useSearchParams()
  if (!accountId) throw new Error('The attribution route needs an account id')
  const asked = params.get('period')
  const period: AttributionPeriod = isAttributionPeriod(asked) ? asked : 'ytd'
  return <AttributionGate key={accountId} accountId={accountId} period={period} />
}

function AttributionGate({ accountId, period }: { accountId: string; period: AttributionPeriod }) {
  const attribution = useReferenceAttribution(accountId, period)
  return <ReferenceGate query={attribution} subject="Account">{(view) => <Attribution view={view} />}</ReferenceGate>
}

function Attribution({ view }: { view: AttributionView }) {
  const [params, setParams] = useSearchParams()
  const setPeriod = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('period', value)
    setParams(next, { replace: true })
  }
  const periodLabel = view.periods.find((p) => p.id === view.period)?.label ?? view.period
  const span = view.multiYear ? `${periodLabel}, cumulative` : periodLabel
  const cumulative = view.multiYear ? ', cumulative' : ''
  const last = view.series[view.series.length - 1]
  return (
    <ReferencePage title={`Attribution · ${view.accountName}`} from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`${view.mandateName} · against the ${view.benchmark.name} · gross of fees · as of ${fmtEasternStamp(view.asOf)}`}</p>}>
      <Select label="Period" value={view.period} onChange={setPeriod} options={view.periods.map((p) => ({ value: p.id, label: p.label }))} />
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label={`Portfolio return${cumulative}`} value={fmtReturn(view.portfolioReturn)} unit={UNIT.pct} size="readout-md" />
        <Reading label={`Benchmark return${cumulative}`} value={fmtReturn(view.benchmarkReturn)} unit={UNIT.pct} size="readout-md" />
        <Reading label={`Active return${cumulative}`} value={fmtReturn(view.activeReturn)} unit={UNIT.pct} size="readout-md" />
        {view.multiYear ? (
          <>
            <Reading label="Portfolio, annualized" value={fmtReturn(view.multiYear.annualized.portfolio)} unit={UNIT.pct} size="readout-md" />
            <Reading label="Benchmark, annualized" value={fmtReturn(view.multiYear.annualized.benchmark)} unit={UNIT.pct} size="readout-md" />
          </>
        ) : null}
      </div>
      <p className="text-body text-ink-2">Brinson-Fachler · single period, arithmetic, no linking · returns modeled, not realized</p>
      <Pane title="Effects by asset class" meta={span}>
        <DataTable caption={`Attribution · ${span}`} rows={view.rows} getRowId={(r) => r.assetClass} noun={{ singular: 'asset class', plural: 'asset classes' }}
          totals={{
            label: 'Total',
            tiesTo: { label: 'the active return', expected: view.activeReturn, actual: view.rows.reduce((sum, r) => sum + r.total, 0), tolerance: EFFECT_TIE_TOLERANCE },
            cells: {
              allocation: <Num text={fmtEffect(view.totals.allocation)} />, selection: <Num text={fmtEffect(view.totals.selection)} />,
              interaction: <Num text={fmtEffect(view.totals.interaction)} />, total: <Num text={fmtEffect(view.totals.total)} />,
            },
          }}
          columns={[
            {
              id: 'class', header: 'Asset class', wrap: true, cell: (r) => (
                <StackedCell primary={sleeveLabel(r.assetClass)}
                  action={<TakeToTeamThread inline view="attribution" rowId={`${view.accountId}:${view.period}:${r.assetClass}`} rowLabel={sleeveLabel(r.assetClass)} />} />
              ),
            },
            { id: 'wp', header: 'Weight', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtWeight(r.portfolioWeight)} /> },
            { id: 'wb', header: 'Benchmark', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtWeight(r.benchmarkWeight)} /> },
            { id: 'rp', header: 'Return', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtReturn(r.portfolioReturn)} /> },
            { id: 'rb', header: 'Index return', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtReturn(r.benchmarkReturn)} /> },
            { id: 'allocation', header: 'Allocation', unit: UNIT.pp, align: 'right', cell: (r) => <Num text={fmtEffect(r.allocation)} /> },
            { id: 'selection', header: 'Selection', unit: UNIT.pp, align: 'right', cell: (r) => <Num text={fmtEffect(r.selection)} /> },
            { id: 'interaction', header: 'Interaction', unit: UNIT.pp, align: 'right', cell: (r) => <Num text={fmtEffect(r.interaction)} /> },
            { id: 'total', header: 'Total', unit: UNIT.pp, align: 'right', cell: (r) => <Num text={fmtEffect(r.total)} />, sortValue: (r) => r.total },
          ]} />
      </Pane>
      <Pane title="Benchmark line" meta={`${view.series.length} months · modeled, not realized`}>
        {last ? (
          <SeriesLines label={`Modeled growth of 100 · ${view.accountName} against the ${view.benchmark.name}`}
            lines={[{ name: view.accountName, values: view.series.map((p) => p.portfolio) }, { name: view.benchmark.name, values: view.series.map((p) => p.benchmark), dashed: true }]}
            legend={[{ name: view.accountName, value: fmtPrice(last.portfolio) }, { name: view.benchmark.name, value: fmtPrice(last.benchmark), dashed: true }]} />
        ) : null}
      </Pane>
      <Pane title="The benchmark" meta={BENCHMARK_KIND_WORDS[view.benchmark.kind]}>
        <DataTable caption="Benchmark components" rows={view.benchmark.components} getRowId={(c) => c.assetClass} noun={{ singular: 'sleeve', plural: 'sleeves' }} density="dense"
          columns={[
            { id: 'sleeve', header: 'Sleeve', cell: (c) => sleeveLabel(c.assetClass) },
            { id: 'index', header: 'Index', cell: (c) => c.index },
            { id: 'weight', header: 'Weight', unit: UNIT.pct, align: 'right', cell: (c) => <Num text={fmtWeight(c.weight)} /> },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
