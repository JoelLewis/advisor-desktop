import { useId, useState, type KeyboardEvent } from 'react'
import { Dialog } from '@/kit/dialog/Dialog'
import { cn } from '@/lib/utils'
import { matchDestinations, type Destination } from './keys'

type CommandLineProps = { open: boolean; onOpenChange: (open: boolean) => void; destinations: Destination[] }

export function CommandLine({ open, onOpenChange, destinations }: CommandLineProps) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listId = useId()
  const matches = matchDestinations(query, destinations)

  const close = () => { setQuery(''); setIndex(0); onOpenChange(false) }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(matches.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const target = matches[index]
      if (target) { close(); target.run() }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} title="Command line">
      <input
        role="combobox"
        aria-label="Go to"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={matches[index] ? `${listId}-${matches[index].id}` : undefined}
        autoFocus
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIndex(0) }}
        onKeyDown={onKeyDown}
        className="w-full border border-ink bg-bg px-3 py-2 text-body text-ink"
      />
      <ul id={listId} role="listbox" aria-label="Destinations" className="mt-2 flex flex-col">
        {matches.length === 0 ? <li className="px-3 py-2 text-body text-ink-3">No destination matches.</li> : null}
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
