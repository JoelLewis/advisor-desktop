import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { RESIDUAL_WORDS } from '@/workspace/proposal/residual-words'
import type { AssetClass, DriftStatus } from '@/types/portfolio'
import type { ProjectedDrift } from '@/services/oms'

export type WorkbenchDriftRow = { assetClass: AssetClass; label: string; before: number; after: number; delta: number; band: number; reason?: string }

/** Each class's drift before the trades beside its drift after, in the after list's order, with the engine's reason where it stays away from target. */
export function workbenchDriftRows(before: DriftStatus, projected: ProjectedDrift): WorkbenchDriftRow[] {
  return projected.assetClassDrifts.map((d) => {
    const was = before.assetClassDrifts.find((b) => b.assetClass === d.assetClass)
    if (!was) throw new Error(`Drift before has no ${d.assetClass}`)
    return {
      assetClass: d.assetClass, label: ASSET_CLASS_LABELS[d.assetClass], before: was.drift, after: d.drift,
      delta: d.drift - was.drift, band: projected.driftTolerance, ...(d.residualReason ? { reason: RESIDUAL_WORDS[d.residualReason] } : {}),
    }
  })
}
