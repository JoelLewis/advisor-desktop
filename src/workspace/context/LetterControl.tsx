import { useId, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useDraftLetter, useProposals } from '@/hooks/use-workspace'
import type { Thread } from '@/types/workspace'

/** Asks the Client Letter Agent for a letter from this client's approved proposal. */
export function LetterControl({ thread }: { thread: Thread }) {
  const reasonId = useId()
  const proposals = useProposals()
  const letter = useDraftLetter(thread.id)
  const [report, setReport] = useState<string>()
  if (proposals.isPending) return <p role="status" className="text-body text-ink-3">Loading the proposals…</p>
  if (proposals.isError) return <p role="alert" className="text-body">{proposals.error.message}</p>
  const approved = proposals.data.flatMap((p) => (p.clientId === thread.clientId && p.approval.kind === 'approved' ? [{ p, version: p.approval.version }] : []))
  if (approved.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button rank="secondary" disabled aria-describedby={reasonId}>Ask Client Letter Agent</Button>
        <span id={reasonId} className="text-label text-ink-3">Approve a proposal first.</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-start gap-2">
      {approved.map(({ p, version }) => (
        <div key={p.id} className="flex flex-col items-start gap-1">
          <Button rank="secondary" disabled={letter.isPending}
            onClick={() => letter.mutate(p.id, { onSuccess: () => setReport(`The Client Letter Agent drafted a letter from v${version} of the ${p.title}.`) })}>
            Ask Client Letter Agent
          </Button>
          <span className="text-label text-ink-3">{`From v${version} of the ${p.title}, approved`}</span>
        </div>
      ))}
      {letter.isError ? <p role="alert" className="text-body">{letter.error.message}</p> : null}
      {report ? <p role="status" className="text-body text-ink-2">{report}</p> : null}
    </div>
  )
}
