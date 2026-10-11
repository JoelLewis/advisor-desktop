import { Gauge } from '@/kit/gauge/Gauge'
import { sharedGaugeDomain } from '@/kit/gauge/gauge-math'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { DriftStatus } from '@/types/portfolio'

/** One gauge per asset class, all on the same scale so their drifts compare at a glance. */
export function DriftGauges({ drift }: { drift: DriftStatus }) {
  const { assetClassDrifts, driftTolerance } = drift
  const domain = sharedGaugeDomain(assetClassDrifts.map((d) => d.drift), driftTolerance)
  return (
    <div className="flex min-w-0 flex-col gap-2 overflow-x-auto">
      {assetClassDrifts.map((d) => (
        <Gauge key={d.assetClass} label={assetClassLabel(d.assetClass)} drift={d.drift} band={driftTolerance} domain={domain} />
      ))}
    </div>
  )
}
