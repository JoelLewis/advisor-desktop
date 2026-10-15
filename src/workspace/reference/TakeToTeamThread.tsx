import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { cn } from '@/lib/utils'
import { useTakeToTeamThread } from '@/hooks/use-reference'
import type { ReferenceView, TakeResult } from '@/types/reference'
import { LINK_TARGET } from '@/kit/link-target'

/**
 * "Take to team thread": the row becomes a quoted card in the team thread about its subject, opened if there is none.
 * `inline` sets it as a quiet line under a table row's name, so the action costs the table no column.
 */
export function TakeToTeamThread({ view, rowId, rowLabel, inline = false }: { view: ReferenceView; rowId: string; rowLabel: string; inline?: boolean }) {
  const announce = useAnnounce()
  const take = useTakeToTeamThread()
  const [taken, setTaken] = useState<TakeResult>()
  if (taken) {
    return (
      <Link to={`/t/${encodeURIComponent(taken.threadId)}`} className={cn(LINK_TARGET, inline ? 'text-table-dense text-ink-3 hover:text-ink' : 'text-body', 'underline decoration-rule-2 underline-offset-4 hover:decoration-ink')}>
        {`In ${taken.threadTitle}`}
      </Link>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <Button rank={inline ? 'quiet' : 'secondary'} className={inline ? 'whitespace-normal text-left text-table-dense font-normal text-ink-3 not-disabled:not-aria-disabled:hover:text-ink' : undefined} aria-label={`Take ${rowLabel} to a team thread`} pending={take.isPending}
        onClick={() => take.mutate({ view, rowId }, { onSuccess: (result) => { setTaken(result); announce(`Taken to ${result.threadTitle}.`) } })}>
        Take to team thread
      </Button>
      {take.isError ? <span role="alert" className="text-body">{take.error.message}</span> : null}
    </span>
  )
}
