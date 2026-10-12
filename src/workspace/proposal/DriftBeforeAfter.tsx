import { DataTable } from '@/kit/data-table/DataTable'
import { StatusCode } from '@/kit/status/StatusCode'
import { driftStatus } from '@/kit/gauge/gauge-math'
import { fmtDrift } from '@/kit/measure'
import { useDrift } from '@/hooks/use-portfolio'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { ProjectedDrift } from '@/services/oms'
import { driftRows } from './drift-rows'
import { RESIDUAL_WORDS } from './residual-words'

export function DriftBeforeAfter({ accountId, projected }: { accountId: string; projected: ProjectedDrift }) {
  const drift = useDrift(accountId)
  if (drift.isPending) return <p role="status" className="text-body text-ink-3">Loading the drift reading…</p>
  if (drift.isError) return <p role="alert" className="text-body">{drift.error.message}</p>
  return (
    <DataTable caption="Drift before and after" rows={driftRows(drift.data, projected)} getRowId={(r) => r.assetClass}
      noun={{ singular: 'asset class', plural: 'asset classes' }} density="dense"
      columns={[
        { id: 'class', header: 'Asset class', cell: (r) => assetClassLabel(r.assetClass) },
        { id: 'before', header: 'Before', unit: 'pp', align: 'right', cell: (r) => fmtDrift(r.before) },
        { id: 'after', header: 'After', unit: 'pp', align: 'right', cell: (r) => fmtDrift(r.after) },
        { id: 'band', header: 'Band', cell: (r) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <StatusCode status={driftStatus(r.before, drift.data.driftTolerance)} />
            <span aria-hidden="true" className="text-label text-ink-3">→</span>
            <span className="sr-only">to</span>
            <StatusCode status={driftStatus(r.after, projected.driftTolerance)} />
          </span>
        ) },
        { id: 'reason', header: 'Why it remains', cell: (r) => (r.reason ? RESIDUAL_WORDS[r.reason] : '') },
      ]} />
  )
}
