import { Link, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { UNIT, fmtMoney, fmtQuantity, fmtTimestamp, fmtTolerance, fmtWeight } from '@/kit/measure'
import { useReferenceModels } from '@/hooks/use-reference'
import { modelHref } from '@/workspace/full-views/reference-href'
import type { ModelsView } from '@/types/reference-models'
import { ReferenceGate } from './ReferenceGate'
import { ReferencePage } from './ReferencePage'
import { TakeToTeamThread } from './TakeToTeamThread'
import { FREQUENCY_WORDS, versionWords, wordFor } from './reference-words'

export function ModelsPage() {
  const models = useReferenceModels()
  return <ReferenceGate query={models} subject="Models">{(view) => <Models view={view} />}</ReferenceGate>
}

function Models({ view }: { view: ModelsView }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <ReferencePage title="Models" from={params.get('from')} methods={view.methods}
      lead={<p className="text-body text-ink-2">{`Model governance · read-only · as of ${fmtTimestamp(view.asOf)}`}</p>}>
      <Pane title="Models">
        <DataTable caption="Models" rows={view.models} getRowId={(m) => m.id} noun={{ singular: 'model', plural: 'models' }}
          columns={[
            { id: 'name', header: 'Model', wrap: true, cell: (m) => <Link to={modelHref(m.id, from)} className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink">{m.name}</Link> },
            { id: 'risk', header: 'Risk profile', cell: (m) => m.riskLabel },
            { id: 'equity', header: 'Equity', unit: UNIT.pct, align: 'right', cell: (m) => <Num text={fmtWeight(m.equityShare)} />, sortValue: (m) => m.equityShare },
            { id: 'benchmark', header: 'Benchmark', wrap: true, cell: (m) => m.benchmark.name },
            { id: 'version', header: 'Version', cell: (m) => versionWords(m) },
            { id: 'accounts', header: 'Accounts', align: 'right', cell: (m) => <Num text={fmtQuantity(m.assignedAccounts)} /> },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (m) => <Num text={fmtMoney(m.totalValue)} />, sortValue: (m) => m.totalValue },
            { id: 'vol', header: 'Volatility', unit: UNIT.pct, align: 'right', cell: (m) => <Num text={fmtWeight(m.volatility)} /> },
            { id: 'band', header: 'Drift band', unit: UNIT.pp, align: 'right', cell: (m) => <Num text={fmtTolerance(m.driftTolerance)} /> },
            { id: 'rebalance', header: 'Rebalance', cell: (m) => wordFor(FREQUENCY_WORDS, m.rebalanceFrequency) },
            { id: 'take', header: 'Thread', cell: (m) => <TakeToTeamThread view="models" rowId={m.id} rowLabel={m.name} /> },
          ]} />
      </Pane>
    </ReferencePage>
  )
}
