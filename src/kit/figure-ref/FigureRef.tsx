import { useId } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'

export function FigureRef({ children, source, note }: { children: string; source: string; note?: number }) {
  const descId = useId()
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span data-figure role="group" aria-label={children} tabIndex={0} aria-describedby={descId}
            className="tabular underline decoration-ink-3 decoration-dotted underline-offset-4">
            {children}
            {note !== undefined ? <sup className="ml-0.5 text-label text-ink-3"><span className="sr-only">note </span>{note}</sup> : null}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="border border-ink bg-face px-2 py-1 text-label normal-case text-ink">{`Source: ${source}`}</Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <span id={descId} className="sr-only">{`Source: ${source}`}</span>
    </Tooltip.Provider>
  )
}
