import { useId } from 'react'
import { cn } from '@/lib/utils'
import { fmtDrift, fmtTolerance } from '@/kit/measure'
import { StatusCode } from '@/kit/status/StatusCode'
import { gaugeDomain, gaugeStatus } from './gauge-math'

const W = 200
const H = 24
const MID = W / 2
const HALF = MID - 1

export function Gauge({ label, drift, band }: { label: string; drift: number; band: number }) {
  const patternId = `hatch-${useId().replace(/:/g, '')}`
  const status = gaugeStatus(drift, band)
  const domain = gaugeDomain(drift, band)
  const scale = (v: number) => MID + (Math.max(-domain, Math.min(domain, v)) / domain) * HALF
  const bandLeft = scale(-band)
  const bandRight = scale(band)
  const end = scale(drift)
  const barX = Math.min(MID, end)
  const barW = Math.abs(end - MID)
  const out = status === 'OUT'
  const description = `${label}: drift ${fmtDrift(drift)} percentage points against tolerance ${fmtTolerance(band)} percentage points, ${status}`

  return (
    <div className="inline-flex items-center gap-3">
      <span aria-hidden data-part="label" className="w-40 shrink-0 text-table">{label}</span>
      <svg role="img" aria-label={description} viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="animate-gauge-in text-rule-2">
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={bandLeft} y={4} width={bandRight - bandLeft} height={H - 8} fill={`url(#${patternId})`} />
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="stroke-rule" strokeWidth={1} />
        <line x1={MID} x2={MID} y1={2} y2={H - 2} className="stroke-ink-3" strokeWidth={1} />
        <rect data-part="bar" x={barX} y={9} width={barW} height={6} className={out ? 'fill-signal' : 'fill-ink-2'} />
        <line x1={end} x2={end} y1={2} y2={H - 2} className="stroke-ink" strokeWidth={out ? 2 : 1} />
      </svg>
      <span aria-hidden className={cn('tabular text-table', out && 'font-semibold')}>{fmtDrift(drift)}</span>
      <span aria-hidden className="text-label text-ink-3">pp</span>
      <span aria-hidden>
        <StatusCode status={status} />
      </span>
    </div>
  )
}
