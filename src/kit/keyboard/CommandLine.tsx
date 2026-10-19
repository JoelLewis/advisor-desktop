import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
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
  // Where the pointer last moved, or 'unplaced' once the keyboard has moved the selection. A list the keyboard scrolls
  // slides under a resting pointer and the browser reports a move where the pointer already was: after keyboard
  // navigation the first report only places the pointer, and only a move to somewhere else takes the selection.
  const pointer = useRef<{ x: number; y: number } | 'unplaced'>()
  const pointTo = (e: PointerEvent<HTMLLIElement>, i: number) => {
    const last = pointer.current
    pointer.current = { x: e.clientX, y: e.clientY }
    if (last === 'unplaced' || (last && last.x === e.clientX && last.y === e.clientY)) return
    setIndex(i)
  }
  const focusAfter = useFocusAfter()
  const listId = useId()
  const matches = matchDestinations(query, destinations)

  const activeId = matches[index] ? `${listId}-${matches[index].id}` : undefined
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  const close = () => { setQuery(''); setIndex(0); onOpenChange(false) }
  const go = (target: Destination) => {
    setReturnFocus(false)
    close()
    target.run()
    focusAfter()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') pointer.current = 'unplaced'
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
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIndex(0) }}
        onKeyDown={onKeyDown}
        className="w-full border border-ink bg-bg px-3 py-2 text-body text-ink"
      />
      {matches.length === 0 ? <p role="status" className="mt-2 px-3 py-2 text-body text-ink-3">No destination matches.</p> : null}
      <ul id={listId} role="listbox" aria-label="Destinations" className="mt-2 flex max-h-[min(24rem,50vh)] supports-[height:100dvh]:max-h-[min(24rem,50dvh)] flex-col overflow-y-auto">
        {matches.map((d, i) => (
          <li key={d.id} id={`${listId}-${d.id}`} role="option" aria-selected={i === index}
            onClick={() => go(d)} onPointerMove={(e) => pointTo(e, i)}
            className={cn('px-3 py-2 text-body', i === index && 'bg-band font-semibold')}>
            {d.label}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
