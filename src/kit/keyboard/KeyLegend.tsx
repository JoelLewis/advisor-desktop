import { useContext } from 'react'
import { cn } from '@/lib/utils'
import { KeyboardContext } from './keyboard-context'
import { MODIFIER_WORD } from './single-keys'

/** The two global keys; every other key is in the `?` sheet. The caller places it (top bar, footer). */
export function KeyLegend({ className }: { className?: string }) {
  const ctx = useContext(KeyboardContext)
  const items = ctx?.singleKeys === false
    ? [{ key: `${MODIFIER_WORD} K`, label: 'command' }, { key: `${MODIFIER_WORD} /`, label: 'keys' }]
    : [{ key: '/', label: 'command' }, { key: '?', label: 'keys' }]
  return (
    <ul aria-label="Keys" className={cn('flex flex-wrap gap-x-4 gap-y-1 text-label text-ink-3', className)}>
      {items.map((b, i) => (
        <li key={`${i}-${b.key}-${b.label}`} className="inline-flex items-center gap-1.5">
          <kbd className="border border-ink-3 px-1">{b.key}</kbd>
          <span className="normal-case">{b.label}</span>
        </li>
      ))}
    </ul>
  )
}
