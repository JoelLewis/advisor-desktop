import { useId } from 'react'
import { Button } from '@/kit/button/Button'
import { StatusCode } from '@/kit/status/StatusCode'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import type { Directory, Message } from '@/types/workspace'
import { findingAnchorId } from './finding-anchor'

type Summary = Extract<Message, { kind: 'brief_summary' }>

export function BriefSummaryView({ summary, directory }: { summary: Summary; directory: Directory }) {
  const titleId = useId()
  const focusAfter = useFocusAfter()
  const agentName = (id: string) => directory.agents.find((a) => a.id === id)?.name ?? id
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 border border-ink p-4">
      <h2 id={titleId} className="text-label uppercase text-ink-2">Ranked summary</h2>
      <ol className="flex flex-col gap-2">
        {summary.items.map((item) => (
          <li key={item.findingId} className="grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-3">
            <span>{item.attention === 'attention' ? <StatusCode status="OUT" /> : null}</span>
            <Button rank="quiet" className="text-left font-normal" onClick={() => focusAfter(findingAnchorId(item.findingId))}>{item.claim}</Button>
            <span className="text-label uppercase text-ink-3">{agentName(item.agentId)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
