import { useId } from 'react'
import { Link } from 'react-router-dom'
import { Gauge } from '@/kit/gauge/Gauge'
import { sharedGaugeDomain } from '@/kit/gauge/gauge-math'
import { fmtTimestamp, fmtTolerance } from '@/kit/measure'
import { useAccount } from '@/hooks/use-accounts'
import { useDrift } from '@/hooks/use-portfolio'
import { assetClassLabel } from '@/workspace/asset-class-label'
import { accountIdOf, type EmbedProps } from './embed-props'

export function DriftEmbed({ subject }: EmbedProps) {
  const accountId = accountIdOf(subject, 'drift')
  const titleId = useId()
  const drift = useDrift(accountId)
  const account = useAccount(accountId)
  if (drift.isPending || account.isPending) return <p role="status" className="text-body text-ink-3">Loading the drift reading…</p>
  if (drift.isError) return <p role="alert" className="text-body">{drift.error.message}</p>
  if (account.isError) return <p role="alert" className="text-body">{account.error.message}</p>
  const { assetClassDrifts, driftTolerance, lastCalculated } = drift.data
  const domain = sharedGaugeDomain(assetClassDrifts.map((d) => d.drift), driftTolerance)
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 border border-rule-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2">
        <h2 id={titleId} className="text-label uppercase text-ink-2">{`Drift against model · ${account.data.name}`}</h2>
        <span className="tabular text-label text-ink-3">{`band ${fmtTolerance(driftTolerance)} pp · as of ${fmtTimestamp(lastCalculated)}`}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-2 overflow-x-auto">
        {assetClassDrifts.map((d) => (
          <Gauge key={d.assetClass} label={assetClassLabel(d.assetClass)} drift={d.drift} band={driftTolerance} domain={domain} />
        ))}
      </div>
      <Link to={`/accounts/${accountId}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Open full view</Link>
    </section>
  )
}
