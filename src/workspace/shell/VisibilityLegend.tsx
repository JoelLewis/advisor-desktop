import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import type { Visibility } from '@/kit/visibility/visibility'

const LEGEND: readonly { visibility: Visibility; words: string }[] = [
  { visibility: 'private', words: 'Only you' },
  { visibility: 'internal', words: 'Firm only' },
  { visibility: 'client', words: 'Shared with the client or prospect' },
]

/** What the thread list's marks mean, said once at its top. */
export function VisibilityLegend() {
  return (
    <ul aria-label="Visibility" className="flex flex-col gap-1.5 border-b border-rule pb-3">
      {LEGEND.map(({ visibility, words }) => (
        <li key={visibility} className="grid grid-cols-[2rem_1fr] items-center gap-2 text-label text-ink-3">
          <VisibilityMark visibility={visibility} /><span>{words}</span>
        </li>
      ))}
    </ul>
  )
}

const EXTERNAL_WORDS = { client: 'Shared with you and your advisor', prospect: 'Shared with you and the firm' } as const

/** An outsider's one mark, explained for them: their conversation is shared with the firm. */
export function ExternalVisibilityLegend({ party }: { party: keyof typeof EXTERNAL_WORDS }) {
  return (
    <ul aria-label="Visibility" className="border-b border-rule pb-3">
      <li className="grid grid-cols-[2rem_1fr] items-center gap-2 text-label text-ink-3">
        <VisibilityMark visibility="client" /><span>{EXTERNAL_WORDS[party]}</span>
      </li>
    </ul>
  )
}
