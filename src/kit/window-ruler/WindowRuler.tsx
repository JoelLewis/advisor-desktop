import { useId } from 'react'
import { cn } from '@/lib/utils'
import { fmtDate, fmtDays, MeasureError, fmtDayMonthYear } from '@/kit/measure'
import { daysBetween } from './window'

type WindowRulerProps = { label: string; start: string; end: string; today: string; events: { date: string; label: string }[] }
type Anchor = 'start' | 'middle' | 'end'

const W = 480
const H = 40
const INSET = 1
const EDGE = 0.12

const ANCHOR: Record<Anchor, string> = { start: '', middle: '-translate-x-1/2', end: '-translate-x-full' }

const anchorAt = (x: number): Anchor => (x / W < EDGE ? 'start' : x / W > 1 - EDGE ? 'end' : 'middle')

function MarkLabel({ mark, x, anchor = anchorAt(x), strong, children }: { mark: string; x: number; anchor?: Anchor; strong?: boolean; children: string }) {
  return (
    <span data-part="label" data-mark={mark} data-anchor={anchor} style={{ left: `${(x / W) * 100}%` }}
      className={cn('absolute top-0 whitespace-nowrap', ANCHOR[anchor], strong && 'font-semibold text-ink')}>
      {children}
    </span>
  )
}

export function WindowRuler({ label, start, end, today, events }: WindowRulerProps) {
  const patternId = `hatch-${useId().replace(/:/g, '')}`
  const length = daysBetween(start, end)
  if (length < 0) throw new MeasureError(`window ends before it starts: ${fmtDate(start)} to ${fmtDate(end)}`)
  const span = Math.max(1, length)
  const px = (days: number) => INSET + Math.max(0, Math.min(1, days / span)) * (W - 2 * INSET)
  const x = (iso: string) => px(daysBetween(start, iso))
  const remaining = daysBetween(today, end)
  const summary = remaining < 0 ? `Window closed · ended ${fmtDayMonthYear(end)}` : `${fmtDays(remaining)} d left · ends ${fmtDayMonthYear(end)}`
  const stated = events.map((e) => ({ ...e, text: `${e.label} ${fmtDayMonthYear(e.date)}` }))
  const eventsLabel = stated.length ? `, ${stated.map((e) => e.text).join(', ')}` : ''
  const status = remaining < 0 ? 'window closed' : `${fmtDays(remaining)} d left`
  return (
    <figure className="flex max-w-[480px] flex-col gap-1">
      <figcaption className="mb-1 text-label uppercase text-ink-2">{label}</figcaption>
      <div aria-hidden="true" className="relative h-4 text-label text-ink-2">
        <MarkLabel mark="today" x={x(today)} strong>{`Today ${fmtDayMonthYear(today)}`}</MarkLabel>
      </div>
      <svg role="img" aria-label={`${label}: ${fmtDayMonthYear(start)} to ${fmtDayMonthYear(end)}, today ${fmtDayMonthYear(today)}, ${status}${eventsLabel}`}
        viewBox={`0 0 ${W} ${H}`} width="100%" className="text-rule-2">
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={INSET} y={14} width={W - 2 * INSET} height={12} className="fill-band" />
        <rect data-part="span" x={INSET} y={14} width={W - 2 * INSET} height={12} fill={`url(#${patternId})`} />
        {Array.from({ length: span + 1 }, (_, i) => (
          <line key={i} x1={px(i)} x2={px(i)} y1={i % 7 === 0 ? 10 : 14} y2={26} className={i % 7 === 0 ? 'stroke-ink-3' : 'stroke-rule-2'} strokeWidth={1} />
        ))}
        {stated.map((e) => (
          <line key={e.text} data-part="event" x1={x(e.date)} x2={x(e.date)} y1={4} y2={H} className="stroke-ink-2" strokeWidth={1} />
        ))}
        <line data-part="today" x1={x(today)} x2={x(today)} y1={0} y2={H} className="stroke-ink" strokeWidth={2} />
      </svg>
      <div aria-hidden="true" className="relative h-4 text-label text-ink-3">
        <MarkLabel mark="start" x={x(start)} anchor="start">{fmtDayMonthYear(start)}</MarkLabel>
        {stated.map((e) => <MarkLabel key={e.text} mark="event" x={x(e.date)}>{e.text}</MarkLabel>)}
        <MarkLabel mark="end" x={x(end)} anchor="end">{fmtDayMonthYear(end)}</MarkLabel>
      </div>
      <p className="mt-1 text-label text-ink-2">{summary}</p>
    </figure>
  )
}
