import type { AssetClass, DriftStatus } from '@/types/portfolio'
import type { ProjectedDrift, ResidualDriftReason } from '@/services/oms'

export type DriftRow = { assetClass: AssetClass; before: number; after: number; reason?: ResidualDriftReason }

/** Classes that were away from target before the trades, or still carry a reason after: before beside after, both from the engine. */
export function driftRows(before: DriftStatus, after: ProjectedDrift): DriftRow[] {
  return after.assetClassDrifts.flatMap((a) => {
    const b = before.assetClassDrifts.find((d) => d.assetClass === a.assetClass)
    const was = b?.drift ?? 0
    if (Math.abs(was) <= after.driftThreshold && a.residualReason === undefined) return []
    return [{ assetClass: a.assetClass, before: was, after: a.drift, ...(a.residualReason ? { reason: a.residualReason } : {}) }]
  })
}
