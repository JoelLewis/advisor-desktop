import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/kit/button/Button'
import { useTakeToTeamThread } from '@/hooks/use-reference'
import type { ReferenceView, TakeResult } from '@/types/reference'

/** "Take to team thread": the row becomes a quoted card in the team thread about its subject, opened if there is none. */
export function TakeToTeamThread({ view, rowId, rowLabel }: { view: ReferenceView; rowId: string; rowLabel: string }) {
  const take = useTakeToTeamThread()
  const [taken, setTaken] = useState<TakeResult>()
  if (taken) {
    return (
      <Link to={`/t/${encodeURIComponent(taken.threadId)}`} className="text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        {`In ${taken.threadTitle}`}
      </Link>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <Button rank="secondary" aria-label={`Take ${rowLabel} to a team thread`} disabled={take.isPending}
        onClick={() => take.mutate({ view, rowId }, { onSuccess: setTaken })}>
        Take to team thread
      </Button>
      {take.isError ? <span role="alert" className="text-body">{take.error.message}</span> : null}
    </span>
  )
}
