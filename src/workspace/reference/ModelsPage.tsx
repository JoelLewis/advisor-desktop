import { Link, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { UNIT, fmtMoney, fmtQuantity, fmtEasternStamp, fmtTolerance, fmtWeight } from '@/kit/measure'
import { useReferenceModels } from '@/hooks/use-reference'
import { accountRiskHref, modelHref } from '@/workspace/full-views/reference-href'
import type { ModelsView } from '@/types/reference-models'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { StackedCell } from './StackedCell'
import { TakeToTeamThread } from './TakeToTeamThread'
import { FREQUENCY_WORDS, pendingVersionWords, wordFor } from './reference-words'
import { LINK_TARGET } from '@/kit/link-target'

export function ModelsPage() {
  const models = useReferenceModels()
  return <ReferenceGate query={models} subject="Models">{(view) => <Models view={view} />}</ReferenceGate>
}

function Models({ view }: { view: ModelsView }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <ReferencePage title="Models" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Model governance · read-only · as of ${fmtEasternStamp(view.asOf)}`}</p>}>
      <Pane title="Models">
        <DataTable caption="Models" rows={view.models} getRowId={(m) => m.id} noun={{ singular: 'model', plural: 'models' }}
          columns={[
            {
              id: 'name', header: 'Model · benchmark', wrap: true, cell: (m) => (
                <StackedCell primary={<Link to={modelHref(m.id, from)} className={`${LINK_TARGET} underline decoration-rule-2 underline-offset-4 hover:decoration-ink`}>{m.name}</Link>}
                  secondary={m.benchmark.name} action={<TakeToTeamThread inline view="models" rowId={m.id} rowLabel={m.name} />} />
              ),
            },
            { id: 'risk', header: 'Risk profile', wrap: true, cell: (m) => m.riskLabel },
            { id: 'equity', header: 'Equity', unit: UNIT.pct, align: 'right', cell: (m) => <Num text={fmtWeight(m.equityShare)} />, sortValue: (m) => m.equityShare },
            { id: 'version', header: 'Version', wrap: true, cell: (m) => <StackedCell primary={`v${m.currentVersion}`} secondary={pendingVersionWords(m)} /> },
            { id: 'accounts', header: 'Accounts', align: 'right', cell: (m) => <Num text={fmtQuantity(m.assignedAccounts)} /> },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (m) => <Num text={fmtMoney(m.totalValue)} />, sortValue: (m) => m.totalValue },
            { id: 'vol', header: 'Volatility', unit: UNIT.pct, align: 'right', cell: (m) => <Num text={fmtWeight(m.volatility)} /> },
            { id: 'band', header: 'Drift band', unit: UNIT.pp, align: 'right', cell: (m) => <Num text={fmtTolerance(m.driftTolerance)} /> },
            { id: 'rebalance', header: 'Rebalance', cell: (m) => wordFor(FREQUENCY_WORDS, m.rebalanceFrequency) },
          ]} />
      </Pane>
      <Pane title="Custom mandates · not model-managed" meta="No drift band · measured on risk against the client's tolerance">
        <DataTable caption="Custom mandates" rows={view.customMandates} getRowId={(c) => c.accountId} noun={{ singular: 'account', plural: 'accounts' }}
          columns={[
            {
              id: 'account', header: 'Account · client', wrap: true, cell: (c) => (
                <StackedCell primary={<Link to={accountRiskHref(c.accountId, from)} className={`${LINK_TARGET} underline decoration-rule-2 underline-offset-4 hover:decoration-ink`}>{c.accountName}</Link>} secondary={c.clientName} />
              ),
            },
            { id: 'mandate', header: 'Mandate · benchmark', wrap: true, cell: (c) => <StackedCell primary={c.mandateSummary} secondary={c.benchmarkName} /> },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (c) => <Num text={fmtMoney(c.value)} />, sortValue: (c) => c.value },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
