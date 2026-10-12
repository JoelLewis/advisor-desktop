import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useCarryFinding, useThreads } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Thread } from '@/types/workspace'

/** "Take to team thread": the brief's owner sends a finding to the team thread about the same subject. */
export function CarryControl({ thread, findingId }: { thread: Thread; findingId: string }) {
  const { viewerId } = useViewer()
  const threads = useThreads()
  const carry = useCarryFinding(thread.id)
  const [taken, setTaken] = useState<string>()
  const target = (threads.data ?? []).find((t) => t.visibility === 'internal' && t.memberIds.includes(viewerId)
    && t.subject?.type === thread.subject?.type && t.subject?.id === thread.subject?.id)
  if (thread.ownerId !== viewerId || !target) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button rank="secondary" disabled={carry.isPending}
        onClick={() => carry.mutate({ messageId: findingId, toThreadId: target.id }, { onSuccess: () => setTaken(target.title) })}>
        Take to team thread
      </Button>
      {taken ? <p role="status" className="text-body text-ink-2">{`Taken to ${taken}.`}</p> : null}
      {carry.isError ? <p role="alert" className="text-body">{carry.error.message}</p> : null}
    </div>
  )
}
