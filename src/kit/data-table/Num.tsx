import { splitFraction } from '@/kit/measure'

export function Num({ text }: { text: string }) {
  const { whole, fraction } = splitFraction(text)
  return (
    <span className="tabular whitespace-nowrap">
      {whole}
      {fraction ? <span data-fraction="true" className="text-ink-3">{fraction}</span> : null}
    </span>
  )
}
