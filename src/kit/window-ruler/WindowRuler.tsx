import { fmtDate, fmtDays } from '@/kit/measure'
import { daysBetween } from './window'

type WindowRulerProps = { label: string; start: string; end: string; today: string; events: { date: string; label: string }[] }

const W = 480
const H = 40

export function WindowRuler({ label, start, end, today, events }: WindowRulerProps) {
  const span = Math.max(1, daysBetween(start, end))
  const x = (iso: string) => Math.max(0, Math.min(W, (daysBetween(start, iso) / span) * W))
  const left = Math.max(0, daysBetween(today, end))
  const summary = `${fmtDays(left)} d left · ends ${fmtDate(end)}`
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-label uppercase text-ink-2">{label}</figcaption>
      <svg role="img" aria-label={`${label}: ${fmtDate(start)} to ${fmtDate(end)}, today ${fmtDate(today)}, ${fmtDays(left)} d left`}
        viewBox={`0 0 ${W} ${H}`} width="100%" className="max-w-[480px]">
        <rect x={0} y={14} width={W} height={12} className="fill-band" />
        {Array.from({ length: span + 1 }, (_, i) => (
          <line key={i} x1={(i / span) * W} x2={(i / span) * W} y1={i % 7 === 0 ? 10 : 14} y2={26} className="stroke-rule-2" strokeWidth={1} />
        ))}
        {events.map((e) => (
          <line key={e.date + e.label} x1={x(e.date)} x2={x(e.date)} y1={4} y2={30} className="stroke-ink-2" strokeWidth={1} />
        ))}
        <line x1={x(today)} x2={x(today)} y1={0} y2={H} className="stroke-ink" strokeWidth={2} />
      </svg>
      <div className="flex flex-wrap justify-between gap-2 text-label text-ink-3">
        <span>{fmtDate(start)}</span>
        {events.map((e) => <span key={e.date + e.label}>{e.label}</span>)}
        <span>Today {fmtDate(today)}</span>
        <span>{summary}</span>
      </div>
    </figure>
  )
}
