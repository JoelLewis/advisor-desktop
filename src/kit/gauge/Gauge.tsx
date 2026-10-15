import { useId } from 'react'
import { cn } from '@/lib/utils'
import { fmtDrift, fmtTolerance } from '@/kit/measure'
import { StatusCode } from '@/kit/status/StatusCode'
import { MINOR_PER_BAND, driftStatus, gaugeDomain, gaugeTicks } from './gauge-math'

const W = 200
const H = 24
const MID = W / 2
const HALF = MID - 1
const MIN_MINOR_SPACING = 3

type GaugeProps = {
  label: string
  drift: number
  band: number
  domain?: number
  /** Drift before the trades: drawn as a ghost tick beside the solid mark at `drift`. */
  before?: number
  /** Only the drawing, still named by its aria-label: the caller supplies label, figure and status. */
  bare?: boolean
}

export function Gauge({ label, drift, band, domain: sharedDomain, before, bare = false }: GaugeProps) {
  const patternId = `hatch-${useId().replace(/:/g, '')}`
  const status = driftStatus(drift, band)
  const domain = sharedDomain ?? Math.max(gaugeDomain(drift, band), before === undefined ? 0 : gaugeDomain(before, band))
  const ticks = gaugeTicks(domain, band)
  const scale = (v: number) => MID + (Math.max(-domain, Math.min(domain, v)) / domain) * HALF
  const bandLeft = scale(-band)
  const bandRight = scale(band)
  const end = scale(drift)
  const barX = Math.min(MID, end)
  const barW = Math.abs(end - MID)
  const out = status === 'OUT'
  const minorSpacing = (band / MINOR_PER_BAND / domain) * HALF
  const minor = minorSpacing >= MIN_MINOR_SPACING ? ticks.minor : []
  const drifts = before === undefined ? fmtDrift(drift) : `${fmtDrift(before)} before, ${fmtDrift(drift)} after,`
  const description = `${label}: drift ${drifts} percentage points against tolerance ${fmtTolerance(band)} percentage points, ${status}`

  const drawing = (
      <svg role="img" aria-label={description} viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="animate-gauge-in text-rule-2">
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={bandLeft} y={4} width={bandRight - bandLeft} height={H - 8} fill={`url(#${patternId})`} />
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="stroke-rule" strokeWidth={1} />
        {ticks.major.map((v) => (
          <line key={`M${v}`} data-part="tick-major" x1={scale(v)} x2={scale(v)} y1={5} y2={H - 5} className="stroke-ink-3" strokeWidth={1} />
        ))}
        {minor.map((v) => (
          <line key={`m${v}`} data-part="tick-minor" x1={scale(v)} x2={scale(v)} y1={H / 2 - 2} y2={H / 2 + 2} className="stroke-rule-2" strokeWidth={1} />
        ))}
        {before === undefined ? null : (
          <line data-part="ghost" x1={scale(before)} x2={scale(before)} y1={3} y2={H - 3} className="stroke-ink-3" strokeWidth={1} strokeDasharray="2 2" />
        )}
        <line x1={MID} x2={MID} y1={2} y2={H - 2} className="stroke-ink-3" strokeWidth={1} />
        <rect data-part="bar" x={barX} y={9} width={barW} height={6} className={out ? 'fill-signal' : 'fill-ink-2'} />
        <line x1={end} x2={end} y1={2} y2={H - 2} className="stroke-ink" strokeWidth={out ? 2 : 1} />
      </svg>
  )
  if (bare) return drawing

  return (
    <div className="inline-flex items-center gap-3">
      <span aria-hidden data-part="label" className="w-40 shrink-0 text-table">{label}</span>
      {drawing}
      <span aria-hidden className={cn('tabular text-table', out && 'font-semibold')}>{fmtDrift(drift)}</span>
      <span aria-hidden className="text-label text-ink-3">pp</span>
      <span aria-hidden>
        <StatusCode status={status} />
      </span>
    </div>
  )
}
