import { useId } from 'react'
import { Button } from '@/kit/button/Button'
import { Reading } from '@/kit/reading/Reading'
import { StatusCode } from '@/kit/status/StatusCode'
import { fmtQuantity } from '@/kit/measure'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import type { BriefItem, BriefReading, Directory, Message } from '@/types/workspace'
import { findingAnchorId } from './finding-anchor'
import { formatFigure, marksBreach } from './figure-format'

type Summary = Extract<Message, { kind: 'brief_summary' }>

/** The Brief's summary: what needs a decision today, ranked and numbered, then the context behind it, folded and quiet. */
export function BriefSummaryView({ summary, directory }: { summary: Summary; directory: Directory }) {
  const decideId = useId()
  const agentName = (id: string) => directory.agents.find((a) => a.id === id)?.name ?? id
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section aria-labelledby={decideId} className="flex min-w-0 flex-col gap-3">
        <h2 id={decideId} className="border-b border-ink pb-2 text-label uppercase text-ink-2">Needs a decision</h2>
        {summary.decide.length === 0 ? <p className="text-body text-ink-3">Nothing in the book needs a decision today.</p> : (
          <ol className="flex flex-col gap-4">
            {summary.decide.map((item, i) => (
              <li key={item.key} className="grid grid-cols-[1.75rem_1fr] items-baseline gap-x-3">
                <span className="tabular text-total stretch-wide text-ink">{fmtQuantity(i + 1)}</span>
                <ItemLines item={item} agent={agentName(item.agentId)} tone="decide" />
              </li>
            ))}
          </ol>
        )}
      </section>
      <section aria-label="Context" className="flex min-w-0 flex-col gap-3">
        <details className="group">
          <summary className="min-h-6 cursor-pointer border-b border-rule pb-2 coarse:min-h-11 text-label uppercase text-ink-3">
            {`Context · ${fmtQuantity(summary.context.length)}`}
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {summary.context.map((item) => <li key={item.key}><ItemLines item={item} agent={agentName(item.agentId)} tone="context" /></li>)}
          </ul>
        </details>
      </section>
    </div>
  )
}

function ItemLines({ item, agent, tone }: { item: BriefItem; agent: string; tone: 'decide' | 'context' }) {
  const breach = marksBreach(item)
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3">
        {item.title ? <span className={tone === 'decide' ? 'text-copy font-semibold' : 'text-body font-semibold text-ink-2'}>{item.title}</span> : null}
        <span className="ml-auto text-label text-ink-3">{agent}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {item.readings.map((r) => <ReadingLine key={r.findingId} reading={r} breach={breach && !item.title} tone={tone} />)}
      </ul>
    </div>
  )
}

function ReadingLine({ reading, breach, tone }: { reading: BriefReading; breach: boolean; tone: 'decide' | 'context' }) {
  const focusAfter = useFocusAfter()
  const figure = reading.figure ? formatFigure(reading.figure) : undefined
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {breach ? <StatusCode status="OUT" /> : null}
      <span className={tone === 'decide' ? 'text-copy' : 'text-body text-ink-2'}>{reading.line}</span>
      {figure ? <Reading value={figure.value} unit={figure.unit} /> : null}
      <Button rank="quiet" className="ml-auto text-label font-normal" aria-label={`Open finding: ${reading.line}`}
        onClick={() => focusAfter(findingAnchorId(reading.findingId))}>Open finding</Button>
    </li>
  )
}
