import { Link, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtMoney, fmtPoints, fmtQuantity, fmtEasternStamp, fmtWeight } from '@/kit/measure'
import { useBookRisk } from '@/hooks/use-reference'
import { accountRiskHref } from '@/workspace/full-views/reference-href'
import type { BookRiskView } from '@/types/reference-risk'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { StackedCell } from './StackedCell'
import { TakeToTeamThread } from './TakeToTeamThread'
import { ASSET_LOCATION_TAG, TOLERANCE_TAG, beyondWords } from './reference-words'
import { TABLE_LINK_TARGET } from '@/kit/link-target'

export function BookRiskPage() {
  const risk = useBookRisk()
  return <ReferenceGate query={risk} subject="Risk">{(view) => <BookRisk view={view} />}</ReferenceGate>
}

function BookRisk({ view }: { view: BookRiskView }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <ReferencePage title="Risk" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Each client's household, then every account, against the client's tolerance · modeled, not realized · as of ${fmtEasternStamp(view.asOf)}`}</p>}>
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Reading label="Households outside tolerance" value={fmtQuantity(view.householdsOutside)} size="readout-sm" limit={`of ${fmtQuantity(view.households.length)} clients' households`} />
        <Reading label="Accounts above tolerance" value={fmtQuantity(view.aboveTolerance)} size="readout-sm" limit={`of ${fmtQuantity(view.rows.length)} accounts`} />
        <Reading label="Accounts below tolerance" value={fmtQuantity(view.belowTolerance)} size="readout-sm" limit={`of ${fmtQuantity(view.rows.length)} accounts`} />
      </div>
      <Pane title="Households">
        <DataTable caption="Households against tolerance" rows={view.households} getRowId={(h) => h.clientId} noun={{ singular: 'household', plural: 'households' }}
          mutedRow={(h) => h.posture.status === 'within'}
          columns={[
            {
              id: 'household', header: 'Household · client', wrap: true,
              cell: (h) => <StackedCell primary={h.householdName} secondary={`${h.clientName} · ${fmtQuantity(h.accountIds.length)} ${h.accountIds.length === 1 ? 'account' : 'accounts'}`} />,
            },
            {
              id: 'status', header: 'Against tolerance · by how far', wrap: true, sortValue: (h) => h.posture.sortKey,
              cell: (h) => <StackedCell primary={<Tag tone={h.posture.status === 'above' ? 'solid' : 'outline'}>{TOLERANCE_TAG[h.posture.status]}</Tag>} secondary={beyondWords(h.posture)} />,
            },
            { id: 'score', header: 'Score', unit: UNIT.points, align: 'right', cell: (h) => <Num text={fmtPoints(h.posture.score)} />, sortValue: (h) => h.posture.score },
            { id: 'tolerance', header: 'Questionnaire', unit: UNIT.points, align: 'right', cell: (h) => <Num text={fmtPoints(h.posture.tolerance.score)} />, sortValue: (h) => h.posture.tolerance.score },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (h) => <Num text={fmtMoney(h.value)} />, sortValue: (h) => h.value },
          ]} />
      </Pane>
      <Pane title="Accounts">
        <DataTable caption="Accounts against tolerance" rows={view.rows} getRowId={(r) => r.accountId} noun={{ singular: 'account', plural: 'accounts' }}
          mutedRow={(r) => r.assetLocation || r.posture.status === 'within' || r.posture.status === 'glide_path'}
          columns={[
            {
              id: 'account', header: 'Account · client · model', wrap: true, cell: (r) => (
                <StackedCell primary={<Link to={accountRiskHref(r.accountId, from)} className={`${TABLE_LINK_TARGET} underline decoration-rule-2 underline-offset-4 hover:decoration-ink`}>{r.accountName}</Link>}
                  secondary={`${r.posture.tolerance.clientName} · ${r.mandateName}`} action={<TakeToTeamThread inline view="risk" rowId={r.accountId} rowLabel={r.accountName} />} />
              ),
            },
            {
              id: 'status', header: 'Against tolerance · by how far', wrap: true, sortValue: (r) => r.posture.sortKey,
              cell: (r) => r.assetLocation
                ? <StackedCell primary={<Tag tone="outline">{ASSET_LOCATION_TAG}</Tag>} secondary={`${beyondWords(r.posture)}; household within`} />
                : <StackedCell primary={<Tag tone={r.posture.status === 'above' ? 'solid' : 'outline'}>{TOLERANCE_TAG[r.posture.status]}</Tag>} secondary={beyondWords(r.posture)} />,
            },
            { id: 'score', header: 'Score', unit: UNIT.points, align: 'right', cell: (r) => <Num text={fmtPoints(r.posture.score)} />, sortValue: (r) => r.posture.score },
            { id: 'tolerance', header: 'Questionnaire', unit: UNIT.points, align: 'right', cell: (r) => <Num text={fmtPoints(r.posture.tolerance.score)} />, sortValue: (r) => r.posture.tolerance.score },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (r) => <Num text={fmtMoney(r.value)} />, sortValue: (r) => r.value },
            { id: 'vol', header: 'Volatility', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtWeight(r.volatility)} />, sortValue: (r) => r.volatility },
            { id: 'var', header: 'VaR, 1 month', unit: UNIT.usd, align: 'right', cell: (r) => <Num text={fmtMoney(r.var95)} />, sortValue: (r) => r.var95 },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
