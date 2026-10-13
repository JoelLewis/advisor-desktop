import { cn } from '@/lib/utils'
import { glyphFor, isSignal, type Status } from './status'

const GLYPH = {
  filled: 'size-2 bg-signal',
  outlined: 'size-2 border border-ink',
  hollow: 'size-2 rounded-full border border-ink-3',
} as const

export function StatusCode({ status, label }: { status: Status; label?: string }) {
  const signal = isSignal(status)
  return (
    <span
      data-status={status}
      data-signal={String(signal)}
      className={cn('relative inline-flex items-center gap-1.5 text-label uppercase', signal ? 'text-signal-ink' : 'text-ink')}
    >
      <span aria-hidden className={GLYPH[glyphFor(status)]} />
      <span>{status}</span>
      {/* The code is relative so this absolutely placed label stays inside a scrolling table rather than widening the page. */}
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}
