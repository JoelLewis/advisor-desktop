import { useParams, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtExposure, fmtMoney, fmtPoints, fmtQuantity, fmtRatio, fmtResult, fmtReturn, fmtTimestamp, fmtWeight } from '@/kit/measure'
import { useAccountRisk } from '@/hooks/use-reference'
import type { AccountRiskView } from '@/types/reference-risk'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { TakeToTeamThread } from './TakeToTeamThread'
import { TOLERANCE_TAG } from './reference-words'

export function AccountRiskPage() {
  const { accountId } = useParams()
  if (!accountId) throw new Error('The account risk route needs an account id')
  return <AccountRiskGate key={accountId} accountId={accountId} />
}

function AccountRiskGate({ accountId }: { accountId: string }) {
  const risk = useAccountRisk(accountId)
  return <ReferenceGate query={risk} subject="Account">{(view) => <AccountRisk view={view} />}</ReferenceGate>
}

function AccountRisk({ view }: { view: AccountRiskView }) {
  const [params] = useSearchParams()
  const { posture } = view
  return (
    <ReferencePage title={`Risk · ${view.accountName}`} from={params.get('from')} methods={view.methods}
      lead={(
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="text-body text-ink-2">{`${view.clientName} · ${view.mandateName} · tracking the ${view.benchmarkName} · modeled, not realized · as of ${fmtTimestamp(view.asOf)}`}</p>
          <TakeToTeamThread view="risk" rowId={view.accountId} rowLabel={view.accountName} />
        </div>
      )}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Volatility" value={fmtWeight(view.volatility)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Beta" value={fmtRatio(view.beta)} size="readout-md" />
        <Reading label="VaR" value={fmtMoney(view.var95.value)} unit={UNIT.usd} size="readout-md" limit={`${fmtWeight(view.var95.percent)}% of value · one month, 95%, parametric normal`} />
        <Reading label="Tracking error" value={fmtWeight(view.trackingError)} unit={UNIT.pct} size="readout-md" />
        <Reading label="Risk score" value={fmtPoints(posture.score)} unit={UNIT.points} size="readout-md"
          limit={`${posture.band} · tolerance ${fmtPoints(posture.tolerance.score)}, ${posture.tolerance.band}, assessed ${posture.tolerance.assessedOn}`} />
      </div>
      <p className="flex flex-wrap items-baseline gap-2 text-body">
        <Tag tone={posture.status === 'above' ? 'solid' : 'outline'}>{TOLERANCE_TAG[posture.status]}</Tag>
        <span className="text-ink-2">{`${posture.tolerance.clientName}'s questionnaire`}</span>
      </p>
      <Pane title="Factor exposures" meta="Model assumptions">
        <DataTable caption="Factor exposures" rows={view.factors} getRowId={(f) => f.factor} noun={{ singular: 'factor', plural: 'factors' }} density="dense"
          columns={[
            { id: 'factor', header: 'Factor', cell: (f) => f.label },
            { id: 'exposure', header: 'Account', align: 'right', cell: (f) => <Num text={fmtExposure(f.exposure)} /> },
            { id: 'benchmark', header: 'Benchmark', align: 'right', cell: (f) => <Num text={fmtExposure(f.benchmark)} /> },
            { id: 'active', header: 'Active', align: 'right', cell: (f) => <Num text={fmtExposure(f.active)} /> },
          ]} />
      </Pane>
      <Pane title="Concentration">
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <Reading label="HHI of positions" value={fmtQuantity(view.concentration.hhi)} />
          <Reading label="Effective number of positions" value={fmtRatio(view.concentration.effectiveN)} />
          <Reading label="Positions over their limit" value={fmtQuantity(view.concentration.breaches)} />
        </div>
        <DataTable caption="Largest positions" rows={view.concentration.top} getRowId={(c) => c.symbol} noun={{ singular: 'position', plural: 'positions' }} density="dense"
          columns={[
            { id: 'symbol', header: 'Symbol', cell: (c) => c.symbol },
            { id: 'name', header: 'Name', wrap: true, cell: (c) => c.name },
            { id: 'weight', header: 'Weight', unit: UNIT.pct, align: 'right', cell: (c) => <Num text={fmtWeight(c.weight)} /> },
            { id: 'limit', header: 'Limit', unit: UNIT.pct, align: 'right', cell: (c) => <Num text={fmtWeight(c.limit)} /> },
            { id: 'breached', header: 'Breach', cell: (c) => (c.breached ? <Tag tone="solid">OVER LIMIT</Tag> : null) },
          ]} />
      </Pane>
      <Pane title="Stress tests" meta="Replayed on today's holdings">
        <DataTable caption="Stress tests" rows={view.stress} getRowId={(s) => s.id} noun={{ singular: 'scenario', plural: 'scenarios' }} density="dense"
          columns={[
            { id: 'name', header: 'Scenario', wrap: true, cell: (s) => s.name },
            { id: 'impact', header: 'Impact', unit: UNIT.pct, align: 'right', cell: (s) => <Num text={fmtReturn(s.impact)} /> },
            { id: 'value', header: 'Impact', unit: UNIT.usd, align: 'right', cell: (s) => <Num text={fmtResult(s.impactValue)} /> },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
