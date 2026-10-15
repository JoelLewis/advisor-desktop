import { DataTable } from '@/kit/data-table/DataTable'
import { Gauge } from '@/kit/gauge/Gauge'
import { driftStatus, sharedGaugeDomain } from '@/kit/gauge/gauge-math'
import { StatusCode } from '@/kit/status/StatusCode'
import { UNIT, fmtDrift } from '@/kit/measure'
import type { DriftStatus } from '@/types/portfolio'
import type { ProjectedDrift } from '@/services/oms'
import { workbenchDriftRows } from './drift-rows'

/** Drift before and after the trades, one row per class on one shared scale: the change is the picture. */
export function DriftTable({ before, projected }: { before: DriftStatus; projected: ProjectedDrift }) {
  const rows = workbenchDriftRows(before, projected)
  const domain = sharedGaugeDomain(rows.flatMap((r) => [r.before, r.after]), projected.driftTolerance)
  return (
    <DataTable caption="Drift before and after" rows={rows} getRowId={(r) => r.assetClass} noun={{ singular: 'asset class', plural: 'asset classes' }}
      columns={[
        { id: 'class', header: 'Asset class', wrap: true, cell: (r) => (
          <span className="flex flex-col"><span>{r.label}</span>{r.reason ? <span className="text-label text-ink-3">{r.reason}</span> : null}</span>
        ) },
        { id: 'gauge', header: 'Before → after', cell: (r) => <Gauge bare label={r.label} drift={r.after} before={r.before} band={r.band} domain={domain} /> },
        { id: 'before', header: 'Before', unit: UNIT.pp, align: 'right', cell: (r) => fmtDrift(r.before) },
        { id: 'after', header: 'After', unit: UNIT.pp, align: 'right', cell: (r) => fmtDrift(r.after) },
        { id: 'delta', header: 'Δ', unit: UNIT.pp, align: 'right', cell: (r) => fmtDrift(r.delta) },
        { id: 'status', header: 'Status', cell: (r) => <StatusCode status={driftStatus(r.after, r.band)} /> },
      ]} />
  )
}
