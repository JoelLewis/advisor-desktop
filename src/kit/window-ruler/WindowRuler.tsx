import { fmtDate, fmtDays, MeasureError } from '@/kit/measure'
import { daysBetween } from './window'

type WindowRulerProps = { label: string; start: string; end: string; today: string; events: { date: string; label: string }[] }

const W = 480
const H = 40
const INSET = 1

export function WindowRuler({ label, start, end, today, events }: WindowRulerProps) {
  const length = daysBetween(start, end)
  if (length < 0) throw new MeasureError(`window ends before it starts: ${fmtDate(start)} to ${fmtDate(end)}`)
  const span = Math.max(1, length)
  const px = (days: number) => INSET + Math.max(0, Math.min(1, days / span)) * (W - 2 * INSET)
  const x = (iso: string) => px(daysBetween(start, iso))
  const remaining = daysBetween(today, end)
  const summary = remaining < 0 ? `Window closed · ended ${fmtDate(end)}` : `${fmtDays(remaining)} d left · ends ${fmtDate(end)}`
  const stated = events.map((e) => ({ ...e, text: `${e.label} ${fmtDate(e.date)}` }))
  const eventsLabel = stated.length ? `, ${stated.map((e) => e.text).join(', ')}` : ''
  const status = remaining < 0 ? 'window closed' : `${fmtDays(remaining)} d left`
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-label uppercase text-ink-2">{label}</figcaption>
      <svg role="img" aria-label={`${label}: ${fmtDate(start)} to ${fmtDate(end)}, today ${fmtDate(today)}, ${status}${eventsLabel}`}
        viewBox={`0 0 ${W} ${H}`} width="100%" className="max-w-[480px]">
        <rect x={INSET} y={14} width={W - 2 * INSET} height={12} className="fill-band" />
        {Array.from({ length: span + 1 }, (_, i) => (
          <line key={i} x1={px(i)} x2={px(i)} y1={i % 7 === 0 ? 10 : 14} y2={26} className="stroke-rule-2" strokeWidth={1} />
        ))}
        {stated.map((e) => (
          <line key={e.text} data-part="event" x1={x(e.date)} x2={x(e.date)} y1={4} y2={30} className="stroke-ink-2" strokeWidth={1} />
        ))}
        <line data-part="today" x1={x(today)} x2={x(today)} y1={0} y2={H} className="stroke-ink" strokeWidth={2} />
      </svg>
      <div className="flex flex-wrap justify-between gap-2 text-label text-ink-3">
        <span>{fmtDate(start)}</span>
        {stated.map((e) => <span key={e.text}>{e.text}</span>)}
        <span>Today {fmtDate(today)}</span>
        <span>{summary}</span>
      </div>
    </figure>
  )
}
