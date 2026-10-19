import { useId } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import type { MethodNote } from '@/types/reference'

/** How the view's figures were made; a modeled note is tagged, so nothing modeled reads as realized. */
export function MethodsAndSources({ notes }: { notes: readonly MethodNote[] }) {
  const titleId = useId()
  return (
    <Pane title="Methods & sources" titleId={titleId}>
      <dl className="flex min-w-0 flex-col gap-3">
        {notes.map((n) => (
          <div key={n.label} className="flex min-w-0 flex-col gap-1">
            <dt className="flex flex-wrap items-baseline gap-2 text-body font-semibold">{n.label}{n.modeled ? <Tag>MODELED</Tag> : null}</dt>
            <dd className="text-copy text-ink-2">{n.text}</dd>
          </div>
        ))}
      </dl>
    </Pane>
  )
}
