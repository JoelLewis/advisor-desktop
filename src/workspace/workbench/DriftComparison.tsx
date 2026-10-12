import { useId } from 'react'
import { Gauge } from '@/kit/gauge/Gauge'
import { sharedGaugeDomain } from '@/kit/gauge/gauge-math'
import { useDrift } from '@/hooks/use-portfolio'
import { ASSET_CLASS_PROSE_LABELS } from '@/lib/labels'
import { RESIDUAL_WORDS } from '@/workspace/proposal/residual-words'
import type { ProjectedDrift } from '@/services/oms'

/** Drift before and after the trades on one shared scale, each class still away from target with the engine's reason. */
export function DriftComparison({ accountId, projected }: { accountId: string; projected: ProjectedDrift }) {
  const beforeId = useId()
  const afterId = useId()
  const drift = useDrift(accountId)
  if (drift.isPending) return <p role="status" className="text-body text-ink-3">Loading the drift reading…</p>
  if (drift.isError) return <p role="alert" className="text-body">{drift.error.message}</p>
  const before = drift.data.assetClassDrifts
  const domain = sharedGaugeDomain([...before.map((d) => d.drift), ...projected.assetClassDrifts.map((d) => d.drift)], projected.driftTolerance)
  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-auto">
      <section aria-labelledby={beforeId} className="flex flex-col gap-2">
        <h3 id={beforeId} className="text-label uppercase text-ink-2">Drift before</h3>
        {before.map((d) => <Gauge key={d.assetClass} label={ASSET_CLASS_PROSE_LABELS[d.assetClass]} drift={d.drift} band={drift.data.driftTolerance} domain={domain} />)}
      </section>
      <section aria-labelledby={afterId} className="flex flex-col gap-2">
        <h3 id={afterId} className="text-label uppercase text-ink-2">Drift after</h3>
        {projected.assetClassDrifts.map((d) => (
          <div key={d.assetClass} className="flex flex-col gap-0.5">
            <Gauge label={ASSET_CLASS_PROSE_LABELS[d.assetClass]} drift={d.drift} band={projected.driftTolerance} domain={domain} />
            {d.residualReason ? <p className="pl-43 text-label text-ink-3">{RESIDUAL_WORDS[d.residualReason]}</p> : null}
          </div>
        ))}
      </section>
    </div>
  )
}
