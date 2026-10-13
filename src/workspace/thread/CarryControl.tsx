import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useAccount } from '@/hooks/use-accounts'
import { useCarryFinding, useThreads } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Thread } from '@/types/workspace'
import { carryTargets } from './carry-targets'

/** "Take to …": the brief's owner sends a finding to a team thread about the same subject, or to its household's meeting thread. */
export function CarryControl({ thread, findingId }: { thread: Thread; findingId: string }) {
  const { viewerId } = useViewer()
  const threads = useThreads()
  const carry = useCarryFinding(thread.id)
  const [taken, setTaken] = useState<string>()
  const subject = thread.subject
  const account = useAccount(subject?.type === 'account' ? subject.id : '')
  const targets = carryTargets(threads.data ?? [], viewerId, subject, account.data?.householdId)
  // The team thread is offered at once; the household's meeting thread joins it once the account's household arrives.
  if (thread.ownerId !== viewerId || targets.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      {targets.map(({ thread: target, label }) => (
        <Button key={target.id} rank="secondary" disabled={carry.isPending}
          onClick={() => carry.mutate({ messageId: findingId, toThreadId: target.id }, { onSuccess: () => setTaken(target.title) })}>
          {label}
        </Button>
      ))}
      {taken ? <p role="status" className="text-body text-ink-2">{`Taken to ${taken}.`}</p> : null}
      {carry.isError ? <p role="alert" className="text-body">{carry.error.message}</p> : null}
    </div>
  )
}
