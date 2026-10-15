import { cn } from '@/lib/utils'
import { VISIBILITY_RULE, type Visibility } from './visibility'

type BandProps = { visibility: Visibility; words: string; scale?: 'thread' | 'message' }

/**
 * Who reads what sits under the band, in the words the caller gives it, with the visibility mark beside them as a
 * second cue. A client-visible band is filled, so the moment a client will read is the loudest thing on the page.
 */
export function VisibilityBand({ visibility, words, scale = 'thread' }: BandProps) {
  const shared = visibility === 'client'
  return (
    <div role="note" aria-label={`Visibility: ${words}`} data-visibility={visibility} data-scale={scale}
      className={cn('flex items-center gap-3', shared && 'bg-shared px-3', shared && (scale === 'thread' ? 'py-2' : 'py-1'))}>
      <div aria-hidden="true" className={cn('w-8 shrink-0', VISIBILITY_RULE[visibility])} />
      <span aria-hidden="true" className={cn(scale === 'thread' ? 'text-body' : 'text-label normal-case', shared ? 'font-semibold text-ink' : 'text-ink-2')}>{words}</span>
    </div>
  )
}
