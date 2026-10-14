import { useId } from 'react'
import { MeasureError } from '@/kit/measure'

type Line = { name: string; values: readonly number[]; dashed?: boolean }
type LegendItem = { name: string; value: string; dashed?: boolean }

const WIDTH = 600
const HEIGHT = 160
const PAD = 6

/** Series on one shared scale, drawn as lines with no axes; the legend names each line and its last value, formatted by the caller. */
export function SeriesLines({ label, lines, legend }: { label: string; lines: readonly Line[]; legend: readonly LegendItem[] }) {
  const captionId = useId()
  const showLegend = lines.length >= 2
  const length = lines[0]?.values.length ?? 0
  if (length < 2 || lines.some((l) => l.values.length !== length)) {
    throw new MeasureError(`"${label}" needs two or more points in every line, the same number in each`)
  }
  const all = lines.flatMap((l) => l.values)
  const min = Math.min(...all)
  const span = Math.max(...all) - min || 1
  const x = (i: number) => PAD + (i * (WIDTH - 2 * PAD)) / (length - 1)
  const y = (v: number) => HEIGHT - PAD - ((v - min) * (HEIGHT - 2 * PAD)) / span
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <svg role="img" aria-label={label} aria-describedby={showLegend ? captionId : undefined} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-40 w-full">
        {lines.map((l) => (
          <polyline key={l.name} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={2}
            strokeDasharray={l.dashed ? '4 3' : undefined} className={l.dashed ? 'stroke-ink-3' : 'stroke-ink'}
            points={l.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
        ))}
      </svg>
      {showLegend ? (
        <figcaption id={captionId} className="flex flex-wrap gap-x-6 gap-y-1 text-label text-ink-2">
          {legend.map((item) => (
            <span key={item.name} className="inline-flex items-baseline gap-2">
              <span aria-hidden="true" className={item.dashed ? 'inline-block w-4 border-t border-dashed border-ink-3' : 'inline-block w-4 border-t-2 border-ink'} />
              <span className="tabular">{`${item.name} · ${item.value}`}</span>
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  )
}
