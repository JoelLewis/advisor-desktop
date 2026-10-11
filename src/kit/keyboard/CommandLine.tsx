import { useId, useState, type KeyboardEvent } from 'react'
import { Dialog } from '@/kit/dialog/Dialog'
import { cn } from '@/lib/utils'
import { matchDestinations, type Destination } from './keys'
import { useFocusAfter } from './use-focus-after'

type CommandLineProps = { open: boolean; onOpenChange: (open: boolean) => void; destinations: Destination[] }

export function CommandLine({ open, onOpenChange, destinations }: CommandLineProps) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [returnFocus, setReturnFocus] = useState(true)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setReturnFocus(true)
  }
  const focusAfter = useFocusAfter()
  const listId = useId()
  const matches = matchDestinations(query, destinations)

  const close = () => { setQuery(''); setIndex(0); onOpenChange(false) }
  const go = (target: Destination) => {
    setReturnFocus(false)
    close()
    target.run()
    focusAfter()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.max(0, Math.min(matches.length - 1, i + 1))) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const target = matches[index]
      if (target) go(target)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} title="Command line" returnFocus={returnFocus}>
      <input
        role="combobox"
        aria-label="Go to"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={matches[index] ? `${listId}-${matches[index].id}` : undefined}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIndex(0) }}
        onKeyDown={onKeyDown}
        className="w-full border border-ink bg-bg px-3 py-2 text-body text-ink"
      />
      {matches.length === 0 ? <p role="status" className="mt-2 px-3 py-2 text-body text-ink-3">No destination matches.</p> : null}
      <ul id={listId} role="listbox" aria-label="Destinations" className="mt-2 flex flex-col">
        {matches.map((d, i) => (
          <li key={d.id} id={`${listId}-${d.id}`} role="option" aria-selected={i === index}
            className={cn('px-3 py-2 text-body', i === index && 'bg-band font-semibold')}>
            {d.label}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
