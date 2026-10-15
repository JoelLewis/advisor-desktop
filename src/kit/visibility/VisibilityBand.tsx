import { cn } from '@/lib/utils'
import { VISIBILITY_RULE, visibilityWords, type Party, type Visibility } from './visibility'

type BandProps = { visibility: Visibility; scale?: 'thread' | 'message'; audience?: string; party?: Party }

export function VisibilityBand({ visibility, scale = 'thread', audience, party = 'client' }: BandProps) {
  const words = visibilityWords(visibility, party)
  return (
    <div role="note" aria-label={`Visibility: ${words}`} data-visibility={visibility} data-scale={scale}
      className={cn('flex flex-col', scale === 'thread' ? 'gap-1.5' : 'gap-1')}>
      <div aria-hidden className={VISIBILITY_RULE[visibility]} />
      <div className={cn('flex items-baseline justify-between gap-3', scale === 'message' && 'justify-start')}>
        <span aria-hidden="true" className={cn('text-label', visibility === 'client' ? 'font-bold text-ink' : 'text-ink-2')}>{words}</span>
        {audience ? <span className="text-label normal-case text-ink-2">{audience}</span> : null}
      </div>
    </div>
  )
}
