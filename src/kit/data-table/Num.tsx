import { cn } from '@/lib/utils'
import { isNegative, splitFraction } from '@/kit/measure'

export function Num({ text }: { text: string }) {
  const { whole, fraction } = splitFraction(text)
  return (
    <span className={cn('tabular whitespace-nowrap', isNegative(text) && 'font-semibold')}>
      {whole}
      {fraction ? <span data-fraction="true" className="text-ink-3">{fraction}</span> : null}
    </span>
  )
}
