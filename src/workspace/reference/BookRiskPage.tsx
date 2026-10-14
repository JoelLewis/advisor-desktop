import { Link, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtMoney, fmtPoints, fmtQuantity, fmtTimestamp, fmtWeight } from '@/kit/measure'
import { useBookRisk } from '@/hooks/use-reference'
import { accountRiskHref } from '@/workspace/full-views/reference-href'
import type { BookRiskView } from '@/types/reference-risk'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { StackedCell } from './StackedCell'
import { TakeToTeamThread } from './TakeToTeamThread'
import { TOLERANCE_TAG } from './reference-words'

export function BookRiskPage() {
  const risk = useBookRisk()
  return <ReferenceGate query={risk} subject="Risk">{(view) => <BookRisk view={view} />}</ReferenceGate>
}

function BookRisk({ view }: { view: BookRiskView }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <ReferencePage title="Risk" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Every account against its client's tolerance · modeled, not realized · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Accounts above tolerance" value={fmtQuantity(view.aboveTolerance)} size="readout-md" limit={`of ${fmtQuantity(view.rows.length)} accounts`} />
      </div>
      <Pane title="Accounts">
        <DataTable caption="Accounts against tolerance" rows={view.rows} getRowId={(r) => r.accountId} noun={{ singular: 'account', plural: 'accounts' }}
          mutedRow={(r) => r.posture.status === 'within'}
          columns={[
            {
              id: 'account', header: 'Account · client · model', wrap: true, cell: (r) => (
                <StackedCell primary={<Link to={accountRiskHref(r.accountId, from)} className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink">{r.accountName}</Link>}
                  secondary={`${r.posture.tolerance.clientName} · ${r.mandateName}`} action={<TakeToTeamThread inline view="risk" rowId={r.accountId} rowLabel={r.accountName} />} />
              ),
            },
            { id: 'status', header: 'Against tolerance', cell: (r) => <Tag tone={r.posture.status === 'above' ? 'solid' : 'outline'}>{TOLERANCE_TAG[r.posture.status]}</Tag>, sortValue: (r) => r.posture.gap },
            { id: 'score', header: 'Score', unit: UNIT.points, align: 'right', cell: (r) => <Num text={fmtPoints(r.posture.score)} />, sortValue: (r) => r.posture.score },
            { id: 'tolerance', header: 'Tolerance', wrap: true, cell: (r) => `${fmtPoints(r.posture.tolerance.score)} · ${r.posture.tolerance.band}` },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (r) => <Num text={fmtMoney(r.value)} />, sortValue: (r) => r.value },
            { id: 'vol', header: 'Volatility', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtWeight(r.volatility)} />, sortValue: (r) => r.volatility },
            { id: 'var', header: 'VaR, 1 month', unit: UNIT.usd, align: 'right', cell: (r) => <Num text={fmtMoney(r.var95)} />, sortValue: (r) => r.var95 },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
